import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Pill, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';

interface Prescription {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  prescriber?: string;
  startDate?: string;
  status?: string;
}

interface DashboardPrescriptionsWidgetProps {
  prescriptions: Prescription[];
  isLoading?: boolean;
  onPrescriptionClick?: (prescription: Prescription) => void;
  selectedPrescriptionId?: string | null;
}

export function DashboardPrescriptionsWidget({ 
  prescriptions, 
  isLoading = false,
  onPrescriptionClick,
  selectedPrescriptionId 
}: DashboardPrescriptionsWidgetProps) {
  const router = useRouter();
  const recent = prescriptions.slice(0, 2); // Show max 2

  const handleClick = (prescription: Prescription) => {
    if (onPrescriptionClick) {
      onPrescriptionClick(prescription);
    } else {
      router.push('/patient/records?tab=medications');
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <Pill className="h-5 w-5 text-primary" />
          Prescriptions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : recent.length > 0 ? (
          recent.map((prescription) => {
            const isSelected = selectedPrescriptionId === prescription.id;
            return (
            <div 
              key={prescription.id} 
              onClick={() => handleClick(prescription)}
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer ${
                isSelected 
                  ? 'border-interactive-primary bg-interactive-primary/10 hover:bg-interactive-primary/15' 
                  : 'border-border-primary/50 bg-surface-elevated/30 hover:bg-surface-elevated'
              }`}
            >
              <div className="space-y-1 flex-1 min-w-0">
                <p className="font-medium text-sm text-text-primary truncate">{prescription.name}</p>
                <div className="flex items-center text-xs text-text-secondary gap-2 flex-wrap">
                  <span>{prescription.dosage}</span>
                  {prescription.frequency && (
                    <>
                      <span>•</span>
                      <span>{prescription.frequency}</span>
                    </>
                  )}
                </div>
                {prescription.prescriber && (
                  <p className="text-xs text-text-tertiary truncate">{prescription.prescriber}</p>
                )}
              </div>
              {prescription.status && (
                <Badge variant="secondary" className="text-xs capitalize ml-2">
                  {prescription.status}
                </Badge>
              )}
            </div>
            );
          })
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-text-tertiary mb-2">No active prescriptions</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/patient/records?tab=medications')}
              className="mt-2"
            >
              View all medications
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

