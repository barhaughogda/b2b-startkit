'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ProviderProfile } from '@/types';
import { User, MapPin, Star, Calendar, MessageSquare } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

interface ProviderProfileCardProps {
  profile: Partial<ProviderProfile>;
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  showActions?: boolean;
  onScheduleClick?: () => void;
  onMessageClick?: () => void;
  href?: string;
  compact?: boolean;
}

export function ProviderProfileCard({
  profile,
  user,
  showActions = true,
  onScheduleClick,
  onMessageClick,
  href,
  compact = false
}: ProviderProfileCardProps) {
  const displayName = user 
    ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Provider'
    : 'Provider';
  
  const primarySpecialty = profile.specialties?.[0] || 'General Practice';
  const photoUrl = profile.professionalPhotoUrl;
  const bio = profile.bio || profile.detailedBio;
  const languages = profile.languages || [];
  
  const cardContent = (
    <Card className="h-full flex flex-col hover:shadow-lg transition-shadow">
      <CardHeader className="text-center pb-4">
        <div className="mx-auto mb-4 relative">
          {photoUrl ? (
            <div className="h-24 w-24 rounded-full overflow-hidden bg-background-secondary border-2 border-border-primary">
              <Image
                src={photoUrl}
                alt={profile.professionalPhotoAltText || `${displayName} professional photo`}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            </div>
          ) : (
            <div className="h-24 w-24 rounded-full bg-zenthea-teal flex items-center justify-center">
              <User className="h-12 w-12 text-white" />
            </div>
          )}
          {profile.isVerified && (
            <div className="absolute bottom-0 right-0 h-6 w-6 rounded-full bg-status-success border-2 border-background-primary flex items-center justify-center">
              <span className="text-xs">✓</span>
            </div>
          )}
        </div>
        <CardTitle className="text-xl">{displayName}</CardTitle>
        <CardDescription className="text-sm">{primarySpecialty}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col space-y-4">
        {!compact && bio && (
          <p className="text-sm text-text-secondary line-clamp-3">
            {bio}
          </p>
        )}
        
        {languages.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {languages.slice(0, 3).map((lang, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {lang}
              </Badge>
            ))}
            {languages.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{languages.length - 3}
              </Badge>
            )}
          </div>
        )}
        
        {profile.specialties && profile.specialties.length > 1 && (
          <div className="flex flex-wrap gap-1">
            {profile.specialties.slice(1, 3).map((specialty, idx) => (
              <Badge key={idx} variant="secondary" className="text-xs">
                {specialty}
              </Badge>
            ))}
          </div>
        )}
        
        {showActions && (
          <div className="flex gap-2 mt-auto pt-4">
            {onScheduleClick && (
              <Button
                onClick={onScheduleClick}
                className="flex-1"
                size="sm"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Schedule
              </Button>
            )}
            {onMessageClick && (
              <Button
                onClick={onMessageClick}
                variant="outline"
                className="flex-1"
                size="sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Message
              </Button>
            )}
            {href && !onScheduleClick && !onMessageClick && (
              <Button
                asChild
                className="w-full"
                size="sm"
              >
                <Link href={href}>View Profile</Link>
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  if (href && !showActions) {
    return (
      <Link href={href} className="block h-full">
        {cardContent}
      </Link>
    );
  }
  
  return cardContent;
}

