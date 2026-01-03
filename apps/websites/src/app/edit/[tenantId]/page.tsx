'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import WebsiteBuilderPage from '../../page';

export default function TenantEditorPage({
  params,
}: {
  params: Promise<{ tenantId: string }>;
}) {
  const { tenantId } = React.use(params);

  // In the real app, we would ensure the user has permission to edit this tenant
  // and pass the tenantId down to the main builder component.
  
  return <WebsiteBuilderPage tenantId={tenantId} />;
}
