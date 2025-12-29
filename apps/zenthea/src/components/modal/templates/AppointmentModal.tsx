/**
 * @deprecated DEPRECATED - DO NOT USE
 * 
 * This modal template is deprecated. All appointment functionality should use
 * the unified card system instead:
 * 
 * For All Portals (Patient and Provider/Company):
 * - Use CardSystemProvider and openCard('appointment', {...props, mode: 'create'|'view' }, baseProps)
 * - The AppointmentCard provides create/view/edit/reschedule/cancel functionality in the Info tab
 * 
 * @see CardSystemProvider
 * @see AppointmentCard
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, User, MapPin, Phone, AlertCircle, CheckCircle } from 'lucide-react';

interface AppointmentModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
  onSave?: (data: AppointmentData) => Promise<void>;
}

interface AppointmentData {
  date: string;
  time: string;
  duration: string;
  type: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  reminder: string;
}

interface ErrorState {
  message: string;
  field?: string;
}

/**
 * @deprecated Use AppointmentCard or PatientAppointmentCard instead
 */
export const AppointmentModal: React.FC<AppointmentModalProps> = ({
  patientName,
  providerName,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<AppointmentData>({
    date: '',
    time: '',
    duration: '',
    type: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
    reminder: ''
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

  const handleInputChange = (field: keyof AppointmentData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (error && error.field === field) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    if (!formData.date.trim()) {
      setError({ message: 'Date is required', field: 'date' });
      return false;
    }
    if (!formData.time.trim()) {
      setError({ message: 'Time is required', field: 'time' });
      return false;
    }
    if (!formData.type.trim()) {
      setError({ message: 'Appointment type is required', field: 'type' });
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
        message: err instanceof Error ? err.message : 'Failed to save appointment'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold leading-none tracking-tight">Appointment</h2>
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
              Appointment saved successfully!
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} role="form">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date
                </Label>
                <Input 
                  id="date" 
                  type="date" 
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="time" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time
                </Label>
                <Input 
                  id="time" 
                  type="time" 
                  value={formData.time}
                  onChange={(e) => handleInputChange('time', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Duration
                </Label>
                <Input 
                  id="duration" 
                  placeholder="30 minutes" 
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Type</Label>
                <Input 
                  id="type" 
                  placeholder="Follow-up" 
                  value={formData.type}
                  onChange={(e) => handleInputChange('type', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Patient Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patient-name" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Patient Name
                </Label>
                <Input id="patient-name" value={patientName} readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </Label>
                <Input 
                  id="phone" 
                  placeholder="(555) 123-4567" 
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="patient@example.com" 
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </Label>
                <Input 
                  id="address" 
                  placeholder="123 Main St, City, State" 
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Appointment Notes</h3>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                placeholder="Enter appointment notes, special instructions, or preparation requirements..."
                className="min-h-[120px]"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Status & Reminders</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Input id="status" value="Scheduled" readOnly />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reminder">Reminder</Label>
                <Input 
                  id="reminder" 
                  placeholder="24 hours before" 
                  value={formData.reminder}
                  onChange={(e) => handleInputChange('reminder', e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Appointment'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};