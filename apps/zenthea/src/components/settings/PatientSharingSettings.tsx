'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, UserPlus, Trash2, Eye, Edit, Search, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PatientSharingSettingsProps {
  userId: Id<'users'>;
  tenantId: string;
}

/**
 * Patient Sharing Settings Component
 * 
 * Allows users to share specific patient access with other staff members.
 * Mirrors the CalendarSharingSettings pattern.
 */
export function PatientSharingSettings({ userId, tenantId }: PatientSharingSettingsProps) {
  const { data: session } = useSession();
  
  // Patient selection state
  const [selectedPatientId, setSelectedPatientId] = useState<string>('');
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientSearchOpen, setIsPatientSearchOpen] = useState(false);
  
  // User selection state
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');
  const [isUserSearchOpen, setIsUserSearchOpen] = useState(false);
  
  const [selectedPermission, setSelectedPermission] = useState<'view' | 'edit'>('view');
  const [highlightedPatientIndex, setHighlightedPatientIndex] = useState(-1);
  const [highlightedUserIndex, setHighlightedUserIndex] = useState(-1);
  
  const patientSearchRef = useRef<HTMLInputElement>(null);
  const userSearchRef = useRef<HTMLInputElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  
  const [patientDropdownPosition, setPatientDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  const [userDropdownPosition, setUserDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  // Use session tenantId as source of truth
  const currentUserTenantId = session?.user?.tenantId;
  const validTenantId = currentUserTenantId || tenantId;

  // Get user's accessible patients
  const accessiblePatients = useQuery(
    api.dataAccess.getAccessiblePatients,
    userId && validTenantId ? { userId, tenantId: validTenantId, limit: 100 } : 'skip'
  );

  // Get users in the tenant (for sharing)
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    validTenantId ? { tenantId: validTenantId } : 'skip'
  );

  // Get existing patient shares
  const patientShares = useQuery(
    api.patientShares.getSharedPatients,
    userId && validTenantId ? { userId, tenantId: validTenantId } : 'skip'
  );

  // Mutations
  const sharePatient = useMutation(api.patientShares.sharePatient);
  const revokeShare = useMutation(api.patientShares.revokePatientShare);
  const updatePermission = useMutation(api.patientShares.updatePatientSharePermission);

  // Filter patients by search
  const filteredPatients = useMemo(() => {
    if (!accessiblePatients?.patients) return [];
    
    return accessiblePatients.patients.filter((item: { patient?: { firstName?: string; lastName?: string; email?: string; [key: string]: unknown } | null; [key: string]: unknown }) => {
      if (!item.patient) return false;
      const patient = item.patient;
      const fullName = `${patient.firstName || ''} ${patient.lastName || ''}`.toLowerCase();
      const matchesSearch = !patientSearch || 
        fullName.includes(patientSearch.toLowerCase()) ||
        (typeof patient.email === 'string' && patient.email.toLowerCase().includes(patientSearch.toLowerCase()));
      return matchesSearch;
    });
  }, [accessiblePatients, patientSearch]);

  // Filter users (only staff, not patients)
  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !validTenantId || !selectedPatientId) return [];
    
    const companyEmployeeRoles = ['admin', 'provider', 'clinic_user', 'demo', 'super_admin'];
    
    return tenantUsers.filter(user => {
      if (user.tenantId !== validTenantId) return false;
      if (user.role === 'patient') return false;
      if (!companyEmployeeRoles.includes(user.role)) return false;
      if (user._id === userId) return false; // Can't share with yourself
      
      const matchesSearch = !userSearch || 
        user.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(userSearch.toLowerCase());
      
      return matchesSearch;
    });
  }, [tenantUsers, userId, userSearch, validTenantId, selectedPatientId]);

  // Update dropdown positions
  const updatePatientDropdownPosition = () => {
    if (patientSearchRef.current) {
      const rect = patientSearchRef.current.getBoundingClientRect();
      setPatientDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  const updateUserDropdownPosition = () => {
    if (userSearchRef.current) {
      const rect = userSearchRef.current.getBoundingClientRect();
      setUserDropdownPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Handle dropdown open/close effects
  useEffect(() => {
    if (isPatientSearchOpen) {
      updatePatientDropdownPosition();
      const handleScroll = () => updatePatientDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isPatientSearchOpen, patientSearch]);

  useEffect(() => {
    if (isUserSearchOpen) {
      updateUserDropdownPosition();
      const handleScroll = () => updateUserDropdownPosition();
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleScroll);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleScroll);
      };
    }
  }, [isUserSearchOpen, userSearch]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        patientSearchRef.current && 
        patientDropdownRef.current &&
        !patientSearchRef.current.contains(event.target as Node) &&
        !patientDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPatientSearchOpen(false);
      }
      if (
        userSearchRef.current && 
        userDropdownRef.current &&
        !userSearchRef.current.contains(event.target as Node) &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setIsUserSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePatientSelect = (patientId: string) => {
    setSelectedPatientId(patientId);
    setIsPatientSearchOpen(false);
    setPatientSearch('');
    setHighlightedPatientIndex(-1);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsUserSearchOpen(false);
    setUserSearch('');
    setHighlightedUserIndex(-1);
  };

  const handleShare = async () => {
    if (!selectedPatientId || !selectedUserId) {
      toast.error('Please select both a patient and a user to share with');
      return;
    }

    try {
      await sharePatient({
        ownerUserId: userId,
        patientId: selectedPatientId as Id<'patients'>,
        sharedWithUserId: selectedUserId as Id<'users'>,
        permission: selectedPermission,
        tenantId: validTenantId,
      });
      
      toast.success('Patient access shared successfully');
      setSelectedPatientId('');
      setSelectedUserId('');
      setSelectedPermission('view');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share patient access');
    }
  };

  const handleRevoke = async (patientId: Id<'patients'>, sharedWithUserId: Id<'users'>) => {
    try {
      await revokeShare({
        ownerUserId: userId,
        patientId,
        sharedWithUserId,
        tenantId: validTenantId,
      });
      toast.success('Patient access revoked');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke access');
    }
  };

  const handleUpdatePermission = async (
    patientId: Id<'patients'>, 
    sharedWithUserId: Id<'users'>, 
    newPermission: 'view' | 'edit'
  ) => {
    try {
      await updatePermission({
        ownerUserId: userId,
        patientId,
        sharedWithUserId,
        permission: newPermission,
        tenantId: validTenantId,
      });
      toast.success('Permission updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update permission');
    }
  };

  // Get selected patient details
  const selectedPatient = useMemo(() => {
    if (!selectedPatientId || !accessiblePatients?.patients) return null;
    const item = accessiblePatients.patients.find((p: { patientId: string; [key: string]: unknown }) => p.patientId === selectedPatientId);
    return item?.patient || null;
  }, [selectedPatientId, accessiblePatients]);

  // Get selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId || !tenantUsers) return null;
    return tenantUsers.find((u: any) => u._id === selectedUserId) || null;
  }, [selectedUserId, tenantUsers]);

  return (
    <Card className="overflow-visible">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Patient Sharing
        </CardTitle>
        <CardDescription>
          Share access to specific patients with other staff members. They will be able to view 
          or edit patient records based on the permission you grant.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6 overflow-visible">
        {/* Add new share */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Share Patient Access
          </h3>
          
          {/* Patient Selection */}
          <div className="space-y-2">
            <label className="text-sm text-text-secondary">Select Patient</label>
            <div className="relative" style={{ zIndex: isPatientSearchOpen ? 100 : 'auto' }}>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none z-10" />
              <Input
                ref={patientSearchRef}
                placeholder="Search patients..."
                value={selectedPatient ? `${selectedPatient.firstName} ${selectedPatient.lastName}` : patientSearch}
                onChange={(e) => {
                  setPatientSearch(e.target.value);
                  setSelectedPatientId('');
                }}
                onFocus={() => {
                  setIsPatientSearchOpen(true);
                  setHighlightedPatientIndex(-1);
                  updatePatientDropdownPosition();
                }}
                className="pl-10"
              />
              
              {isPatientSearchOpen && filteredPatients.length > 0 && patientDropdownPosition && typeof window !== 'undefined' && createPortal(
                <div
                  ref={patientDropdownRef}
                  className="fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]"
                  style={{
                    top: `${patientDropdownPosition.top}px`,
                    left: `${patientDropdownPosition.left}px`,
                    width: `${patientDropdownPosition.width}px`,
                  }}
                >
                  {filteredPatients.map((item: { patient?: { firstName?: string; lastName?: string; email?: string; [key: string]: unknown } | null; patientId?: string; [key: string]: unknown }, index: number) => {
                    const patient = item.patient;
                    if (!patient) return null;
                    const patientId = item.patientId as string | undefined;
                    if (!patientId) return null;
                    return (
                      <button
                        key={patientId}
                        type="button"
                        onClick={() => handlePatientSelect(patientId)}
                        onMouseEnter={() => setHighlightedPatientIndex(index)}
                        className={`w-full text-left px-4 py-2 transition-colors cursor-pointer ${
                          highlightedPatientIndex === index
                            ? 'bg-surface-interactive'
                            : 'hover:bg-surface-interactive'
                        }`}
                      >
                        <div className="font-medium text-text-primary">
                          {patient.firstName} {patient.lastName}
                        </div>
                        {patient.email && typeof patient.email === 'string' && (
                          <div className="text-sm text-text-secondary">{patient.email}</div>
                        )}
                      </button>
                    );
                  })}
                </div>,
                document.body
              )}
            </div>
          </div>

          {/* User Selection (only shown after patient selected) */}
          {selectedPatientId && (
            <div className="space-y-2">
              <label className="text-sm text-text-secondary">Share With</label>
              <div className="relative" style={{ zIndex: isUserSearchOpen ? 100 : 'auto' }}>
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none z-10" />
                <Input
                  ref={userSearchRef}
                  placeholder="Search staff members..."
                  value={selectedUser ? (selectedUser.name || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()) : userSearch}
                  onChange={(e) => {
                    setUserSearch(e.target.value);
                    setSelectedUserId('');
                  }}
                  onFocus={() => {
                    setIsUserSearchOpen(true);
                    setHighlightedUserIndex(-1);
                    updateUserDropdownPosition();
                  }}
                  className="pl-10"
                />
                
                {isUserSearchOpen && filteredUsers.length > 0 && userDropdownPosition && typeof window !== 'undefined' && createPortal(
                  <div
                    ref={userDropdownRef}
                    className="fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]"
                    style={{
                      top: `${userDropdownPosition.top}px`,
                      left: `${userDropdownPosition.left}px`,
                      width: `${userDropdownPosition.width}px`,
                    }}
                  >
                    {filteredUsers.map((user: any, index: number) => (
                      <button
                        key={user._id}
                        type="button"
                        onClick={() => handleUserSelect(user._id)}
                        onMouseEnter={() => setHighlightedUserIndex(index)}
                        className={`w-full text-left px-4 py-2 transition-colors cursor-pointer ${
                          highlightedUserIndex === index
                            ? 'bg-surface-interactive'
                            : 'hover:bg-surface-interactive'
                        }`}
                      >
                        <div className="font-medium text-text-primary">
                          {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                        </div>
                        <div className="text-sm text-text-secondary">{user.email}</div>
                      </button>
                    ))}
                  </div>,
                  document.body
                )}
              </div>
            </div>
          )}

          {/* Permission and Share Button */}
          {selectedPatientId && selectedUserId && (
            <div className="flex gap-2">
              <Select value={selectedPermission} onValueChange={(value: 'view' | 'edit') => setSelectedPermission(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      View
                    </div>
                  </SelectItem>
                  <SelectItem value="edit">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4" />
                      Edit
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              <Button onClick={handleShare} className="flex-1">
                Share Patient Access
              </Button>
            </div>
          )}
        </div>

        {/* Existing shares */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Patients You&apos;ve Shared</h3>
          
          {patientShares === undefined ? (
            <div className="flex items-center gap-2 text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading...</span>
            </div>
          ) : patientShares.length === 0 ? (
            <p className="text-sm text-text-secondary">
              You haven&apos;t shared any patients yet.
            </p>
          ) : (
            <div className="space-y-2">
              {patientShares.map((share: { patient?: { firstName?: string; lastName?: string; [key: string]: unknown } | null; owner?: { name?: string; email?: string; [key: string]: unknown } | null; [key: string]: unknown }) => {
                const patient = share.patient;
                const sharedWith = share.owner; // This is actually the sharedWith user due to query perspective
                if (!patient) return null;

                const shareId = (share as { _id?: string })._id || String(Math.random());
                const permission = (share as { permission?: string }).permission || 'view';
                return (
                  <div
                    key={shareId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-text-secondary" />
                        <span className="font-medium">
                          {patient.firstName} {patient.lastName}
                        </span>
                      </div>
                      {sharedWith && (
                        <div className="text-sm text-text-secondary mt-1">
                          Shared with: {(sharedWith as { name?: string; email?: string }).name || (sharedWith as { name?: string; email?: string }).email}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {permission}
                      </Badge>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevoke(
                          share.patientId as Id<'patients'>,
                          share.sharedWithUserId as Id<'users'>
                        )}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

