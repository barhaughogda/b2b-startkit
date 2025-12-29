'use client';

/**
 * PageManager Component
 * 
 * Manages website pages including:
 * - Toggle standard pages on/off
 * - Add/remove custom pages
 * - Configure page visibility in header/footer
 * - Navigate to page editor
 */

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  type PageConfig,
  type PageType,
  PAGE_METADATA,
  MAX_CUSTOM_PAGES,
  canAddCustomPage,
} from '@/lib/website-builder/schema';
import { cn } from '@/lib/utils';
import {
  Home,
  Heart,
  Users,
  MapPin,
  Phone,
  FileText,
  Shield,
  Plus,
  Trash2,
  GripVertical,
  Edit3,
  Lock,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface PageManagerProps {
  pages: PageConfig[];
  onPagesChange: (pages: PageConfig[]) => void;
  onEditPage?: (pageId: string) => void;
  disabled?: boolean;
}

// =============================================================================
// ICON MAP
// =============================================================================

const pageIcons: Record<PageType, React.ComponentType<{ className?: string }>> = {
  home: Home,
  services: Heart,
  team: Users,
  locations: MapPin,
  contact: Phone,
  custom: FileText,
  terms: FileText,
  privacy: Shield,
};

// =============================================================================
// PAGE CARD COMPONENT
// =============================================================================

interface PageCardProps {
  page: PageConfig;
  onToggleEnabled: (enabled: boolean) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  disabled?: boolean;
}

function PageCard({
  page,
  onToggleEnabled,
  onEdit,
  onDelete,
  disabled,
}: PageCardProps) {
  const metadata = PAGE_METADATA[page.type];
  const Icon = pageIcons[page.type];
  const canDisable = metadata.canDisable;
  const canDelete = metadata.canDelete;

  return (
    <Card
      className={cn(
        'relative transition-all duration-200',
        page.enabled ? 'border-border-primary' : 'border-border-primary/50 opacity-60',
        disabled && 'opacity-50 pointer-events-none'
      )}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle (for future drag-to-reorder) */}
          <div className="mt-1 text-text-tertiary cursor-grab">
            <GripVertical className="w-4 h-4" />
          </div>

          {/* Page Icon */}
          <div
            className={cn(
              'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
              page.enabled
                ? 'bg-interactive-primary/10 text-interactive-primary'
                : 'bg-surface-secondary text-text-tertiary'
            )}
          >
            <Icon className="w-5 h-5" />
          </div>

          {/* Page Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-medium text-text-primary truncate">
                {page.title}
              </h4>
              {page.type === 'custom' && (
                <Badge variant="secondary" className="text-xs">
                  Custom
                </Badge>
              )}
              {(page.type === 'terms' || page.type === 'privacy') && (
                <Badge variant="outline" className="text-xs">
                  Legal
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-tertiary mt-0.5">
              /{page.slug || '(home)'}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Edit Button */}
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onEdit}
                disabled={disabled}
                className="h-8 w-8"
                title="Edit page content"
              >
                <Edit3 className="w-4 h-4" />
              </Button>
            )}

            {/* Delete Button (custom pages only) */}
            {canDelete && onDelete && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onDelete}
                disabled={disabled}
                className="h-8 w-8 text-status-error hover:text-status-error hover:bg-status-error/10"
                title="Delete page"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}

            {/* Enable/Disable Toggle */}
            {canDisable ? (
              <Switch
                checked={page.enabled}
                onCheckedChange={onToggleEnabled}
                disabled={disabled}
              />
            ) : (
              <div className="w-9 h-5 flex items-center justify-center text-text-tertiary" title="This page cannot be disabled">
                <Lock className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// ADD CUSTOM PAGE DIALOG
// =============================================================================

interface AddPageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (title: string, slug: string) => void;
  existingSlugs: string[];
}

function AddPageDialog({ open, onOpenChange, onAdd, existingSlugs }: AddPageDialogProps) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    // Auto-generate slug from title
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    setSlug(autoSlug);
    setError(null);
  };

  const handleSlugChange = (value: string) => {
    const cleanSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '')
      .replace(/^-|-$/g, '');
    setSlug(cleanSlug);
    setError(null);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      setError('Please enter a page title');
      return;
    }
    if (!slug.trim()) {
      setError('Please enter a page URL slug');
      return;
    }
    if (existingSlugs.includes(slug)) {
      setError('This URL is already in use');
      return;
    }

    onAdd(title.trim(), slug.trim());
    setTitle('');
    setSlug('');
    setError(null);
    onOpenChange(false);
  };

  const handleClose = () => {
    setTitle('');
    setSlug('');
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Custom Page</DialogTitle>
          <DialogDescription>
            Create a new custom page for your website. You can edit its content after creation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Page Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g., About Us"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="page-slug">URL Slug</Label>
            <div className="flex items-center gap-2">
              <span className="text-text-tertiary text-sm">/</span>
              <Input
                id="page-slug"
                value={slug}
                onChange={(e) => handleSlugChange(e.target.value)}
                placeholder="e.g., about-us"
                className="flex-1"
              />
            </div>
            <p className="text-xs text-text-tertiary">
              This will be the URL path for your page
            </p>
          </div>

          {error && (
            <p className="text-sm text-status-error">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Add Page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PageManager({
  pages,
  onPagesChange,
  onEditPage,
  disabled,
}: PageManagerProps) {
  const [showAddDialog, setShowAddDialog] = useState(false);

  // Group pages by type
  const homePage = pages.find(p => p.type === 'home');
  const standardPages = pages.filter(p => 
    ['services', 'team', 'locations', 'contact'].includes(p.type)
  );
  const customPages = pages.filter(p => p.type === 'custom');
  const legalPages = pages.filter(p => 
    ['terms', 'privacy'].includes(p.type)
  );

  const canAddMore = canAddCustomPage(pages);
  const existingSlugs = pages.map(p => p.slug);

  // Handlers
  const handleToggleEnabled = (pageId: string, enabled: boolean) => {
    const updatedPages = pages.map(p =>
      p.id === pageId ? { ...p, enabled } : p
    );
    onPagesChange(updatedPages);
  };

  const handleAddCustomPage = (title: string, slug: string) => {
    const newPage: PageConfig = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'custom',
      title,
      slug,
      enabled: true,
      showInHeader: true,
      showInFooter: false,
      blocks: [{
        id: `custom-text-${Date.now()}`,
        type: 'custom-text',
        enabled: true,
        props: {
          title: title,
          content: '',
          alignment: 'left',
          showTitle: true,
          backgroundColor: '#ffffff',
          textColor: '#000000',
          maxWidth: 'normal',
        },
      }],
      order: 50,
    };
    onPagesChange([...pages, newPage]);
  };

  const handleDeleteCustomPage = (pageId: string) => {
    const updatedPages = pages.filter(p => p.id !== pageId);
    onPagesChange(updatedPages);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-text-primary mb-1">
          Website Pages
        </h3>
        <p className="text-sm text-text-secondary">
          Enable or disable pages on your website. Configure navigation visibility in Header and Footer block settings.
        </p>
      </div>

      {/* Standard Pages Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Standard Pages
        </h4>
        <div className="space-y-2">
          {standardPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onToggleEnabled={(enabled) => handleToggleEnabled(page.id, enabled)}
              onEdit={onEditPage ? () => onEditPage(page.id) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Custom Pages Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
            Custom Pages
          </h4>
          <span className="text-xs text-text-tertiary">
            {customPages.length} of {MAX_CUSTOM_PAGES}
          </span>
        </div>
        
        <div className="space-y-2">
          {customPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onToggleEnabled={(enabled) => handleToggleEnabled(page.id, enabled)}
              onEdit={onEditPage ? () => onEditPage(page.id) : undefined}
              onDelete={() => handleDeleteCustomPage(page.id)}
              disabled={disabled}
            />
          ))}

          {/* Add Custom Page Button */}
          {canAddMore && (
            <Button
              variant="outline"
              className="w-full border-dashed"
              onClick={() => setShowAddDialog(true)}
              disabled={disabled}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Custom Page
            </Button>
          )}

          {!canAddMore && customPages.length > 0 && (
            <p className="text-xs text-text-tertiary text-center py-2">
              Maximum number of custom pages reached
            </p>
          )}
        </div>
      </div>

      {/* Legal Pages Section */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-text-secondary uppercase tracking-wide">
          Legal Pages
        </h4>
        <p className="text-xs text-text-tertiary">
          These pages are required and cannot be disabled. You can edit their content.
        </p>
        <div className="space-y-2">
          {legalPages.map((page) => (
            <PageCard
              key={page.id}
              page={page}
              onToggleEnabled={() => {}}
              onEdit={onEditPage ? () => onEditPage(page.id) : undefined}
              disabled={disabled}
            />
          ))}
        </div>
      </div>

      {/* Add Page Dialog */}
      <AddPageDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddCustomPage}
        existingSlugs={existingSlugs}
      />
    </div>
  );
}

export default PageManager;

