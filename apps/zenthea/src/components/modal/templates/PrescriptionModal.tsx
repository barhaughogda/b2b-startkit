import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2 } from 'lucide-react';

interface PrescriptionModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
}

export const PrescriptionModal: React.FC<PrescriptionModalProps> = ({
  patientName,
  providerName,
  onClose
}) => {
  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Prescription</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{patientName}</Badge>
            <Badge variant="outline">{providerName}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Medications</h3>
            <Button size="sm" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Medication
            </Button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
              <div className="space-y-2">
                <Label htmlFor="medication">Medication</Label>
                <Input id="medication" placeholder="Enter medication name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dosage">Dosage</Label>
                <Input id="dosage" placeholder="e.g., 10mg" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Input id="frequency" placeholder="e.g., 2x daily" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input id="quantity" placeholder="e.g., 30 tablets" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="refills">Refills</Label>
                <Input id="refills" placeholder="e.g., 2" />
              </div>
              <div className="flex items-end">
                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button>Save Prescription</Button>
        </div>
      </CardContent>
    </Card>
  );
};