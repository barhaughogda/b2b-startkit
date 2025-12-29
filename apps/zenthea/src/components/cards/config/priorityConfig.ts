import { 
  AlertTriangle, 
  Clock, 
  CheckCircle 
} from 'lucide-react';

// Priority configuration
export const priorityConfig = {
  critical: {
    color: 'text-red-600',
    borderColor: 'border-red-500',
    icon: AlertTriangle,
    badge: 'Critical'
  },
  high: {
    color: 'text-orange-600',
    borderColor: 'border-orange-500',
    icon: AlertTriangle,
    badge: 'High'
  },
  medium: {
    color: 'text-yellow-600',
    borderColor: 'border-yellow-500',
    icon: Clock,
    badge: 'Medium'
  },
  low: {
    color: 'text-green-600',
    borderColor: 'border-green-500',
    icon: CheckCircle,
    badge: 'Low'
  }
} as const;

export type Priority = keyof typeof priorityConfig;
