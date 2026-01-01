'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { useOrganizationUsers } from '@/hooks/useOrganizationUsers';
import { useCareTeam } from '@/hooks/useCareTeam';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Search, Eye, Edit, Loader2, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CardMembersTabProps {
  medicalRecordId: string;
  patientId?: string;
  tenantId: string;
  legacyCareTeam?: Array<{ id: string; name: string; role: string; avatar?: string; initials?: string; isActive?: boolean; }>;
  showFullCareTeam?: boolean;
}

export function CardMembersTab({
  medicalRecordId,
  patientId,
  tenantId,
  legacyCareTeam,
  showFullCareTeam = false,
}: CardMembersTabProps) {
  const { data: session } = useZentheaSession();
  const currentUserId = session?.user?.id;
  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Note: medicalRecordMembers API not yet implemented in Postgres.
  // For now, we'll use an empty list or legacy care team.
  const recordMembers: any[] = [];

  const { careTeam: fullCareTeam } = useCareTeam(patientId);
  const { users: tenantUsers, isLoading: usersLoading } = useOrganizationUsers();

  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !currentUserId) return [];
    const existingMemberIds = new Set(recordMembers.map(m => m.userId));
    return tenantUsers.filter((user: any) => {
      if (existingMemberIds.has(user.id)) return false;
      const matchesSearch = !searchQuery || user.email.toLowerCase().includes(searchQuery.toLowerCase()) || (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [tenantUsers, currentUserId, searchQuery, recordMembers]);

  const updateDropdownPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  useEffect(() => {
    if (isSearchOpen) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition, true);
      window.addEventListener('resize', updateDropdownPosition);
      return () => {
        window.removeEventListener('scroll', updateDropdownPosition, true);
        window.removeEventListener('resize', updateDropdownPosition);
      };
    }
  }, [isSearchOpen, searchQuery]);

  const handleAddMember = async () => {
    toast.error('Member management for medical records is coming soon to Postgres.');
  };

  const handleRemoveMember = async (userId: string) => {
    toast.error('Member management for medical records is coming soon to Postgres.');
  };

  const handleUpdatePermission = async (userId: string, permission: 'view' | 'edit') => {
    toast.error('Member management for medical records is coming soon to Postgres.');
  };

  const getInitials = (name: string): string => {
    return name.split(' ').map(part => part[0]).join('').toUpperCase().slice(0, 2);
  };

  if (legacyCareTeam) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Care Team</h3>
            <Button size="sm" variant="outline" disabled><Plus className="h-3 w-3 mr-1" />Add Member</Button>
          </div>
          <div className="space-y-3">
            {legacyCareTeam.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-3 border border-border-primary rounded-lg">
                <Avatar className="h-8 w-8"><AvatarImage src={member.avatar} /><AvatarFallback>{member.initials || getInitials(member.name)}</AvatarFallback></Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{member.name}</p>
                  <p className="text-xs text-text-secondary">{member.role}</p>
                </div>
                <Badge className={cn("text-xs", member.isActive !== false ? "bg-status-success text-white" : "bg-text-tertiary text-white")}>{member.isActive !== false ? "Active" : "Inactive"}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary flex items-center gap-2"><Users className="h-4 w-4" />{showFullCareTeam ? 'Care Team' : 'Record Members'}</h3>
          <Button size="sm" variant="outline" onClick={() => setIsAddingMember(!isAddingMember)}><Plus className="h-3 w-3 mr-1" />Add Member</Button>
        </div>
        {/* ... Members List / Full Care Team UI simplified ... */}
        <div className="text-xs text-text-tertiary italic text-center py-4">Medical record member management is being migrated to Postgres.</div>
      </div>
    </div>
  );
}
