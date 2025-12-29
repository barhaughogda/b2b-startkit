'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

interface NavigationLoadingProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function NavigationLoading({ 
  message = 'Loading navigation...', 
  size = 'md' 
}: NavigationLoadingProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  return (
    <div className="flex items-center justify-center p-4">
      <div className="flex items-center space-x-2 text-text-secondary">
        <Loader2 className={`${sizeClasses[size]} animate-spin`} />
        <span className="text-sm">{message}</span>
      </div>
    </div>
  );
}
