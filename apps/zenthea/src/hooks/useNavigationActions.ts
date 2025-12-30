'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth/react';

/**
 * Hook for navigation actions
 */
export function useNavigationActions() {
  const router = useRouter();

  const handleNavigation = useCallback((path: string) => {
    router.push(path);
  }, [router]);

  const handleLogout = useCallback(() => {
    signOut({ redirectUrl: '/' });
  }, []);

  const handleQuickAction = useCallback((action: string) => {
    switch (action) {
      case 'add-appointment':
        router.push('/company/appointments/new');
        break;
      case 'view-records':
        router.push('/company/patients');
        break;
      case 'send-message':
        router.push('/company/messages');
        break;
      case 'new-patient':
        router.push('/company/patients/new');
        break;
      case 'quick-note':
        router.push('/company/medical-records/notes/new');
        break;
      default:
        // Unknown quick action - could be logged to analytics in production
        break;
    }
  }, [router]);

  return {
    handleNavigation,
    handleLogout,
    handleQuickAction,
  };
}
