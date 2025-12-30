'use client';

/**
 * MigrationPrompt Component
 * 
 * Shows a prompt to migrate from legacy landingPage config to the new
 * website builder when appropriate.
 */

import React, { useState } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../../convex/_generated/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { 
  ArrowRight, 
  Sparkles, 
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface MigrationPromptProps {
  tenantId: string;
  userEmail: string;
  onMigrationComplete?: () => void;
  className?: string;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MigrationPrompt({
  tenantId,
  userEmail,
  onMigrationComplete,
  className,
}: MigrationPromptProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState<{
    success: boolean;
    blocksCreated?: number;
    error?: string;
  } | null>(null);

  // Check migration status
  const migrationStatus = useQuery((api as any).websiteBuilder.checkMigrationStatus, {
    tenantId,
  });

  // Migration mutation
  const migrate = useMutation((api as any).websiteBuilder.migrateFromLandingPage);

  // Don't show if already migrated or no legacy config
  if (!migrationStatus || !migrationStatus.needsMigration) {
    return null;
  }

  const handleMigrate = async () => {
    setIsMigrating(true);
    setMigrationResult(null);

    try {
      const result = await migrate({
        tenantId,
        preserveExisting: false,
        userEmail,
      });

      setMigrationResult({
        success: result.success,
        blocksCreated: result.blocksCreated,
      });

      if (result.success) {
        onMigrationComplete?.();
      }
    } catch (error) {
      setMigrationResult({
        success: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      });
    } finally {
      setIsMigrating(false);
      setShowConfirmDialog(false);
    }
  };

  // Show success state
  if (migrationResult?.success) {
    return (
      <Card className={cn('border-zenthea-teal/50 bg-zenthea-teal/5', className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-zenthea-teal/20 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-zenthea-teal" />
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Migration Complete!</h3>
              <p className="text-sm text-text-secondary">
                Successfully migrated {migrationResult.blocksCreated} blocks to the new website builder.
                You can now customize your site with the full builder experience.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show error state
  if (migrationResult && !migrationResult.success) {
    return (
      <Card className={cn('border-destructive/50 bg-destructive/5', className)}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-destructive/20 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary">Migration Failed</h3>
              <p className="text-sm text-text-secondary">
                {migrationResult.error || 'An error occurred during migration.'}
              </p>
            </div>
            <Button onClick={() => setMigrationResult(null)} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('border-amber-500/50 bg-amber-50 dark:bg-amber-950/20', className)}>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg">Upgrade to Website Builder</CardTitle>
              <CardDescription>
                Your existing landing page can be migrated to our new website builder
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              The new website builder offers:
            </p>
            <ul className="text-sm text-text-secondary space-y-1.5 ml-4">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zenthea-teal" />
                Drag-and-drop block editor
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zenthea-teal" />
                Multiple professional templates
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zenthea-teal" />
                Advanced theme customization
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zenthea-teal" />
                Version history and rollback
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-zenthea-teal" />
                Live preview
              </li>
            </ul>
          </div>
        </CardContent>
        <CardFooter className="flex gap-3">
          <Button 
            onClick={() => setShowConfirmDialog(true)}
            className="gap-2"
          >
            Migrate Now
            <ArrowRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Migrate to Website Builder?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will convert your existing landing page configuration to the new 
                website builder format. Your existing content will be preserved.
              </p>
              {migrationStatus.legacyEnabled && (
                <p className="text-amber-600 font-medium">
                  Your landing page is currently published. After migration, you can 
                  publish from the new builder to make changes live.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMigrating}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleMigrate}
              disabled={isMigrating}
              className="gap-2"
            >
              {isMigrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Migrating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Start Migration
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default MigrationPrompt;

