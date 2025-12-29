'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation } from 'convex/react';
import { useSession } from 'next-auth/react';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Forward, Search, Loader2, User } from 'lucide-react';
import { toast } from 'sonner';

interface MessageAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  messageId: Id<'messages'>;
  messageSubject?: string;
  tenantId: string;
}

/**
 * Modal for assigning messages to other staff members
 * 
 * Used when a user needs to delegate a message response to a colleague.
 * Creates an audit trail for HIPAA compliance.
 */
export function MessageAssignmentModal({
  isOpen,
  onClose,
  messageId,
  messageSubject,
  tenantId,
}: MessageAssignmentModalProps) {
  const { data: session } = useSession();
  const userId = session?.user?.id as Id<'users'> | undefined;
  
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notes, setNotes] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get users in the tenant
  const tenantUsers = useQuery(
    api.users.getUsersByTenant,
    tenantId ? { tenantId } : 'skip'
  );

  // Mutation
  const assignMessage = useMutation(api.messageAssignments.assignMessage);

  // Filter users (only staff, not patients, not self)
  const filteredUsers = useMemo(() => {
    if (!tenantUsers || !userId) return [];
    
    const companyEmployeeRoles = ['admin', 'provider', 'clinic_user', 'demo', 'super_admin'];
    
    return tenantUsers.filter(user => {
      if (user.tenantId !== tenantId) return false;
      if (user.role === 'patient') return false;
      if (!companyEmployeeRoles.includes(user.role)) return false;
      if (user._id === userId) return false;
      
      const matchesSearch = !searchQuery || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [tenantUsers, userId, searchQuery, tenantId]);

  // Selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId || !tenantUsers) return null;
    return tenantUsers.find(u => u._id === selectedUserId) || null;
  }, [selectedUserId, tenantUsers]);

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

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedUserId('');
      setSearchQuery('');
      setNotes('');
      setIsSearchOpen(false);
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    setIsSearchOpen(false);
    setSearchQuery('');
    setHighlightedIndex(-1);
  };

  const handleSubmit = async () => {
    if (!selectedUserId || !userId) {
      toast.error('Please select a user to assign the message to');
      return;
    }

    setIsSubmitting(true);
    try {
      await assignMessage({
        messageId,
        assignedBy: userId,
        assignedTo: selectedUserId as Id<'users'>,
        notes: notes.trim() || undefined,
        tenantId,
      });
      
      toast.success('Message assigned successfully');
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign message');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Forward className="h-5 w-5" />
            Assign Message
          </DialogTitle>
          <DialogDescription>
            Assign this message to a colleague for response. They will be able to respond on your behalf.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Message Subject Preview */}
          {messageSubject && (
            <div className="p-3 bg-background-secondary rounded-lg">
              <p className="text-sm text-text-secondary">Message:</p>
              <p className="text-sm font-medium truncate">{messageSubject}</p>
            </div>
          )}

          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assign To</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-text-secondary pointer-events-none z-10" />
              <Input
                ref={searchInputRef}
                id="assignee"
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
                  className="fixed bg-surface-elevated border border-border-primary rounded-md shadow-lg max-h-60 overflow-y-auto z-[9999]"
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
                      className={`w-full text-left px-4 py-2 transition-colors cursor-pointer ${
                        highlightedIndex === index
                          ? 'bg-surface-interactive'
                          : 'hover:bg-surface-interactive'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-text-secondary" />
                        <div>
                          <div className="font-medium text-text-primary">
                            {user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}
                          </div>
                          <div className="text-sm text-text-secondary">{user.email}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>,
                document.body
              )}
            </div>
            
            {isSearchOpen && filteredUsers.length === 0 && searchQuery && (
              <p className="text-sm text-text-secondary">No staff members found.</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add context or instructions for the assignee..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-text-secondary">
              {notes.length}/500 characters
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedUserId || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <Forward className="mr-2 h-4 w-4" />
                Assign Message
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

