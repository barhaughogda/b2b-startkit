'use client';

import React, { useState, useEffect } from 'react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface LifestyleFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    smokingStatus?: string;
    smokingHistory?: {
      packsPerDay?: number;
      yearsSmoked?: number;
      quitDate?: string;
    };
    alcoholUse?: string;
    alcoholDetails?: string;
    exerciseFrequency?: string;
    exerciseTypes?: string[];
    dietaryPatterns?: string[];
    occupationalExposures?: string;
  };
}

export function LifestyleForm({ patientId, initialData }: LifestyleFormProps) {
  const { data: session } = useZentheaSession();
  const updateProfile = useMutation((api as any).patientProfile?.updatePatientProfile);
  const [isSaving, setIsSaving] = useState(false);

  const [lifestyle, setLifestyle] = useState({
    smokingStatus: initialData?.smokingStatus || 'never',
    smokingHistory: initialData?.smokingHistory || {
      packsPerDay: undefined,
      yearsSmoked: undefined,
      quitDate: '',
    },
    alcoholUse: initialData?.alcoholUse || 'none',
    alcoholDetails: initialData?.alcoholDetails || '',
    exerciseFrequency: initialData?.exerciseFrequency || '',
    exerciseTypes: initialData?.exerciseTypes || [],
    dietaryPatterns: initialData?.dietaryPatterns || [],
    occupationalExposures: initialData?.occupationalExposures || '',
  });

  useEffect(() => {
    if (initialData) {
      setLifestyle({
        smokingStatus: initialData.smokingStatus || 'never',
        smokingHistory: initialData.smokingHistory || {
          packsPerDay: undefined,
          yearsSmoked: undefined,
          quitDate: '',
        },
        alcoholUse: initialData.alcoholUse || 'none',
        alcoholDetails: initialData.alcoholDetails || '',
        exerciseFrequency: initialData.exerciseFrequency || '',
        exerciseTypes: initialData.exerciseTypes || [],
        dietaryPatterns: initialData.dietaryPatterns || [],
        occupationalExposures: initialData.occupationalExposures || '',
      });
    }
  }, [initialData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        patientId,
        section: 'lifestyle',
        data: lifestyle,
        userEmail: session?.user?.email,
      });
      toast.success('Lifestyle information updated', {
        description: 'Your lifestyle information has been saved.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to save lifestyle information.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Smoking Status */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Smoking Status</h4>
        <div className="space-y-2">
          <Label htmlFor="smokingStatus">Do you smoke?</Label>
          <select
            id="smokingStatus"
            value={lifestyle.smokingStatus}
            onChange={(e) => setLifestyle({ ...lifestyle, smokingStatus: e.target.value })}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm"
          >
            <option value="never">Never</option>
            <option value="former">Former Smoker</option>
            <option value="current">Current Smoker</option>
          </select>
        </div>

        {lifestyle.smokingStatus === 'former' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="packsPerDay">Packs per Day</Label>
              <Input
                id="packsPerDay"
                type="number"
                value={lifestyle.smokingHistory.packsPerDay || ''}
                onChange={(e) =>
                  setLifestyle({
                    ...lifestyle,
                    smokingHistory: {
                      ...lifestyle.smokingHistory,
                      packsPerDay: e.target.value ? parseFloat(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="e.g., 1.5"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="yearsSmoked">Years Smoked</Label>
              <Input
                id="yearsSmoked"
                type="number"
                value={lifestyle.smokingHistory.yearsSmoked || ''}
                onChange={(e) =>
                  setLifestyle({
                    ...lifestyle,
                    smokingHistory: {
                      ...lifestyle.smokingHistory,
                      yearsSmoked: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  })
                }
                placeholder="e.g., 10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="quitDate">Quit Date</Label>
              <Input
                id="quitDate"
                type="date"
                value={lifestyle.smokingHistory.quitDate || ''}
                onChange={(e) =>
                  setLifestyle({
                    ...lifestyle,
                    smokingHistory: {
                      ...lifestyle.smokingHistory,
                      quitDate: e.target.value,
                    },
                  })
                }
              />
            </div>
          </div>
        )}
      </div>

      {/* Alcohol Use */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Alcohol Use</h4>
        <div className="space-y-2">
          <Label htmlFor="alcoholUse">Alcohol Consumption</Label>
          <select
            id="alcoholUse"
            value={lifestyle.alcoholUse}
            onChange={(e) => setLifestyle({ ...lifestyle, alcoholUse: e.target.value })}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm"
          >
            <option value="none">None</option>
            <option value="occasional">Occasional</option>
            <option value="moderate">Moderate</option>
            <option value="heavy">Heavy</option>
          </select>
        </div>
        {lifestyle.alcoholUse !== 'none' && (
          <div className="space-y-2">
            <Label htmlFor="alcoholDetails">Details</Label>
            <Input
              id="alcoholDetails"
              value={lifestyle.alcoholDetails}
              onChange={(e) => setLifestyle({ ...lifestyle, alcoholDetails: e.target.value })}
              placeholder="e.g., 1-2 drinks per week"
            />
          </div>
        )}
      </div>

      {/* Exercise */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Exercise</h4>
        <div className="space-y-2">
          <Label htmlFor="exerciseFrequency">Exercise Frequency</Label>
          <select
            id="exerciseFrequency"
            value={lifestyle.exerciseFrequency}
            onChange={(e) => setLifestyle({ ...lifestyle, exerciseFrequency: e.target.value })}
            className="flex h-10 w-full rounded-md border border-border-primary bg-background px-3 py-2 text-sm"
          >
            <option value="">Select...</option>
            <option value="daily">Daily</option>
            <option value="several-times-week">Several times per week</option>
            <option value="weekly">Weekly</option>
            <option value="occasionally">Occasionally</option>
            <option value="rarely">Rarely</option>
            <option value="never">Never</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="exerciseTypes">Types of Exercise</Label>
          <Input
            id="exerciseTypes"
            value={lifestyle.exerciseTypes.join(', ')}
            onChange={(e) =>
              setLifestyle({
                ...lifestyle,
                exerciseTypes: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="e.g., Running, Swimming, Weight Training"
          />
        </div>
      </div>

      {/* Diet */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Dietary Patterns</h4>
        <div className="space-y-2">
          <Label htmlFor="dietaryPatterns">Dietary Preferences</Label>
          <Input
            id="dietaryPatterns"
            value={lifestyle.dietaryPatterns.join(', ')}
            onChange={(e) =>
              setLifestyle({
                ...lifestyle,
                dietaryPatterns: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
              })
            }
            placeholder="e.g., Vegetarian, Vegan, Kosher, Halal"
          />
        </div>
      </div>

      {/* Occupational Exposures */}
      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-text-primary">Occupational Exposures</h4>
        <div className="space-y-2">
          <Label htmlFor="occupationalExposures">Exposures</Label>
          <Input
            id="occupationalExposures"
            value={lifestyle.occupationalExposures}
            onChange={(e) => setLifestyle({ ...lifestyle, occupationalExposures: e.target.value })}
            placeholder="e.g., Chemicals, Dust, Radiation"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="bg-zenthea-teal hover:bg-zenthea-teal-600"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

