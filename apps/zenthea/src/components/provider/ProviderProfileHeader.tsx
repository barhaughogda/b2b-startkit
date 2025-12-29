'use client';

import React from 'react';
import { ProviderProfile } from '@/types';
import { Badge } from '@/components/ui/badge';
import { User, CheckCircle2, Award, GraduationCap } from 'lucide-react';
import Image from 'next/image';

interface ProviderProfileHeaderProps {
  profile: Partial<ProviderProfile>;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  showCredentials?: boolean;
}

export function ProviderProfileHeader({
  profile,
  user,
  showCredentials = true
}: ProviderProfileHeaderProps) {
  const displayName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider'
    : 'Provider';
  
  const photoUrl = profile.professionalPhotoUrl;
  const specialties = profile.specialties || [];
  const boardCerts = profile.boardCertifications || [];
  const education = profile.education || [];
  
  return (
    <div className="flex flex-col md:flex-row gap-6 pb-6 border-b border-border-primary">
      {/* Photo */}
      <div className="flex-shrink-0">
        {photoUrl ? (
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-lg overflow-hidden bg-background-secondary border-2 border-border-primary shadow-md">
            <Image
              src={photoUrl}
              alt={profile.professionalPhotoAltText || `${displayName} professional photo`}
              width={160}
              height={160}
              className="object-cover w-full h-full"
            />
          </div>
        ) : (
          <div className="h-32 w-32 md:h-40 md:w-40 rounded-lg bg-zenthea-teal flex items-center justify-center shadow-md">
            <User className="h-16 w-16 md:h-20 md:w-20 text-white" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 space-y-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl md:text-4xl font-bold text-text-primary">
              {displayName}
            </h1>
            {profile.isVerified && (
              <CheckCircle2 className="h-6 w-6 text-status-success" />
            )}
          </div>
          
          {specialties.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {specialties.map((specialty, idx) => (
                <Badge key={idx} variant="default" className="text-sm">
                  {specialty}
                </Badge>
              ))}
            </div>
          )}
        </div>
        
        {showCredentials && (
          <div className="space-y-2">
            {/* Board Certifications */}
            {boardCerts.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <Award className="h-4 w-4" />
                <span>
                  Board Certified: {boardCerts.map(c => c.specialty).join(', ')}
                </span>
              </div>
            )}
            
            {/* Education */}
            {education.length > 0 && (
              <div className="flex items-center gap-2 text-sm text-text-secondary">
                <GraduationCap className="h-4 w-4" />
                <span>
                  {education.map(e => `${e.degree}${e.institution ? `, ${e.institution}` : ''}`).join('; ')}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

