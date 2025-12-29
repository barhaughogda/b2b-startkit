'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Calendar, Loader2, Star, UserCheck, Info } from 'lucide-react';
import { ProviderIntroductionModal } from './ProviderIntroductionModal';
import { useCardSystem } from '@/components/cards/CardSystemProvider';
import { CardType, Priority, TaskStatus } from '@/components/cards/types';
import { useRouter } from 'next/navigation';
import { useCareTeam, CareTeamMember } from '@/hooks/useCareTeam';
import { Id } from '@/convex/_generated/dataModel';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function CareTeamCard() {
  const router = useRouter();
  const { careTeam, primaryProvider, hasPrimaryProvider, isLoading } = useCareTeam();
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isIntroductionModalOpen, setIsIntroductionModalOpen] = useState(false);
  const { openCard } = useCardSystem();

  const handleMemberClick = (member: CareTeamMember) => {
    if (member.providerProfileId) {
      setSelectedProviderId(member.providerProfileId as string);
      setIsIntroductionModalOpen(true);
    }
  };

  const handleMessageClick = (e: React.MouseEvent, member: CareTeamMember) => {
    e.stopPropagation();
    router.push(`/patient/messages?providerId=${member.providerId}`);
  };

  const handleScheduleClick = useCallback((e: React.MouseEvent, member: CareTeamMember) => {
    e.stopPropagation();
    // Open the appointment card via main card system with pre-filled provider
    const baseProps = {
      patientId: '',
      patientName: '',
      priority: 'medium' as Priority,
      status: 'new' as TaskStatus,
    };

    openCard('appointment' as CardType, {
      id: 'new',
      patientId: '',
      patientName: '',
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
      date: new Date().toISOString().split('T')[0],
      duration: 30,
      type: 'consultation',
      status: 'scheduled',
      mode: 'create',
      prefilledDate: new Date(),
      prefilledProviderId: member.providerId,
    }, baseProps);
  }, [openCard]);

  return (
    <>
      <TooltipProvider>
      <Card className="h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Your Care Team
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-text-tertiary cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Your care team includes all healthcare professionals involved in your care. Your Primary Provider is your main point of contact for coordinating your health needs.</p>
                  </TooltipContent>
                </Tooltip>
              </CardTitle>
              <CardDescription>Dedicated professionals managing your health</CardDescription>
            </div>
            {hasPrimaryProvider && (
              <Badge className="bg-interactive-primary/10 text-interactive-primary border-interactive-primary/20">
                <Star className="h-3 w-3 mr-1 fill-interactive-primary" />
                Primary Assigned
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : careTeam.length > 0 ? (
            <>
              {careTeam.map((member) => {
                const isPrimary = member.isPrimaryProvider;
                
                return (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      isPrimary 
                        ? 'border-interactive-primary/50 bg-interactive-primary/5' 
                        : 'border-border-primary/50'
                    } ${
                      member.providerProfileId
                        ? 'cursor-pointer hover:bg-surface-elevated'
                        : 'hover:bg-surface-elevated'
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="relative">
                        <Avatar className={`h-12 w-12 ${isPrimary ? 'ring-2 ring-interactive-primary ring-offset-2' : ''}`}>
                          <AvatarImage 
                            src={member.professionalPhotoUrl} 
                            alt={member.name}
                          />
                          <AvatarFallback className={`font-medium ${isPrimary ? 'bg-interactive-primary text-white' : 'bg-primary/10 text-primary'}`}>
                            {member.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {isPrimary && (
                          <div className="absolute -top-1 -right-1 bg-interactive-primary rounded-full p-0.5">
                            <Star className="h-3 w-3 text-white fill-white" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-text-primary">{member.name}</p>
                          {isPrimary && (
                            <Badge variant="outline" className="text-xs bg-interactive-primary/10 text-interactive-primary border-interactive-primary/20">
                              Primary Provider
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-text-secondary">{member.role}</p>
                        {member.specialty && member.specialty !== member.role && (
                          <p className="text-xs text-text-tertiary">{member.specialty}</p>
                        )}
                        {member.source && (
                          <p className="text-xs text-text-tertiary capitalize">
                            {member.source.replace('_', ' ')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-secondary hover:text-interactive-primary hover:bg-interactive-primary/10"
                            onClick={(e) => handleMessageClick(e, member)}
                          >
                            <MessageSquare className="h-4 w-4" />
                            <span className="sr-only">Message {member.name}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Send a message</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-text-secondary hover:text-interactive-primary hover:bg-interactive-primary/10"
                            onClick={(e) => handleScheduleClick(e, member)}
                          >
                            <Calendar className="h-4 w-4" />
                            <span className="sr-only">Schedule with {member.name}</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Book an appointment</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                );
              })}
            </>
          ) : (
            <div className="text-center py-6">
              <UserCheck className="h-12 w-12 text-text-tertiary mx-auto mb-3" />
              <p className="text-sm text-text-tertiary">
                No care team members found. Your care team will appear here once you have appointments scheduled or a primary provider is assigned.
              </p>
            </div>
          )}
          
          {/* Who Can See My Data Explainer */}
          <div className="mt-4 pt-4 border-t border-border-primary/30">
            <div className="flex items-start gap-3 p-3 bg-background-secondary rounded-lg">
              <Info className="h-5 w-5 text-interactive-primary flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-text-primary mb-1">Who can see my data?</p>
                <p className="text-text-secondary text-xs leading-relaxed">
                  Your medical records are protected by HIPAA. Only your care team members listed above 
                  can access your health information. Your <strong>Primary Provider</strong> coordinates 
                  your overall care and has full access to your records. Other care team members may have 
                  limited access based on their role in your treatment.
                </p>
                <p className="text-text-tertiary text-xs mt-2">
                  All access to your records is logged and audited for your protection.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>

      <ProviderIntroductionModal
        providerId={selectedProviderId}
        open={isIntroductionModalOpen}
        onOpenChange={setIsIntroductionModalOpen}
      />
    </>
  );
}

