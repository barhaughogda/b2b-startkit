'use client';

import { useEffect, useState, useMemo } from 'react';
import Image from 'next/image';
// import { useQuery } from 'convex/react';
// import { api } from '../../../convex/_generated/api';

interface TenantBrandingData {
  tenantId: string;
  name: string;
  branding: {
    logo?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    customDomain?: string;
    favicon?: string;
    customCss?: string;
  };
  contactInfo: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
    };
    website?: string;
  };
  features: {
    patientPortal: boolean;
    messaging: boolean;
    appointments: boolean;
    healthRecords: boolean;
    billing: boolean;
    labResults: boolean;
    prescriptions: boolean;
    telemedicine: boolean;
  };
}

interface TenantBrandingProps {
  tenantId?: string;
  showLogo?: boolean;
  showName?: boolean;
  showTagline?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function TenantBranding({ 
  tenantId, 
  showLogo = true, 
  showName = true, 
  showTagline = true,
  className = '',
  size = 'md'
}: TenantBrandingProps) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  
  // Get tenant ID from URL, localStorage, or props
  useEffect(() => {
    if (tenantId) {
      setCurrentTenantId(tenantId);
    } else {
      // Try to get from URL params or localStorage
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantId = urlParams.get('tenantId');
      const storedTenantId = localStorage.getItem('currentTenantId');
      
      setCurrentTenantId(urlTenantId || storedTenantId || 'demo-clinic');
    }
  }, [tenantId]);

  // Mock branding data for development
  const branding = useMemo(() => currentTenantId ? {
    tenantId: currentTenantId,
    name: 'Demo Clinic',
    branding: {
      primaryColor: 'var(--zenthea-teal)',
      secondaryColor: 'var(--zenthea-purple)',
      accentColor: 'var(--zenthea-coral)',
      logo: '/logo.png',
      favicon: '/favicon.ico',
      customCss: '',
      features: {
        patientPortal: true,
        messaging: true,
        appointments: true,
        healthRecords: true,
        billing: false,
        labResults: true,
        prescriptions: false,
        telemedicine: true
      }
    }
  } : null, [currentTenantId]);

  // Apply tenant branding to CSS variables
  useEffect(() => {
    if (branding?.branding) {
      const root = document.documentElement;
      root.style.setProperty('--tenant-primary-color', branding.branding.primaryColor);
      root.style.setProperty('--tenant-secondary-color', branding.branding.secondaryColor);
      root.style.setProperty('--tenant-accent-color', branding.branding.accentColor || branding.branding.primaryColor);
      
      // Apply custom CSS if provided
      if (branding.branding.customCss) {
        const styleElement = document.getElementById('tenant-custom-css') || document.createElement('style');
        styleElement.id = 'tenant-custom-css';
        styleElement.textContent = branding.branding.customCss;
        document.head.appendChild(styleElement);
      }
      
      // Update favicon if provided
      if (branding.branding.favicon) {
        const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement;
        if (favicon) {
          favicon.href = branding.branding.favicon;
        }
      }
    }
  }, [branding]);

