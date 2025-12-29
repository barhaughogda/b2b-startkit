'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateInput } from '@/components/ui/date-input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Video,
  CheckCircle,
  AlertCircle,
  Plus,
  X
} from 'lucide-react';
import { LocationSelector } from '@/components/provider/LocationSelector';
import { Id } from '@/convex/_generated/dataModel';

interface AppointmentFormProps {
  onSubmit: (data: any) => void;
  onCancel: () => void;
  initialData?: any;
  providerId?: Id<'providers'>; // Optional: filter locations by provider
  tenantId?: string; // Optional: override tenant ID
}

export function AppointmentForm({ onSubmit, onCancel, initialData, providerId, tenantId }: AppointmentFormProps) {
  const [formData, setFormData] = useState({
    patientName: '',
    providerName: '',
    date: '',
    time: '',
    duration: 30,
    type: 'consultation',
    locationId: '', // Changed from 'location' to 'locationId' to match Convex schema
    location: '', // Keep for backward compatibility
    isTelehealth: false,
    telehealthLink: '',
    notes: '',
    ...initialData
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  const appointmentTypes = [
    { value: 'consultation', label: 'Consultation', icon: User },
    { value: 'follow-up', label: 'Follow-up', icon: CheckCircle },
    { value: 'procedure', label: 'Procedure', icon: AlertCircle },
    { value: 'telehealth', label: 'Telehealth', icon: Video },
    { value: 'emergency', label: 'Emergency', icon: AlertCircle }
  ];

  const durationOptions = [
    { value: 15, label: '15 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45 minutes' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' },
    { value: 120, label: '2 hours' }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Patient & Provider */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="patientName">Patient Name</Label>
          <Input
            id="patientName"
            value={formData.patientName}
            onChange={(e) => updateField('patientName', e.target.value)}
            placeholder="Enter patient name"
            required
          />
        </div>
        <div>
          <Label htmlFor="providerName">Provider Name</Label>
          <Input
            id="providerName"
            value={formData.providerName}
            onChange={(e) => updateField('providerName', e.target.value)}
            placeholder="Enter provider name"
            required
          />
        </div>
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="date">Date</Label>
          <DateInput
            id="date"
            value={formData.date}
            onChange={(value) => updateField('date', value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="time">Time</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => updateField('time', e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="duration">Duration</Label>
          <Select value={formData.duration.toString()} onValueChange={(value) => updateField('duration', parseInt(value))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {durationOptions.map(option => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Appointment Type */}
      <div>
        <Label>Appointment Type</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {appointmentTypes.map(type => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                type="button"
                variant={formData.type === type.value ? 'default' : 'outline'}
                className="justify-start"
                onClick={() => updateField('type', type.value)}
              >
                <Icon className="h-4 w-4 mr-2" />
                {type.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Location or Telehealth */}
      <div>
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isTelehealth"
              checked={formData.isTelehealth}
              onChange={(e) => updateField('isTelehealth', e.target.checked)}
              className="h-4 w-4 bg-surface-elevated text-interactive-primary border-border-primary rounded focus:ring-border-focus"
            />
            <Label htmlFor="isTelehealth">Telehealth Appointment</Label>
          </div>
          {formData.isTelehealth && (
            <div className="flex items-center gap-2 text-blue-600">
              <Video className="h-4 w-4" />
              <span className="text-sm">Video Call</span>
            </div>
          )}
        </div>

        {formData.isTelehealth ? (
          <div>
            <Label htmlFor="telehealthLink">Telehealth Link</Label>
            <Input
              id="telehealthLink"
              value={formData.telehealthLink}
              onChange={(e) => updateField('telehealthLink', e.target.value)}
              placeholder="https://meet.example.com/room-id"
            />
          </div>
        ) : (
          <LocationSelector
            value={formData.locationId || formData.location}
            onValueChange={(locationId) => {
              updateField('locationId', locationId);
              // Also update location for backward compatibility
              updateField('location', locationId);
            }}
            providerId={providerId}
            tenantId={tenantId}
            label="Location"
            placeholder="Select a location"
            showTelehealth={false} // Don't show telehealth in location selector when telehealth checkbox is separate
          />
        )}
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField('notes', e.target.value)}
          placeholder="Appointment notes, preparation instructions, special requirements..."
          rows={3}
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Create Appointment
        </Button>
      </div>
    </form>
  );
}
