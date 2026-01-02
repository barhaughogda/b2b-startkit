'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import WebsiteBuilderPage from '../../page';

export default function TenantEditorPage() {
  const params = useParams();
  const tenantId = params?.tenantId as string;

  // In the real app, we would ensure the user has permission to edit this tenant
  // and pass the tenantId down to the main builder component.
  
  return <WebsiteBuilderPage />;
}
