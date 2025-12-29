'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  loadingMessage?: string;
  requireAuth?: boolean;
}

export function AuthGuard({ 
  children, 
  loadingMessage = 'Loading...',
  requireAuth = true 
}: AuthGuardProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;
    if (requireAuth && status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }
  }, [status, router, requireAuth]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zenthea-teal mx-auto"></div>
          <p className="mt-4 text-text-primary">{loadingMessage}</p>
        </div>
      </div>
    );
  }

  if (requireAuth && status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-background-primary flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-primary">Please sign in to access this page.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