  if (!branding) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="flex items-center space-x-4">
          <div className="h-12 w-12 bg-surface-secondary rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-6 w-32 bg-surface-secondary rounded"></div>
            <div className="h-4 w-24 bg-surface-secondary rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const sizeClasses = {
    sm: {
      container: 'space-x-2',
      logo: 'h-8 w-8',
      title: 'text-lg font-semibold',
      tagline: 'text-xs text-text-tertiary'
    },
    md: {
      container: 'space-x-4',
      logo: 'h-12 w-12',
      title: 'text-2xl font-bold',
      tagline: 'text-sm text-text-tertiary'
    },
    lg: {
      container: 'space-x-6',
      logo: 'h-16 w-16',
      title: 'text-3xl font-bold',
      tagline: 'text-base text-text-tertiary'
    }
  };

  const classes = sizeClasses[size];

  return (
    <div className={`flex items-center ${classes.container} ${className}`}>
      {showLogo && branding.branding.logo && (
        <div className="flex-shrink-0">
          <Image
            src={branding.branding.logo}
            alt={`${branding.name} logo`}
            width={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
            height={size === 'sm' ? 32 : size === 'md' ? 48 : 64}
            className={`${classes.logo} object-contain rounded-lg`}
            priority
          />
        </div>
      )}
      
      {(showName || showTagline) && (
        <div className="flex-1 min-w-0">
          {showName && (
            <h1 
              className={classes.title}
              style={{ color: branding.branding.primaryColor }}
            >
              {branding.name}
            </h1>
          )}
          {showTagline && (
            <p className={classes.tagline}>
              Patient Portal
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Hook to get current tenant branding
export function useTenantBranding(tenantId?: string) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  
  useEffect(() => {
    if (tenantId) {
      setCurrentTenantId(tenantId);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantId = urlParams.get('tenantId');
      const storedTenantId = localStorage.getItem('currentTenantId');
      
      setCurrentTenantId(urlTenantId || storedTenantId || 'demo-clinic');
    }
  }, [tenantId]);

  // Mock branding data for development
  const branding = useMemo(() => currentTenantId ? {
    tenantId: currentTenantId,
    name: 'Demo Clinic',
    branding: {
      primaryColor: 'var(--zenthea-teal)',
      secondaryColor: 'var(--zenthea-purple)',
      accentColor: 'var(--zenthea-coral)',
      logo: '/logo.png',
      favicon: '/favicon.ico',
      customCss: '',
      features: {
        patientPortal: true,
        messaging: true,
        appointments: true,
        healthRecords: true,
        billing: false,
        labResults: true,
        prescriptions: false,
        telemedicine: true
      }
    }
  } : null, [currentTenantId]);

  return {
    branding,
    tenantId: currentTenantId,
    isLoading: false
  };
}

// Hook to get tenant features for conditional rendering
export function useTenantFeatures(tenantId?: string) {
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  
  useEffect(() => {
    if (tenantId) {
      setCurrentTenantId(tenantId);
    } else {
      const urlParams = new URLSearchParams(window.location.search);
      const urlTenantId = urlParams.get('tenantId');
      const storedTenantId = localStorage.getItem('currentTenantId');
      
      setCurrentTenantId(urlTenantId || storedTenantId || 'demo-clinic');
    }
  }, [tenantId]);

  // Mock tenant data for development
  const tenantData = currentTenantId ? {
    tenantId: currentTenantId,
    name: 'Demo Clinic',
    branding: {
      primaryColor: 'var(--zenthea-teal)',
      secondaryColor: 'var(--zenthea-purple)',
      accentColor: 'var(--zenthea-coral)',
      logo: '/logo.png',
      favicon: '/favicon.ico',
      customCss: '',
      features: {
        patientPortal: true,
        messaging: true,
        appointments: true,
        healthRecords: true,
        billing: false,
        labResults: true,
        prescriptions: false,
        telemedicine: true
      }
    }
  } : null;

  return {
    features: tenantData?.branding?.features,
    tenantId: currentTenantId,
    isLoading: false
  };
}

// Component to conditionally render based on tenant features
interface FeatureGateProps {
  feature: keyof TenantBrandingData['features'];
  tenantId?: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, tenantId, children, fallback = null }: FeatureGateProps) {
  const { features, isLoading } = useTenantFeatures(tenantId);
  
  if (isLoading) {
    return <div className="animate-pulse h-4 bg-surface-secondary rounded"></div>;
  }
  
  if (!features || !features[feature]) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

// Tenant theme provider component
interface TenantThemeProviderProps {
  tenantId?: string;
  children: React.ReactNode;
}

export function TenantThemeProvider({ tenantId, children }: TenantThemeProviderProps) {
  const { branding } = useTenantBranding(tenantId);
  
  useEffect(() => {
    if (branding?.branding) {
      const root = document.documentElement;
      
      // Set CSS custom properties for tenant colors
      root.style.setProperty('--tenant-primary', branding.branding.primaryColor);
      root.style.setProperty('--tenant-secondary', branding.branding.secondaryColor);
      root.style.setProperty('--tenant-accent', branding.branding.accentColor || branding.branding.primaryColor);
      
      // Set data attribute for tenant-specific styling
      document.body.setAttribute('data-tenant', branding.tenantId);
      
      // Apply custom CSS
      if (branding.branding.customCss) {
        const existingStyle = document.getElementById('tenant-custom-css');
        if (existingStyle) {
          existingStyle.remove();
        }
        
        const styleElement = document.createElement('style');
        styleElement.id = 'tenant-custom-css';
        styleElement.textContent = branding.branding.customCss;
        document.head.appendChild(styleElement);
      }
    }
    
    return () => {
      // Cleanup on unmount
      const customStyle = document.getElementById('tenant-custom-css');
      if (customStyle) {
        customStyle.remove();
      }
      document.body.removeAttribute('data-tenant');
    };
  }, [branding]);
  
  return <>{children}</>;
}
