import React from 'react';
import { SessionProvider } from '@/lib/auth/react';

interface TestWrapperProps {
  children: React.ReactNode;
}

const mockSession = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    role: 'provider',
    tenantId: 'test-tenant'
  },
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
};

export function TestWrapper({ children }: TestWrapperProps) {
  return (
    <SessionProvider session={mockSession}>
      {children}
    </SessionProvider>
  );
}
