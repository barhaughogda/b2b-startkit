'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMutation } from 'convex/react';
// Use relative import for Convex generated files (they're at root level, not in src/)
import { api } from '../../../../convex/_generated/api';
import { Id } from '../../../../convex/_generated/dataModel';
import { Save, Loader2, Plus, Trash2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AllergiesFormProps {
  patientId: Id<'patients'>;
  initialData?: {
    medications?: Array<{
      substance: string;
      reactionType: string;
      severity: string;
      symptoms: string;
      dateIdentified?: string;
    }>;
    foods?: Array<{
      food: string;
      reactionType: string;
      severity: string;
      symptoms: string;
    }>;
    environmental?: Array<{
      allergen: string;
      reactionType: string;
      severity: string;
      symptoms: string;
    }>;
    other?: Array<{
      substance: string;
      reactionType: string;
      severity: string;
      symptoms: string;
    }>;
  };
}

export function AllergiesForm({ patientId, initialData }: AllergiesFormProps) {
  const { data: session } = useSession();
  const addAllergy = useMutation((api as any).patientProfile?.addAllergy);
  const removeAllergy = useMutation((api as any).patientProfile?.removeAllergy);
  const [isSaving, setIsSaving] = useState(false);

  const [allergies, setAllergies] = useState({
    medications: initialData?.medications || [],
    foods: initialData?.foods || [],
    environmental: initialData?.environmental || [],
    other: initialData?.other || [],
  });

  useEffect(() => {
    if (initialData) {
      setAllergies({
        medications: initialData.medications || [],
        foods: initialData.foods || [],
        environmental: initialData.environmental || [],
        other: initialData.other || [],
      });
    }
  }, [initialData]);

  const addAllergyItem = async (category: 'medications' | 'foods' | 'environmental' | 'other') => {
    const newAllergy = {
      substance: category === 'foods' ? '' : '',
      food: category === 'foods' ? '' : '',
      allergen: category === 'environmental' ? '' : '',
      reactionType: '',
      severity: 'mild',
      symptoms: '',
      dateIdentified: category === 'medications' ? '' : undefined,
    };

    try {
      if (category === 'medications') {
        await addAllergy({
          patientId,
          category: 'medications',
          allergy: {
            substance: newAllergy.substance,
            reactionType: newAllergy.reactionType,
            severity: newAllergy.severity,
            symptoms: newAllergy.symptoms,
            dateIdentified: newAllergy.dateIdentified,
          },
          userEmail: session?.user?.email,
        });
      } else if (category === 'foods') {
        await addAllergy({
          patientId,
          category: 'foods',
          allergy: {
            substance: newAllergy.food,
            reactionType: newAllergy.reactionType,
            severity: newAllergy.severity,
            symptoms: newAllergy.symptoms,
          },
          userEmail: session?.user?.email,
        });
      } else if (category === 'environmental') {
        await addAllergy({
          patientId,
          category: 'environmental',
          allergy: {
            substance: newAllergy.allergen,
            reactionType: newAllergy.reactionType,
            severity: newAllergy.severity,
            symptoms: newAllergy.symptoms,
          },
          userEmail: session?.user?.email,
        });
      } else {
        await addAllergy({
          patientId,
          category: 'other',
          allergy: {
            substance: newAllergy.substance,
            reactionType: newAllergy.reactionType,
            severity: newAllergy.severity,
            symptoms: newAllergy.symptoms,
          },
          userEmail: session?.user?.email,
        });
      }

      // Refresh allergies from server
      toast.success('Allergy added', {
        description: 'The allergy has been added to your profile.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to add allergy.',
      });
    }
  };

  const removeAllergyItem = async (category: string, index: number) => {
    try {
      await removeAllergy({
        patientId,
        category,
        index,
        userEmail: session?.user?.email,
      });
      toast.success('Allergy removed', {
        description: 'The allergy has been removed from your profile.',
      });
    } catch (error) {
      toast.error('Error', {
        description: error instanceof Error ? error.message : 'Failed to remove allergy.',
      });
    }
  };

  const renderAllergyList = (
    category: 'medications' | 'foods' | 'environmental' | 'other',
    title: string
  ) => {
    const items = allergies[category];
    const getSeverityColor = (severity: string) => {
      if (severity === 'life-threatening') return 'text-status-error';
      if (severity === 'severe') return 'text-status-warning';
      return 'text-text-primary';
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold text-text-primary">{title}</h4>
          <Button type="button" variant="outline" size="sm" onClick={() => addAllergyItem(category)}>
            <Plus className="h-4 w-4 mr-2" />
            Add {title.slice(0, -1)}
          </Button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-text-tertiary">No {title.toLowerCase()} recorded</p>
        ) : (
          items.map((item: any, index: number) => (
            <div
              key={index}
              className={`p-4 border rounded-lg space-y-2 ${
                item.severity === 'life-threatening'
                  ? 'border-status-error bg-status-error-bg'
                  : 'border-border-primary'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {item.substance || item.food || item.allergen}
                    </span>
                    {item.severity === 'life-threatening' && (
                      <AlertTriangle className="h-4 w-4 text-status-error" />
                    )}
                    <span className={`text-xs ${getSeverityColor(item.severity)}`}>
                      {item.severity}
                    </span>
                  </div>
                  <p className="text-sm text-text-secondary mt-1">
                    <strong>Reaction:</strong> {item.reactionType}
                  </p>
                  <p className="text-sm text-text-secondary">
                    <strong>Symptoms:</strong> {item.symptoms}
                  </p>
                  {item.dateIdentified && (
                    <p className="text-sm text-text-tertiary mt-1">
                      Identified: {item.dateIdentified}
                    </p>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeAllergyItem(category, index)}
                  className="text-status-error hover:text-status-error"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-status-warning-bg border border-status-warning border-opacity-30 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-5 w-5 text-status-warning mt-0.5" />
          <div>
            <p className="text-sm font-medium text-status-warning">
              Important: Please list all allergies accurately
            </p>
            <p className="text-sm text-text-secondary mt-1">
              This information is critical for your safety. Include all known allergies, even if they seem minor.
            </p>
          </div>
        </div>
      </div>

      {renderAllergyList('medications', 'Medication Allergies')}
      {renderAllergyList('foods', 'Food Allergies')}
      {renderAllergyList('environmental', 'Environmental Allergies')}
      {renderAllergyList('other', 'Other Allergies')}
    </div>
  );
}

