import { 
  RotateCcw, 
  Clock, 
  Pause, 
  Hourglass, 
  XCircle, 
  CheckCircle 
} from 'lucide-react';

// Status configuration
export const statusConfig = {
  new: {
    color: 'bg-blue-100 text-blue-800',
    icon: RotateCcw,
    label: 'New'
  },
  inProgress: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    label: 'In Progress'
  },
  deferred: {
    color: 'bg-gray-100 text-gray-800',
    icon: Pause,
    label: 'Deferred'
  },
  waitingFor: {
    color: 'bg-purple-100 text-purple-800',
    icon: Hourglass,
    label: 'Waiting For'
  },
  cancelled: {
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    label: 'Cancelled'
  },
  completed: {
    color: 'bg-green-100 text-green-800',
    icon: CheckCircle,
    label: 'Completed'
  }
} as const;

export type TaskStatus = keyof typeof statusConfig;
