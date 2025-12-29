'use client';

// Force dynamic rendering - this page uses useCardSystem hook which requires CardSystemProvider context
export const dynamic = 'force-dynamic';

import React from 'react';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { TodayContent } from '@/components/clinic/TodayContent';

export default function TodayPage() {
  return (
    <ClinicLayout showSearch={true}>
      <TodayContent />
    </ClinicLayout>
  );
}

