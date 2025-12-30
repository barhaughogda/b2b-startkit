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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  X, 
  Search, 
  Loader2, 
  Users, 
  AlertCircle, 
  Star,
  UserCheck,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PatientCareTeamTabProps {
  patientId: Id<'patients'>;
  tenantId: string;
  /** If true, allows editing care team (requires appropriate permissions) */
  canEdit?: boolean;
}

const CHANGE_REASONS = [
  { value: 'initial_assignment', label: 'Initial Assignment' },
  { value: 'patient_request', label: 'Patient Request' },
  { value: 'provider_leaving', label: 'Provider Leaving' },
  { value: 'insurance_change', label: 'Insurance Change' },
  { value: 'internal_transfer', label: 'Internal Transfer' },
  { value: 'coverage_assignment', label: 'Coverage Assignment' },
  { value: 'other', label: 'Other' },
];

const CARE_TEAM_ROLES = [
  'Primary Provider',
  'Specialist',
  'Nurse',
  'Care Coordinator',
  'Therapist',
  'Medical Assistant',
  'Other',
];

/**
 * Patient Care Team Tab Component
 * 
 * Displays and manages the care team for a patient.
 * Shows primary provider prominently and lists all care team members.
 * 
 * Features:
 * - Display primary provider with star indicator
 * - List all care team members with roles and sources
 * - Add/remove care team members
 * - Change primary provider with reason tracking
 * - View primary provider change history
 */
