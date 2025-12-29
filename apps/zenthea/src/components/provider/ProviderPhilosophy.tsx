'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Heart, MessageSquare, Users } from 'lucide-react';

interface ProviderPhilosophyProps {
  philosophyOfCare?: string;
  communicationStyle?: string;
  whyIBecameADoctor?: string;
  detailedBio?: string;
}

export function ProviderPhilosophy({
  philosophyOfCare,
  communicationStyle,
  whyIBecameADoctor,
  detailedBio
}: ProviderPhilosophyProps) {
  const hasContent = philosophyOfCare || communicationStyle || whyIBecameADoctor || detailedBio;
  
  if (!hasContent) {
    return null;
  }
  
  return (
    <div className="space-y-4">
      {/* Philosophy of Care */}
      {philosophyOfCare && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-zenthea-teal" />
              Philosophy of Care
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary whitespace-pre-line leading-relaxed">
              {philosophyOfCare}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Communication Style */}
      {communicationStyle && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-zenthea-teal" />
              Communication Style
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary whitespace-pre-line leading-relaxed">
              {communicationStyle}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Why I Became a Doctor */}
      {whyIBecameADoctor && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-zenthea-teal" />
              Why I Became a Doctor
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary whitespace-pre-line leading-relaxed">
              {whyIBecameADoctor}
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Detailed Bio */}
      {detailedBio && !philosophyOfCare && (
        <Card>
          <CardHeader>
            <CardTitle>About Me</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-text-primary whitespace-pre-line leading-relaxed">
              {detailedBio}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

