/**
 * Hero Image Component
 * 
 * Dynamically loads the current hero image from the API
 */

'use client';

import { useState, useEffect } from 'react';

export default function HeroImage() {
  const [heroImageUrl, setHeroImageUrl] = useState<string>('https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHeroImage = async () => {
      try {
        // First try manual override
        const manualResponse = await fetch('/api/manual-hero-image', {
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
          // API returned HTML or other non-JSON, skip and use default
          setIsLoading(false);
          return;
        }
        
        const manualData = await manualResponse.json();
        
        if (manualData.success && manualData.isManual) {
          setHeroImageUrl(manualData.url);
          setIsLoading(false);
          return;
        }
        
        // Fallback to S3 listing
        const response = await fetch('/api/latest-hero-image');
        
        if (!response.ok) {
          // Skip if API fails, use default image
          setIsLoading(false);
          return;
        }
        
        // Check content type for this response too
        const responseContentType = response.headers.get('content-type');
        if (responseContentType && responseContentType.includes('application/json')) {
          const data = await response.json();
          
          if (data.success && data.url) {
            setHeroImageUrl(data.url);
          }
        }
        // If no image found, keep the default
      } catch (error) {
        // Only log errors in development to avoid console noise in production
        if (process.env.NODE_ENV === 'development') {
          console.error('Failed to fetch hero image:', error);
        }
        // Keep the default image on error
      } finally {
        setIsLoading(false);
      }
    };

    fetchHeroImage();
  }, []);

  if (isLoading) {
    return (
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg')"
        }}
      />
    );
  }

  return (
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url('${heroImageUrl}')`
      }}
    />
  );
}
