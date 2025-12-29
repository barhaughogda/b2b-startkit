// Mock appointment data for testing
export const generateMockAppointment = (
  tenantId: string = 'demo-tenant-123',
  patientId: string = 'patient-123',
  providerId: string = 'provider-123'
) => ({
  _id: `apt-${Math.random().toString(36).substr(2, 9)}`,
  tenantId,
  patientId,
  providerId,
  appointmentDate: '2024-02-20',
  appointmentTime: '2:00 PM',
  durationMinutes: 30,
  type: 'consultation',
  status: 'scheduled',
  location: 'Main Office',
  notes: 'Annual checkup',
  reason: 'Annual physical examination',
  isTelehealth: false,
  createdAt: Date.now(),
  updatedAt: Date.now()
});

export const mockAppointments = [
  {
    id: 'apt-789',
    date: '2024-02-15',
    time: '10:00 AM',
    provider: {
      id: 'provider-123',
      name: 'Dr. Sarah Johnson',
      specialty: 'Internal Medicine'
    },
    type: 'Follow-up',
    status: 'confirmed',
    location: 'Main Office',
    notes: 'Annual checkup'
  },
  {
    id: 'apt-790',
    date: '2024-02-20',
    time: '2:00 PM',
    provider: {
      id: 'provider-124',
      name: 'Dr. Michael Chen',
      specialty: 'Cardiology'
    },
    type: 'Consultation',
    status: 'scheduled',
    location: 'Cardiology Wing',
    notes: 'Heart health assessment'
  }
];

export const mockAppointmentBooking = {
  providerId: 'provider-123',
  date: '2024-02-20',
  time: '2:00 PM',
  type: 'Consultation',
  reason: 'Annual physical examination',
  preferredLocation: 'Main Office'
};

export const mockAppointmentResponse = {
  success: true,
  appointment: {
    id: 'apt-790',
    date: '2024-02-20',
    time: '2:00 PM',
    status: 'pending_confirmation',
    confirmationCode: 'APT-2024-020'
  }
};
