'use client';

import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  screenWidth: number;
  screenHeight: number;
  userAgent: string;
  platform: string;
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    isTouchDevice: false,
    screenWidth: 0,
    screenHeight: 0,
    userAgent: '',
    platform: ''
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const userAgent = navigator.userAgent;
      const screenWidth = window.innerWidth;
      const screenHeight = window.innerHeight;
      
      // Detect touch capability
      const isTouchDevice = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 || 
                           // @ts-ignore - for older browsers
                           navigator.msMaxTouchPoints > 0;

      // Mobile detection
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                      (screenWidth <= 768 && isTouchDevice);

      // Tablet detection
      const isTablet = /iPad|Android/i.test(userAgent) && 
                      screenWidth > 768 && 
                      screenWidth <= 1024 && 
                      isTouchDevice;

      // Desktop detection
      const isDesktop = !isMobile && !isTablet;

      // Platform detection
      let platform = 'unknown';
      if (/Android/i.test(userAgent)) platform = 'android';
      else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
      else if (/Windows/i.test(userAgent)) platform = 'windows';
      else if (/Mac/i.test(userAgent)) platform = 'mac';
      else if (/Linux/i.test(userAgent)) platform = 'linux';

      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        isTouchDevice,
        screenWidth,
        screenHeight,
        userAgent,
        platform
      });
    };

    // Initial detection
    updateDeviceInfo();

    // Listen for resize events
    window.addEventListener('resize', updateDeviceInfo);
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', updateDeviceInfo);

    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  return deviceInfo;
}

// Utility function for server-side rendering compatibility
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      screenWidth: 1024,
      screenHeight: 768,
      userAgent: '',
      platform: 'unknown'
    };
  }

  const userAgent = navigator.userAgent;
  const screenWidth = window.innerWidth;
  const screenHeight = window.innerHeight;
  
  const isTouchDevice = 'ontouchstart' in window || 
                       navigator.maxTouchPoints > 0 || 
                       // @ts-ignore - for older browsers
                       navigator.msMaxTouchPoints > 0;

  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) ||
                  (screenWidth <= 768 && isTouchDevice);

  const isTablet = /iPad|Android/i.test(userAgent) && 
                  screenWidth > 768 && 
                  screenWidth <= 1024 && 
                  isTouchDevice;

  const isDesktop = !isMobile && !isTablet;

  let platform = 'unknown';
  if (/Android/i.test(userAgent)) platform = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent)) platform = 'ios';
  else if (/Windows/i.test(userAgent)) platform = 'windows';
  else if (/Mac/i.test(userAgent)) platform = 'mac';
  else if (/Linux/i.test(userAgent)) platform = 'linux';

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    screenWidth,
    screenHeight,
    userAgent,
    platform
  };
}
