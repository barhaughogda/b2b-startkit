/**
 * Logo Component
 * 
 * Dynamically loads the current logo from the API
 */

'use client';

import { useState, useEffect } from 'react';

const DEBUG = process.env.NODE_ENV === 'development';

interface LogoProps {
  className?: string;
  alt?: string;
  width?: number;
  height?: number;
}

export default function Logo({ 
  className = "h-[50px] w-auto", 
  alt = "Zenthea Logo",
  width,
  height 
}: LogoProps) {
  const [logoUrl, setLogoUrl] = useState<string>('https://dbbi79w6g08cf.cloudfront.net/images/logo/ZentheaLogo-Blue.png');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogo = async () => {
      try {
        if (DEBUG) console.log('Fetching logo from /api/manual-logo...');
        // First try manual override
        const manualResponse = await fetch('/api/manual-logo', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
        });
        
        if (!manualResponse.ok) {
          throw new Error(`HTTP ${manualResponse.status}`);
        }
        
        // Check if response is actually JSON before parsing
        const contentType = manualResponse.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          if (DEBUG) console.warn('API returned non-JSON response, using default logo');
          setLogoUrl('https://dbbi79w6g08cf.cloudfront.net/images/logo/ZentheaLogo-Blue.png');
          setIsLoading(false);
          return;
        }
        
        const manualData = await manualResponse.json();
        
        if (DEBUG) console.log('Manual logo response:', manualData);
        
        if (manualData.success && manualData.isManual) {
          if (DEBUG) console.log('Using manual logo:', manualData.url);
          setLogoUrl(manualData.url);
          setIsLoading(false);
          return;
        }
        
        // Fallback to default logo
        if (DEBUG) console.log('Using default logo');
        setLogoUrl('https://dbbi79w6g08cf.cloudfront.net/images/logo/ZentheaLogo-Blue.png');
      } catch (error) {
        // Only log errors in development to avoid console noise in production
        if (DEBUG) {
          console.error('Failed to fetch logo:', error);
        }
        // Keep the default logo on error
        setLogoUrl('https://dbbi79w6g08cf.cloudfront.net/images/logo/ZentheaLogo-Blue.png');
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogo();
  }, []);

  return (
    <img 
      src={logoUrl} 
      alt={alt} 
      className={className}
      width={width}
      height={height}
      onError={(e) => {
        // Only log errors in development to avoid console noise in production
        if (DEBUG) {
          console.error('Logo image failed to load:', logoUrl);
        }
        // Fallback to the original Z logo if image fails to load
        e.currentTarget.style.display = 'none';
        const fallback = e.currentTarget.nextElementSibling as HTMLElement;
        if (fallback) fallback.style.display = 'flex';
      }}
      onLoad={() => {
        if (DEBUG) console.log('Logo loaded successfully:', logoUrl);
      }}
    />
  );
}
