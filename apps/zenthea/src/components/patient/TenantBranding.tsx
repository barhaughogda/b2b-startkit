'use client';

import React from 'react';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';

interface TenantBrandingProps {
  tenantId?: string;
  logo?: string;
  logoAlt?: string;
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  showLogo?: boolean;
  showName?: boolean;
  tenantName?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function TenantBranding({
  tenantId,
  logo,
  logoAlt = 'Practice Logo',
  primaryColor,
  secondaryColor,
  fontFamily,
  showLogo = true,
  showName = true,
  tenantName = 'Medical Practice',
  size = 'md',
  className = '',
}: TenantBrandingProps) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-lg',
    lg: 'text-xl',
  };

  return (
    <Card className={`p-4 ${className}`}>
      <CardContent className="flex items-center gap-3 p-0">
        {showLogo && logo && (
          <div className={`${sizeClasses[size]} relative flex-shrink-0`}>
            <Image
              src={logo}
              alt={logoAlt}
              fill
              className="object-contain"
              priority
            />
          </div>
        )}
        
        {showName && (
          <div 
            className={`${textSizeClasses[size]} font-semibold`}
            style={{ 
              fontFamily: fontFamily,
              color: primaryColor 
            }}
          >
            {tenantName}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Hook for accessing tenant branding context
export function useTenantBranding() {
  // This would typically come from a context provider
  // For now, returning mock data
  return {
    tenantId: 'demo-tenant',
    logo: '/api/tenant/logo',
    tenantName: 'Demo Medical Practice',
    primaryColor: '#008080', // Zenthea Teal
    secondaryColor: '#5F284A', // Zenthea Purple
    fontFamily: 'Inter, sans-serif',
  };
}