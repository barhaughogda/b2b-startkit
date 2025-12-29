import { 
  Calendar, 
  MessageSquare, 
  TestTube, 
  Activity, 
  FileText, 
  Pill, 
  Stethoscope, 
  AlertCircle 
} from 'lucide-react';

// Card type configuration for icons and colors using CSS variables
export const cardTypeConfig = {
  appointment: {
    icon: Calendar,
    color: 'card-appointment',
    bgColor: 'card-appointment-bg',
    borderColor: 'card-appointment-border'
  },
  message: {
    icon: MessageSquare,
    color: 'card-message',
    bgColor: 'card-message-bg',
    borderColor: 'card-message-border'
  },
  labResult: {
    icon: TestTube,
    color: 'card-lab-result',
    bgColor: 'card-lab-result-bg',
    borderColor: 'card-lab-result-border'
  },
  vitalSigns: {
    icon: Activity,
    color: 'card-vital-signs',
    bgColor: 'card-vital-signs-bg',
    borderColor: 'card-vital-signs-border'
  },
  soapNote: {
    icon: FileText,
    color: 'card-soap-note',
    bgColor: 'card-soap-note-bg',
    borderColor: 'card-soap-note-border'
  },
  prescription: {
    icon: Pill,
    color: 'card-prescription',
    bgColor: 'card-prescription-bg',
    borderColor: 'card-prescription-border'
  },
  procedure: {
    icon: Stethoscope,
    color: 'card-procedure',
    bgColor: 'card-procedure-bg',
    borderColor: 'card-procedure-border'
  },
  diagnosis: {
    icon: AlertCircle,
    color: 'card-diagnosis',
    bgColor: 'card-diagnosis-bg',
    borderColor: 'card-diagnosis-border'
  }
} as const;

export type CardType = keyof typeof cardTypeConfig;
