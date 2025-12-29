'use client';

import { ProviderPreferencesProvider } from '@/lib/datetime';

// Force dynamic rendering - clinic pages use ClinicLayout which includes navigation requiring session context
export const dynamic = 'force-dynamic';

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProviderPreferencesProvider>
      {children}
    </ProviderPreferencesProvider>
  );
}

