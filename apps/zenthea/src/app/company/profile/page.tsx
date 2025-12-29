'use client';

import React from 'react';
import { ClinicLayout } from '@/components/layout/ClinicLayout';
import { ClinicProfileEditor } from '@/components/clinic/ClinicProfileEditor';
import { BackButton } from '@/components/ui/back-button';

export default function ClinicProfilePage() {
  return (
    <ClinicLayout showSearch={true}>
      <div className="flex-1 pb-6">
        <BackButton />
        <ClinicProfileEditor />
      </div>
    </ClinicLayout>
  );
}

