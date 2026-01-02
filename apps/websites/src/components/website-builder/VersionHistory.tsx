'use client';

/**
 * VersionHistory Component
 * 
 * Displays version history for the website builder with options to
 * preview, restore, and manage versions.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  History, 
  RotateCcw, 
  Trash2, 
  Tag, 
  Calendar,
  User,
  CheckCircle2,
  Clock,
  Save,
  Edit2,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

export interface VersionHistoryProps {
  tenantId: string;
  userId?: string;
  userEmail: string;
  onRestore?: (versionNumber: number) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function VersionHistory({
  tenantId,
  userId,
  userEmail,
  onRestore,
}: VersionHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editNote, setEditNote] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const [newSnapshotNote, setNewSnapshotNote] = useState('');

  // Queries
  const versions = useQuery((api as any).websiteBuilder.getVersionHistory, {
    tenantId,
    limit: 50,
  });

  // Mutations
  const createSnapshot = useMutation((api as any).websiteBuilder.createVersionSnapshot);
  const restoreVersion = useMutation((api as any).websiteBuilder.restoreVersion);
  const updateMetadata = useMutation((api as any).websiteBuilder.updateVersionMetadata);
  const deleteVersion = useMutation((api as any).websiteBuilder.deleteVersion);

  const handleCreateSnapshot = async () => {
    try {
      await createSnapshot({
        tenantId,
        label: newSnapshotLabel || undefined,
        note: newSnapshotNote || undefined,
        createdBy: userId,
        userEmail,
      });
      setIsCreatingSnapshot(false);
      setNewSnapshotLabel('');
      setNewSnapshotNote('');
    } catch (error) {
      logger.error('Failed to create snapshot:', error);
    }
  };

  const handleRestore = async (versionNumber: number) => {
    try {
      await restoreVersion({
        tenantId,
        versionNumber,
        createdBy: userId,
        userEmail,
      });
      onRestore?.(versionNumber);
    } catch (error) {
      logger.error('Failed to restore version:', error);
    }
  };

  const handleUpdateMetadata = async (versionNumber: number) => {
    try {
      await updateMetadata({
        tenantId,
        versionNumber,
        label: editLabel || undefined,
        note: editNote || undefined,
        userEmail,
      });
      setEditingVersionId(null);
      setEditLabel('');
      setEditNote('');
    } catch (error) {
      logger.error('Failed to update version metadata:', error);
    }
  };

  const handleDeleteVersion = async (versionNumber: number) => {
    try {
      await deleteVersion({
        tenantId,
        versionNumber,
        userEmail,
      });
    } catch (error) {
      logger.error('Failed to delete version:', error);
    }
  };

  const startEditing = (version: NonNullable<typeof versions>[0]) => {
    setEditingVersionId(version.versionNumber);
    setEditLabel(version.label || '');
    setEditNote(version.note || '');
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <History className="w-4 h-4" />
          Version History
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Version History
          </SheetTitle>
          <SheetDescription>
            View and restore previous versions of your website
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* Create Snapshot Button */}
          {!isCreatingSnapshot ? (
            <Button 
              onClick={() => setIsCreatingSnapshot(true)}
              className="w-full gap-2"
              variant="outline"
            >
              <Save className="w-4 h-4" />
              Save Current Version
            </Button>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Create Version Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="snapshot-label">Label (optional)</Label>
                  <Input
                    id="snapshot-label"
                    placeholder="e.g., Before rebrand"
                    value={newSnapshotLabel}
                    onChange={(e) => setNewSnapshotLabel(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="snapshot-note">Note (optional)</Label>
                  <Textarea
                    id="snapshot-note"
                    placeholder="Describe changes in this version..."
                    value={newSnapshotNote}
                    onChange={(e) => setNewSnapshotNote(e.target.value)}
                    rows={2}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateSnapshot} size="sm">
                    Save Snapshot
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIsCreatingSnapshot(false);
                      setNewSnapshotLabel('');
                      setNewSnapshotNote('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Version List */}
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-3 pr-4">
              {versions === undefined ? (
                // Loading state
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-4">
                        <div className="h-4 bg-surface-secondary rounded w-1/4 mb-2" />
                        <div className="h-3 bg-surface-secondary rounded w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : versions.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <Clock className="w-12 h-12 mx-auto text-text-tertiary mb-3" />
                    <p className="text-text-secondary">No version history yet</p>
                    <p className="text-sm text-text-tertiary">
                      Versions are created when you publish or save manually
                    </p>
                  </CardContent>
                </Card>
              ) : (
                versions.map((version: any) => (
                  <Card 
                    key={version._id}
                    className={cn(
                      'transition-all',
                      version.isPublished && 'border-zenthea-teal/50'
                    )}
                  >
                    <CardContent className="p-4">
                      {editingVersionId === version.versionNumber ? (
                        // Edit mode
                        <div className="space-y-3">
                          <div className="space-y-2">
                            <Label>Label</Label>
                            <Input
                              value={editLabel}
                              onChange={(e) => setEditLabel(e.target.value)}
                              placeholder="Version label"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Note</Label>
                            <Textarea
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Version notes"
                              rows={2}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm"
                              onClick={() => handleUpdateMetadata(version.versionNumber)}
                            >
                              Save
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setEditingVersionId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <>
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm font-medium">
                                v{version.version}
                              </span>
                              {version.isPublished && (
                                <Badge variant="secondary" className="text-xs bg-zenthea-teal/10 text-zenthea-teal">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Published
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => startEditing(version)}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </Button>
                              {!version.isPublished && (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Version?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        This will permanently delete version {version.version}.
                                        This action cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleDeleteVersion(version.versionNumber)}
                                        className="bg-destructive hover:bg-destructive/90"
                                      >
                                        Delete
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                            </div>
                          </div>

                          {version.label && (
                            <div className="flex items-center gap-1.5 text-sm text-text-primary mb-1">
                              <Tag className="w-3.5 h-3.5" />
                              {version.label}
                            </div>
                          )}

                          <div className="flex items-center gap-3 text-xs text-text-tertiary mb-2">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {formatDistanceToNow(version.createdAt, { addSuffix: true })}
                            </span>
                            {version.createdBy && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {version.createdBy}
                              </span>
                            )}
                          </div>

                          {version.note && (
                            <p className="text-xs text-text-secondary mb-3 line-clamp-2">
                              {version.note}
                            </p>
                          )}

                          {version.restoredFrom && (
                            <p className="text-xs text-amber-600 mb-3">
                              Auto-saved before restoring from v{version.restoredFrom}
                            </p>
                          )}

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="w-full gap-2">
                                <RotateCcw className="w-3.5 h-3.5" />
                                Restore This Version
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Restore Version {version.version}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Your current configuration will be saved as a new version
                                  before restoring. You can always restore it later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleRestore(version.versionNumber)}
                                >
                                  Restore
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default VersionHistory;

