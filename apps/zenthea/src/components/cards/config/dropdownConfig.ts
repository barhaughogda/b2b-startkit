// Dropdown configuration for priority and status dropdowns
export const priorityDropdownConfig = {
  critical: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Critical' },
  high: { color: 'bg-orange-100 text-orange-800 border-orange-200', label: 'High' },
  medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'Medium' },
  low: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Low' },
} as const;

export const statusDropdownConfig = {
  new: { color: 'bg-blue-100 text-blue-800 border-blue-200', label: 'New' },
  inProgress: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', label: 'In Progress' },
  deferred: { color: 'bg-gray-100 text-gray-800 border-gray-200', label: 'Deferred' },
  waitingFor: { color: 'bg-purple-100 text-purple-800 border-purple-200', label: 'Waiting For' },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', label: 'Cancelled' },
  completed: { color: 'bg-green-100 text-green-800 border-green-200', label: 'Completed' },
} as const;
