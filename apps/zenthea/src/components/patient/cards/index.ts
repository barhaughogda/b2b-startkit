// Patient Card System - DEPRECATED
// Use CardSystemProvider from '@/components/cards/CardSystemProvider' instead
// Use AppointmentCard from '@/components/cards/AppointmentCard' instead

// Re-export from main card system for backwards compatibility
export { CardSystemProvider as PatientCardSystemProvider, useCardSystem as usePatientCardSystem } from '@/components/cards/CardSystemProvider';
export { AppointmentCard as PatientAppointmentCard } from '@/components/cards/AppointmentCard';
