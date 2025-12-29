import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, CheckCircle } from 'lucide-react';
// import { useFocusTrap } from '@/hooks/useFocusTrap';

interface SOAPNoteModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
  onSave?: (data: SOAPNoteData) => Promise<void>;
}

interface SOAPNoteData {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

interface ErrorState {
  message: string;
  field?: string;
}

export const SOAPNoteModal: React.FC<SOAPNoteModalProps> = ({
  patientName,
  providerName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<SOAPNoteData>({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  
  const [error, setError] = useState<ErrorState | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Focus trap for accessibility - temporarily disabled
  // const { containerRef, cleanup } = useFocusTrap({
  //   enabled: false,
  //   initialFocus: false,
  //   returnFocus: true
  // });

  // Handle keyboard events for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && onClose) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      // cleanup(); // Restore focus when modal closes
    };
  }, [onClose]);

  const handleInputChange = (field: keyof SOAPNoteData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error && error.field === field) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.subjective.trim()) {
      setError({ message: 'Subjective section is required', field: 'subjective' });
      return false;
    }
    if (!formData.objective.trim()) {
      setError({ message: 'Objective section is required', field: 'objective' });
      return false;
    }
    if (!formData.assessment.trim()) {
      setError({ message: 'Assessment section is required', field: 'assessment' });
      return false;
    }
    if (!formData.plan.trim()) {
      setError({ message: 'Plan section is required', field: 'plan' });
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
        message: err instanceof Error ? err.message : 'Failed to save SOAP note'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      role="dialog" 
      aria-modal="true"
      aria-labelledby="soap-note-title"
      aria-describedby="soap-note-description"
      className="w-full max-w-4xl mx-auto"
    >
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 id="soap-note-title" className="text-2xl font-semibold leading-none tracking-tight">SOAP Note</h2>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="variant-outline">{patientName}</Badge>
              <Badge variant="outline" className="variant-outline">{providerName}</Badge>
            </div>
          </div>
          <p id="soap-note-description" className="text-sm text-muted-foreground">
            Document patient assessment using the SOAP (Subjective, Objective, Assessment, Plan) format
          </p>
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
              SOAP note saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} role="form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="subjective">Subjective</Label>
              <Textarea
                id="subjective"
                value={formData.subjective}
                onChange={(e) => handleInputChange('subjective', e.target.value)}
                placeholder="Patient's chief complaint and history..."
                className={`min-h-[120px] ${error?.field === 'subjective' ? 'border-red-500' : ''}`}
                disabled={isLoading}
                aria-label="Subjective"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objective">Objective</Label>
              <Textarea
                id="objective"
                value={formData.objective}
                onChange={(e) => handleInputChange('objective', e.target.value)}
                placeholder="Physical examination findings, vital signs..."
                className={`min-h-[120px] ${error?.field === 'objective' ? 'border-red-500' : ''}`}
                disabled={isLoading}
                aria-label="Objective"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="assessment">Assessment</Label>
              <Textarea
                id="assessment"
                value={formData.assessment}
                onChange={(e) => handleInputChange('assessment', e.target.value)}
                placeholder="Clinical impression, diagnosis..."
                className={`min-h-[120px] ${error?.field === 'assessment' ? 'border-red-500' : ''}`}
                disabled={isLoading}
                aria-label="Assessment"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan">Plan</Label>
              <Textarea
                id="plan"
                value={formData.plan}
                onChange={(e) => handleInputChange('plan', e.target.value)}
                placeholder="Treatment plan, follow-up instructions..."
                className={`min-h-[120px] ${error?.field === 'plan' ? 'border-red-500' : ''}`}
                disabled={isLoading}
                aria-label="Plan"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Note'}
            </Button>
          </div>
        </form>
      </CardContent>
      </Card>
    </div>
  );
};