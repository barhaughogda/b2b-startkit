'use client';

import React from 'react';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { EnhancedProviderProfileEditor } from '@/components/provider/EnhancedProviderProfileEditor';

export default function ProfilePage() {
  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <EnhancedProviderProfileEditor />
      </div>
    </ClinicLayout>
  );
}

