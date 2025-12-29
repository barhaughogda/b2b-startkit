'use client';

import React from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TeamMember } from '../types';

interface MessageMembersContentProps {
  careTeam: TeamMember[];
}

export const MessageMembersContent: React.FC<MessageMembersContentProps> = ({ careTeam = [] }) => {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-text-primary mb-3">Care Team</h4>
          <div className="space-y-3">
            {(careTeam || []).map((member) => (
              <div key={member.id} className="flex items-center gap-3 p-2 rounded-lg bg-surface-elevated">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {member.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="text-sm font-medium">{member.name}</div>
                  <div className="text-xs text-text-tertiary">{member.role}</div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {member.role?.toLowerCase().includes('doctor') || 
                   member.role?.toLowerCase().includes('provider') || 
                   member.role?.toLowerCase().includes('physician') ? 'Provider' : 'Staff'}
                </Badge>
              </div>
            ))}
            {careTeam.length === 0 && (
              <div className="text-sm text-text-tertiary text-center py-4">
                No care team members assigned
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
