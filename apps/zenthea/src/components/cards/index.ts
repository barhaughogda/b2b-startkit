// Core types and interfaces
export * from './types';

// Base card component
export { BaseCardComponent } from './BaseCard';

// Card templates
export { AppointmentCard, createAppointmentCard } from './AppointmentCard';
export { LabResultCard } from './LabResultCard';
export type { LabResultData } from './LabResultCard';
// TODO: Export other card templates as they are created
// export { MessageCard } from './MessageCard';
// export { VitalSignsCard } from './VitalSignsCard';
// export { SOAPNoteCard } from './SOAPNoteCard';
// export { PrescriptionCard } from './PrescriptionCard';
export { ProcedureCard } from './ProcedureCard';
export type { ProcedureCardProps } from './ProcedureCard';
// export { DiagnosisCard } from './DiagnosisCard';

// Template registry
export {
  getCardTemplate,
  getAllCardTemplates,
  registerCardTemplate,
  validateCardProps,
  createCardFromTemplate,
  useCardTemplate
} from './TemplateRegistry';
