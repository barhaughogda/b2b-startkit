'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { useZentheaSession } from '@/hooks/useZentheaSession';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Search, Eye, Edit, Loader2, Users, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CardMembersTabProps {
  medicalRecordId: Id<'medicalRecords'>;
  patientId?: Id<'patients'>;
  tenantId: string;
  /** Optional: Use legacy mock data instead of real API (for backwards compatibility) */
  legacyCareTeam?: Array<{
    id: string;
    name: string;
    role: string;
    avatar?: string;
    initials?: string;
    isActive?: boolean;
  }>;
  /** If true, shows the full care team from all sources, not just explicit record members */
  showFullCareTeam?: boolean;
}

/**
 * Card Members Tab Component
 * 
 * Displays and manages members of a specific medical record (card).
 * Connects to the medicalRecordMembers Convex table.
 * 
 * Features:
 * - Add members from staff list
 * - Set view/edit permissions
 * - Remove members
 * - Show full care team (optional)
 */
export function CardMembersTab({
  medicalRecordId,
  patientId,
  tenantId,
  legacyCareTeam,
  showFullCareTeam = false,
}: CardMembersTabProps) {
  const { data: session } = useZentheaSession();
  const userId = session?.user?.id as Id<'users'> | undefined;
  
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get members of this medical record
  const recordMembers = useQuery(
    api.medicalRecordMembers.getMembers,
    medicalRecordId && tenantId ? { medicalRecordId, tenantId } : 'skip'
  );

  // Get full care team (if showing and patient ID available)
  const fullCareTeam = useQuery(
    api.careTeam.getCareTeamForPatient,
    showFullCareTeam && patientId && tenantId ? { patientId, tenantId } : 'skip'
  );

  // Get users in the tenant (for adding)
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    tenantId ? { tenantId } : 'skip'
  );

  // Mutations
  const addMember = useMutation(api.medicalRecordMembers.addMember);
  const removeMember = useMutation(api.medicalRecordMembers.removeMember);
  const updatePermission = useMutation(api.medicalRecordMembers.updateMemberPermission);

  // Filter users for the add member dropdown
  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !userId) return [];
    
    const existingMemberIds = new Set(recordMembers?.map((m: { userId: Id<'users'> }) => m.userId) || []);
    const companyEmployeeRoles = ['admin', 'provider', 'clinic_user', 'demo', 'super_admin'];
    
    return tenantUsers.filter(user => {
      if (user.tenantId !== tenantId) return false;
      if (user.role === 'patient') return false;
      if (!companyEmployeeRoles.includes(user.role)) return false;
      if (existingMemberIds.has(user._id)) return false;
      
      const matchesSearch = !searchQuery || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [tenantUsers, userId, searchQuery, tenantId, recordMembers]);

  // Update dropdown position
  const updateDropdownPosition = () => {
    if (searchInputRef.current) {
      const rect = searchInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Handle dropdown positioning
  useEffect(() => {
    if (isSearchOpen) {
      updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isSearchOpen, searchQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchInputRef.current && 
        dropdownRef.current &&
        !searchInputRef.current.contains(event.target as Node) &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isSearchOpen]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !userId) {
      toast.error('Please select a user');
      return;
    }

    try {
      await addMember({
        medicalRecordId,
        userId: selectedUserId as Id<'users'>,
        permission: selectedPermission,
        addedBy: userId,
        tenantId,
      });
      
      toast.success('Member added successfully');
      setSelectedUserId('');
      setSelectedPermission('view');
      setIsAddingMember(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add member');
    }
  };

  const handleRemoveMember = async (memberUserId: Id<'users'>) => {
    if (!userId) return;
    
    try {
      await removeMember({
        medicalRecordId,
        userId: memberUserId,
        removedBy: userId,
        tenantId,
      });
      toast.success('Member removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove member');
    }
  };

  const handleUpdatePermission = async (memberUserId: Id<'users'>, newPermission: 'view' | 'edit') => {
    if (!userId) return;
    
    try {
      await updatePermission({
        medicalRecordId,
        userId: memberUserId,
        permission: newPermission,
        updatedBy: userId,
        tenantId,
      });
      toast.success('Permission updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permission');
    }
  };

  // Get selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId || !tenantUsers) return null;
    return tenantUsers.find(u => u._id === selectedUserId) || null;
  }, [selectedUserId, tenantUsers]);

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // If legacy data is provided, render that instead
  if (legacyCareTeam) {
    return (
      <div className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">Care Team</h3>
            <Button size="sm" variant="outline" className="flex items-center space-x-1" disabled>
              <Plus className="h-3 w-3" />
              <span>Add Member</span>
            </Button>
          </div>
          
          <Alert className="bg-status-warning/10 border-status-warning/30">
            <AlertCircle className="h-4 w-4 text-status-warning" />
            <AlertDescription className="text-xs text-text-secondary">
              This card is using legacy data. Connect to a medical record to enable member management.
            </AlertDescription>
          </Alert>
          
          <div className="space-y-3">
            {legacyCareTeam.map((member) => (
              <div key={member.id} className="flex items-center space-x-3 p-3 border border-border-primary rounded-lg">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={member.avatar} />
                  <AvatarFallback>{member.initials || getInitials(member.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium text-text-primary">{member.name}</p>
                  <p className="text-xs text-text-secondary">{member.role}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {member.isActive !== false ? (
                    <Badge className="text-xs bg-status-success text-white">Active</Badge>
                  ) : (
                    <Badge className="text-xs bg-text-tertiary text-white">Inactive</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (recordMembers === undefined) {
    return (
      <div className="p-4 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-text-primary flex items-center gap-2">
            <Users className="h-4 w-4" />
            {showFullCareTeam ? 'Care Team' : 'Record Members'}
          </h3>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex items-center space-x-1"
            onClick={() => setIsAddingMember(!isAddingMember)}
          >
            <Plus className="h-3 w-3" />
            <span>Add Member</span>
          </Button>
        </div>

        {/* Add Member Form */}
        {isAddingMember && (
          <div className="p-3 border border-border-primary rounded-lg space-y-3 bg-background-secondary">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                placeholder="Search staff members..."
                value={selectedUser ? (selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()) : searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setSelectedUserId('');
                }}
                onFocus={() => {
                  setIsSearchOpen(true);
                  setHighlightedIndex(-1);
                  updateDropdownPosition();
                }}
                className="pl-10"
              />
              
              {isSearchOpen && filteredUsers.length > 0 && dropdownPosition && typeof window !== 'undefined' && createPortal(
                <div
                  ref={dropdownRef}
                  className="fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg max-h-40 overflow-y-auto z-[9999]"
                  style={{
                    top: `${dropdownPosition.top}px`,
                    left: `${dropdownPosition.left}px`,
                    width: `${dropdownPosition.width}px`,
                  }}
                >
                  {filteredUsers.map((user, index) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => handleUserSelect(user._id)}
                      onMouseEnter={() => setHighlightedIndex(index)}
                      className={`w-full text-left px-3 py-2 transition-colors cursor-pointer text-sm ${
                        highlightedIndex === index
                          ? 'bg-surface-interactive'
                          : 'hover:bg-surface-interactive'
                      }`}
                    >
                      <div className="font-medium text-text-primary">
                        {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                      </div>
                      <div className="text-xs text-text-secondary">{user.email}</div>
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
            
            {selectedUserId && (
              <div className="flex gap-2">
                <Select value={selectedPermission} onValueChange={(v: 'view' | 'edit') => setSelectedPermission(v)}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        View
                      </span>
                    </SelectItem>
                    <SelectItem value="edit">
                      <span className="flex items-center gap-1">
                        <Edit className="h-3 w-3" />
                        Edit
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddMember}>
                  Add
                </Button>
                <Button size="sm" variant="ghost" onClick={() => {
                  setIsAddingMember(false);
                  setSelectedUserId('');
                  setSearchQuery('');
                }}>
                  Cancel
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="space-y-3">
          {recordMembers.length === 0 ? (
            <p className="text-sm text-text-secondary text-center py-4">
              No members added yet. Click &quot;Add Member&quot; to share this record.
            </p>
          ) : (
            recordMembers.map((member: { _id: string; userId: Id<'users'>; permission: 'view' | 'edit'; user?: { name?: string; email?: string; role?: string } | null }) => {
              const user = member.user;
              if (!user) return null;
              
              return (
                <div key={member._id} className="flex items-center space-x-3 p-3 border border-border-primary rounded-lg">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>{getInitials(user.name || user.email || '')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user.name || user.email}
                    </p>
                    <p className="text-xs text-text-secondary">{user.role}</p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Select 
                      value={member.permission} 
                      onValueChange={(v: 'view' | 'edit') => handleUpdatePermission(member.userId, v)}
                    >
                      <SelectTrigger className="w-20 h-7 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="view">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            View
                          </span>
                        </SelectItem>
                        <SelectItem value="edit">
                          <span className="flex items-center gap-1">
                            <Edit className="h-3 w-3" />
                            Edit
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0"
                      onClick={() => handleRemoveMember(member.userId)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Full Care Team Section (if enabled) */}
        {showFullCareTeam && fullCareTeam && fullCareTeam.members.length > 0 && (
          <div className="mt-6 pt-4 border-t border-border-primary">
            <h4 className="text-sm font-medium text-text-secondary mb-3">
              Full Care Team ({fullCareTeam.totalCount})
            </h4>
            <div className="space-y-2">
              {fullCareTeam.members.map((member: { userId: string; name: string; role?: string; source?: string }) => (
                <div key={member.userId} className="flex items-center space-x-3 p-2 rounded-lg bg-background-secondary">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text-primary truncate">{member.name}</p>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">
                    {member.source?.replace('_', ' ') || 'Unknown'}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

