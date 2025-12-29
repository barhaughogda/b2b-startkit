'use client';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  NavigationItem,
  QuickActionItem,
  UserMenuItem 
} from '@/types/navigation';
import { 
  User, 
  Settings, 
  LogOut,
  Calendar,
  Users,
  MessageSquare,
  FileText,
  Stethoscope,
  Clock,
  ClipboardList,
  Activity,
  UserCheck
} from 'lucide-react';
import { useNavigationState } from './useNavigationState';
import { useNavigationActions } from './useNavigationActions';

/**
 * Custom hook for provider navigation functionality
 * Provides navigation configuration and simplified state management
 */
export function useProviderNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  
  // Use focused hooks
  const navigationState = useNavigationState();
  const navigationActions = useNavigationActions();

  // Navigation configuration
  const navigationItems: NavigationItem[] = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      url: '/company/dashboard',
      icon: Calendar,
      isActive: true,
    },
    {
      id: 'appointments',
      title: 'Appointments',
      url: '/company/appointments',
      icon: Calendar,
      badge: '5',
    },
    {
      id: 'patients',
      title: 'Patients',
      url: '/company/patients',
      icon: Users,
      badge: '12',
    },
    {
      id: 'messages',
      title: 'Messages',
      url: '/company/messages',
      icon: MessageSquare,
      badge: '3',
    },
    {
      id: 'medical-records',
      title: 'Medical Records',
      url: '/company/medical-records',
      icon: FileText,
      isCollapsible: true,
      items: [
        {
          id: 'patient-records',
          title: 'Patient Records',
          url: '/company/medical-records/encounters',
          icon: FileText,
        },
        {
          id: 'lab-results',
          title: 'Lab Results',
          url: '/company/medical-records/lab-results',
          icon: FileText,
        },
        {
          id: 'imaging',
          title: 'Imaging',
          url: '/company/medical-records/imaging',
          icon: FileText,
        },
        {
          id: 'prescriptions',
          title: 'Prescriptions',
          url: '/company/medical-records/prescriptions',
          icon: FileText,
        },
      ],
    },
    {
      id: 'clinical-tools',
      title: 'Clinical Tools',
      url: '/company/clinical',
      icon: Stethoscope,
      isCollapsible: true,
      items: [
        {
          id: 'voice-assistant',
          title: 'Voice Assistant',
          url: '/company/clinical/voice',
          icon: Stethoscope,
        },
        {
          id: 'clinical-notes',
          title: 'Clinical Notes',
          url: '/company/medical-records/notes/new',
          icon: FileText,
        },
        {
          id: 'diagnosis-tools',
          title: 'Diagnosis Tools',
          url: '/company/clinical/diagnosis',
          icon: Stethoscope,
        },
      ],
    },
    {
      id: 'schedule',
      title: 'Schedule',
      url: '/company/today',
      icon: Clock,
    },
    {
      id: 'calendar',
      title: 'Calendar',
      url: '/company/calendar',
      icon: Calendar,
    },
    {
      id: 'reports',
      title: 'Reports',
      url: '/company/reports',
      icon: ClipboardList,
    },
    {
      id: 'analytics',
      title: 'Analytics',
      url: '/company/analytics',
      icon: Activity,
    },
  ];

  const quickActions: QuickActionItem[] = [
    {
      id: 'new-patient',
      title: 'New Patient',
      url: '/company/patients/new',
      icon: UserCheck,
      description: 'Add a new patient to the system',
    },
    {
      id: 'schedule-appointment',
      title: 'Schedule Appointment',
      url: '/company/appointments/new',
      icon: Calendar,
      description: 'Create a new appointment',
    },
    {
      id: 'quick-note',
      title: 'Quick Note',
      url: '/company/medical-records/notes/new',
      icon: FileText,
      description: 'Add a clinical note',
    },
  ];

  const userMenuItems: UserMenuItem[] = [
    {
      id: 'profile',
      title: 'Profile',
      url: '/company/user/profile',
      icon: User,
    },
    {
      id: 'settings',
      title: 'Settings',
      url: '/company/user/settings',
      icon: Settings,
    },
    {
      id: 'separator',
      title: '',
      url: '',
      icon: User,
      isSeparator: true,
    },
    {
      id: 'logout',
      title: 'Logout',
      url: '',
      icon: LogOut,
      onClick: navigationActions.handleLogout,
    },
  ];

  return {
    // Current pathname
    pathname,
    
    // Session data
    session,
    
    // Navigation state
    ...navigationState,
    
    // Navigation actions
    ...navigationActions,
    
    // Configuration
    navigationItems,
    quickActions,
    userMenuItems,
  };
}
