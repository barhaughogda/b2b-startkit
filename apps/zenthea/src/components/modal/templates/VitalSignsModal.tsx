import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Circle, Square, Activity, AlertCircle, CheckCircle } from 'lucide-react';

interface VitalSignsModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
  onSave?: (data: VitalSignsData) => Promise<void>;
}

interface VitalSignsData {
  bloodPressure: string;
  heartRate: string;
  temperature: string;
  weight: string;
  height: string;
  oxygenSaturation: string;
}

interface ErrorState {
  message: string;
  field?: string;
}

export const VitalSignsModal: React.FC<VitalSignsModalProps> = ({
  patientName,
  providerName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<VitalSignsData>({
    bloodPressure: '',
    heartRate: '',
    temperature: '',
    weight: '',
    height: '',
    oxygenSaturation: ''
  });
  
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInputChange = (field: keyof VitalSignsData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error && error.field === field) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    // Basic validation - at least one vital sign should be entered
    const hasAnyData = Object.values(formData).some(value => value.trim() !== '');
    if (!hasAnyData) {
      setError({ message: 'Please enter at least one vital sign' });
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    
    if (!onSave) {
      console.warn('No onSave handler provided');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await onSave(formData);
      setSuccess(true);
      // Auto-close after success
      setTimeout(() => {
        onClose?.();
      }, 1500);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to save vital signs'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Vital Signs</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="variant-outline">{patientName}</Badge>
            <Badge variant="outline" className="variant-outline">{providerName}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Alert */}
        {error && (
          <Alert className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert className="border-green-200 bg-green-50 text-green-800">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Vital signs saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} role="form">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Quick Entry</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="blood-pressure" className="flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Blood Pressure
                </Label>
                <Input 
                  id="blood-pressure" 
                  value={formData.bloodPressure}
                  onChange={(e) => handleInputChange('bloodPressure', e.target.value)}
                  placeholder="120/80 mmHg" 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heart-rate" className="flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Heart Rate
                </Label>
                <Input 
                  id="heart-rate" 
                  value={formData.heartRate}
                  onChange={(e) => handleInputChange('heartRate', e.target.value)}
                  placeholder="72 bpm" 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="temperature" className="flex items-center gap-2">
                  <Circle className="h-4 w-4" />
                  Temperature
                </Label>
                <Input 
                  id="temperature" 
                  value={formData.temperature}
                  onChange={(e) => handleInputChange('temperature', e.target.value)}
                  placeholder="98.6°F" 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="weight" className="flex items-center gap-2">
                  <Square className="h-4 w-4" />
                  Weight
                </Label>
                <Input 
                  id="weight" 
                  value={formData.weight}
                  onChange={(e) => handleInputChange('weight', e.target.value)}
                  placeholder="150 lbs" 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="height">Height</Label>
                <Input 
                  id="height" 
                  value={formData.height}
                  onChange={(e) => handleInputChange('height', e.target.value)}
                  placeholder="5'8 inches" 
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="oxygen-sat">Oxygen Saturation</Label>
                <Input 
                  id="oxygen-sat" 
                  value={formData.oxygenSaturation}
                  onChange={(e) => handleInputChange('oxygenSaturation', e.target.value)}
                  placeholder="98%" 
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Readings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Blood Pressure</span>
                  <Badge variant="outline">Normal</Badge>
                </div>
                <div className="text-2xl font-bold">120/80</div>
                <div className="text-sm text-gray-500">2 hours ago</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Heart Rate</span>
                  <Badge variant="outline">Normal</Badge>
                </div>
                <div className="text-2xl font-bold">72 bpm</div>
                <div className="text-sm text-gray-500">2 hours ago</div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Vitals'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};