export function PatientCareTeamTab({
  patientId,
  tenantId,
  canEdit = false,
}: PatientCareTeamTabProps) {
  const { data: session } = useZentheaSession();
  const userId = session?.user?.id as Id<'users'> | undefined;
  
  // State
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  // Change primary provider dialog
  const [isChangePrimaryOpen, setIsChangePrimaryOpen] = useState(false);
  const [newPrimaryProviderId, setNewPrimaryProviderId] = useState<string>('');
  const [changeReason, setChangeReason] = useState<string>('');
  const [changeNotes, setChangeNotes] = useState<string>('');
  
  // History expansion
  const [showHistory, setShowHistory] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Queries
  const primaryProvider = useQuery(
    api.careTeam.getPrimaryProvider,
    patientId && tenantId ? { patientId, tenantId } : 'skip'
  );
  
  const careTeam = useQuery(
    api.careTeam.getCareTeamForPatient,
    patientId && tenantId ? { patientId, tenantId } : 'skip'
  );
  
  const providerHistory = useQuery(
    api.careTeam.getPrimaryProviderHistory,
    showHistory && patientId && tenantId ? { patientId, tenantId, limit: 10 } : 'skip'
  );
  
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    tenantId ? { tenantId } : 'skip'
  );

  // Mutations
  const setPrimaryProvider = useMutation(api.careTeam.setPrimaryProvider);
  const addCareTeamMember = useMutation(api.careTeam.addCareTeamMember);
  const removeCareTeamMember = useMutation(api.careTeam.removeCareTeamMember);
  const updateCareTeamMemberRole = useMutation(api.careTeam.updateCareTeamMemberRole);

  // Filter users for dropdowns
  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !userId) return [];
    
    const existingMemberIds = new Set(careTeam?.members.map((m: { userId: string }) => m.userId) || []);
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
  }, [tenantUsers, userId, searchQuery, tenantId, careTeam]);

  // Available providers for primary selection (all staff, not just non-members)
  const availableProviders = useMemo(() => {
    if (!tenantUsers) return [];
    
    const companyEmployeeRoles = ['admin', 'provider', 'clinic_user', 'super_admin'];
    
    return tenantUsers.filter(user => {
      if (user.tenantId !== tenantId) return false;
      if (user.role === 'patient') return false;
      if (!companyEmployeeRoles.includes(user.role)) return false;
      return true;
    });
  }, [tenantUsers, tenantId]);

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
    if (!selectedUserId || !userId || !selectedRole) {
      toast.error('Please select a user and role');
      return;
    }

    try {
      await addCareTeamMember({
        patientId,
        userId: selectedUserId as Id<'users'>,
        role: selectedRole,
        addedBy: userId,
        tenantId,
      });
      
      toast.success('Care team member added successfully');
      setSelectedUserId('');
      setSelectedRole('');
      setIsAddingMember(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add care team member');
    }
  };

  const handleRemoveMember = async (memberUserId: string) => {
    if (!userId) return;
    
    try {
      await removeCareTeamMember({
        patientId,
        userId: memberUserId as Id<'users'>,
        removedBy: userId,
        tenantId,
      });
      toast.success('Care team member removed');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove care team member');
    }
  };

  const handleChangePrimaryProvider = async () => {
    if (!newPrimaryProviderId || !userId || !changeReason) {
      toast.error('Please select a provider and reason');
      return;
    }

    try {
      await setPrimaryProvider({
        patientId,
        newProviderId: newPrimaryProviderId as Id<'users'>,
        reason: changeReason,
        notes: changeNotes || undefined,
        changedBy: userId,
        tenantId,
      });
      
      toast.success('Primary provider updated successfully');
      setIsChangePrimaryOpen(false);
      setNewPrimaryProviderId('');
      setChangeReason('');
      setChangeNotes('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update primary provider');
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getSourceBadgeColor = (source: string) => {
    switch (source) {
      case 'explicit':
        return 'bg-interactive-primary/10 text-interactive-primary border-interactive-primary/20';
      case 'medical_record':
        return 'bg-status-info/10 text-status-info border-status-info/20';
      case 'appointment':
        return 'bg-status-warning/10 text-status-warning border-status-warning/20';
      default:
        return 'bg-text-tertiary/10 text-text-tertiary border-text-tertiary/20';
    }
  };

  // Loading state
  if (careTeam === undefined || primaryProvider === undefined) {
    return (
      <div className="p-6 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
      </div>
    );
  }

  // Get selected user details
  const selectedUser = tenantUsers?.find(u => u._id === selectedUserId);

  return (
    <div className="space-y-6">
      {/* Primary Provider Section */}
      <Card className="border-interactive-primary/30 bg-interactive-primary/5">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Star className="h-5 w-5 text-interactive-primary fill-interactive-primary" />
              <CardTitle className="text-lg">Primary Provider</CardTitle>
            </div>
            {canEdit && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsChangePrimaryOpen(true)}
              >
                {primaryProvider?.hasProvider ? 'Change' : 'Assign'}
              </Button>
            )}
          </div>
          <CardDescription>
            The provider responsible for coordinating this patient&apos;s overall care
          </CardDescription>
        </CardHeader>
        <CardContent>
          {primaryProvider?.hasProvider && primaryProvider.primaryProvider ? (
            <div className="flex items-center gap-4 p-4 bg-surface-elevated rounded-lg border border-border-primary">
              <Avatar className="h-12 w-12">
                <AvatarFallback className="bg-interactive-primary text-white">
                  {getInitials(primaryProvider.primaryProvider.name || primaryProvider.primaryProvider.email)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-text-primary">
                  {primaryProvider.primaryProvider.name || primaryProvider.primaryProvider.email}
                </p>
                <p className="text-sm text-text-secondary">{primaryProvider.primaryProvider.email}</p>
                {primaryProvider.primaryProvider.phone && (
                  <p className="text-sm text-text-tertiary">{primaryProvider.primaryProvider.phone}</p>
                )}
              </div>
              <Badge className="bg-interactive-primary/10 text-interactive-primary border-interactive-primary/20">
                <UserCheck className="h-3 w-3 mr-1" />
                Primary
              </Badge>
            </div>
          ) : (
            <Alert className="bg-status-warning/10 border-status-warning/30">
              <AlertCircle className="h-4 w-4 text-status-warning" />
              <AlertDescription className="text-text-secondary">
                No primary provider assigned. {canEdit ? 'Click "Assign" to set one.' : 'Contact an administrator to assign one.'}
              </AlertDescription>
            </Alert>
          )}

          {/* History Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 w-full justify-between"
            onClick={() => setShowHistory(!showHistory)}
          >
            <span className="flex items-center gap-2">
              <History className="h-4 w-4" />
              Provider History
            </span>
            {showHistory ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>

          {/* History Section */}
          {showHistory && providerHistory && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {providerHistory.history.length === 0 ? (
                <p className="text-sm text-text-tertiary text-center py-2">No history available</p>
              ) : (
                providerHistory.history.map((entry: { 
                  _id: string; 
                  createdAt: number;
                  reason: string;
                  notes: string | undefined;
                  previousProvider: { _id: string; name: string; email: string; } | null;
                  newProvider: { _id: string; name: string; email: string; } | null;
                  changedBy: { _id: string; name: string; email: string; } | null;
                }) => (
                  <div key={entry._id} className="p-3 bg-background-secondary rounded-lg text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-text-primary">
                        {entry.previousProvider ? (
                          <>
                            {entry.previousProvider.name} → {entry.newProvider?.name}
                          </>
                        ) : (
                          <>Initial: {entry.newProvider?.name}</>
                        )}
                      </span>
                      <span className="text-text-tertiary text-xs">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {entry.reason.replace(/_/g, ' ') || 'Unknown'}
                      </Badge>
                      <span className="text-text-tertiary text-xs">
                        by {entry.changedBy?.name}
                      </span>
                    </div>
                    {entry.notes && (
                      <p className="text-text-secondary mt-1 text-xs">{entry.notes}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Care Team Members Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-text-secondary" />
              <CardTitle className="text-lg">Care Team</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {careTeam?.totalCount || 0} members
              </Badge>
            </div>
            {canEdit && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setIsAddingMember(!isAddingMember)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Member
              </Button>
            )}
          </div>
          <CardDescription>
            All providers and staff involved in this patient&apos;s care
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Add Member Form */}
          {isAddingMember && canEdit && (
            <div className="p-4 border border-border-primary rounded-lg space-y-3 bg-background-secondary mb-4">
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
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select role..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CARE_TEAM_ROLES.map(role => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={handleAddMember} disabled={!selectedRole}>
                    Add
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    setIsAddingMember(false);
                    setSelectedUserId('');
                    setSelectedRole('');
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
            {(!careTeam?.members || careTeam.members.length === 0) ? (
              <p className="text-sm text-text-secondary text-center py-4">
                No care team members yet.
              </p>
            ) : (
              careTeam.members.map((member: { 
                userId: string; 
                name: string; 
                role?: string; 
                avatar?: string;
                email?: string;
                careTeamRole?: string;
                source?: string;
              }) => {
                const isPrimary = primaryProvider?.primaryProvider?._id === member.userId;
                
                return (
                  <div 
                    key={member.userId} 
                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                      isPrimary 
                        ? 'bg-interactive-primary/5 border-interactive-primary/30' 
                        : 'bg-surface-elevated border-border-primary'
                    }`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={isPrimary ? 'bg-interactive-primary text-white' : ''}>
                        {getInitials(member.name || member.email || '')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-text-primary truncate">
                          {member.name || member.email}
                        </p>
                        {isPrimary && (
                          <Star className="h-4 w-4 text-interactive-primary fill-interactive-primary flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {member.careTeamRole && (
                          <Badge variant="outline" className="text-xs">
                            {member.careTeamRole}
                          </Badge>
                        )}
                        {member.source && (
                          <Badge variant="outline" className={`text-xs ${getSourceBadgeColor(member.source)}`}>
                            {member.source.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {canEdit && member.source === 'explicit' && !isPrimary && (
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Change Primary Provider Dialog */}
      <Dialog open={isChangePrimaryOpen} onOpenChange={setIsChangePrimaryOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {primaryProvider?.hasProvider ? 'Change Primary Provider' : 'Assign Primary Provider'}
            </DialogTitle>
            <DialogDescription>
              Select a new primary provider for this patient. This change will be logged for audit purposes.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Primary Provider</Label>
              <Select value={newPrimaryProviderId} onValueChange={setNewPrimaryProviderId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider..." />
                </SelectTrigger>
                <SelectContent>
                  {availableProviders.map(provider => (
                    <SelectItem 
                      key={provider._id} 
                      value={provider._id}
                      disabled={provider._id === primaryProvider?.primaryProvider?._id}
                    >
                      {provider.name || `${provider.firstName || ''} ${provider.lastName || ''}`.trim()} ({provider.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Reason for Change</Label>
              <Select value={changeReason} onValueChange={setChangeReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason..." />
                </SelectTrigger>
                <SelectContent>
                  {CHANGE_REASONS.map(reason => (
                    <SelectItem key={reason.value} value={reason.value}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any additional context..."
                value={changeNotes}
                onChange={(e) => setChangeNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePrimaryOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleChangePrimaryProvider}
              disabled={!newPrimaryProviderId || !changeReason}
            >
              {primaryProvider?.hasProvider ? 'Change Provider' : 'Assign Provider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

