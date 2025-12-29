'use client';

import React from 'react';
import { SuperAdminHeader } from './SuperAdminHeader';
import { SuperAdminSidebar } from './SuperAdminSidebar';

interface SuperAdminLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout component for all superadmin pages
 * Provides consistent navigation, header, and sidebar structure
 */
export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-background-primary">
      <SuperAdminHeader />
      <div className="flex">
        <SuperAdminSidebar />
        <main className="flex-1 md:ml-64 pt-16">
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

