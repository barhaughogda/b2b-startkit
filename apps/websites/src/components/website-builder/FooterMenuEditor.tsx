'use client';

/**
 * FooterMenuEditor Component
 *
 * A comprehensive editor for v2 footer menu columns with sections.
 * Allows managing columns, sections within columns, and items (page links or external links).
 */

import React, { useState, useCallback, useId } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  GripVertical,
  FileText,
  ExternalLink,
  Columns3,
  LayoutList,
} from 'lucide-react';
import type {
  FooterMenuColumn,
  FooterMenuSection,
  FooterMenuItem,
  PageConfig,
} from '@/lib/website-builder/schema';
import {
  createDefaultMenuColumnsFromPages,
  pruneFooterMenuForPages,
} from '@/lib/website-builder/footer-utils';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

interface FooterMenuEditorProps {
  /** Current v2 menu columns (if any) */
  menuColumns?: FooterMenuColumn[];
  /** Callback when menu columns change */
  onMenuColumnsChange: (columns: FooterMenuColumn[]) => void;
  /** All pages (for selecting page items) */
  pages: PageConfig[];
  /** Whether the editor is disabled */
  disabled?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getAvailablePages(pages: PageConfig[]): PageConfig[] {
  return pages.filter(p => p.enabled && p.showInFooter);
}

// =============================================================================
// ITEM EDITOR
// =============================================================================

interface MenuItemEditorProps {
  item: FooterMenuItem;
  pages: PageConfig[];
  onUpdate: (item: FooterMenuItem) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function MenuItemEditor({
  item,
  pages,
  onUpdate,
  onRemove,
  disabled,
}: MenuItemEditorProps) {
  const availablePages = getAvailablePages(pages);
  const pageMap = new Map(pages.map(p => [p.id, p]));

  if (item.kind === 'page') {
    const page = pageMap.get(item.pageId);
    const displayLabel = page?.title || 'Unknown Page';
    const isPageValid = page && page.enabled && page.showInFooter;

    return (
      <div className="flex items-center gap-2 p-2 bg-surface-secondary rounded-lg">
        <FileText className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        <Select
          value={item.pageId}
          onValueChange={(pageId) => onUpdate({ ...item, pageId })}
          disabled={disabled}
        >
          <SelectTrigger className="h-8 flex-1 text-sm">
            <SelectValue placeholder="Select page">
              <span className={cn(!isPageValid && 'text-status-error')}>
                {displayLabel}
                {!isPageValid && ' (invalid)'}
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {availablePages.map((page) => (
              <SelectItem key={page.id} value={page.id}>
                {page.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-8 w-8 text-text-tertiary hover:text-status-error flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  // External link item
  return (
    <div className="flex flex-col gap-2 p-3 bg-surface-secondary rounded-lg">
      <div className="flex items-center gap-2">
        <ExternalLink className="w-4 h-4 text-text-tertiary flex-shrink-0" />
        <Input
          value={item.label}
          onChange={(e) => onUpdate({ ...item, label: e.target.value })}
          placeholder="Link text"
          disabled={disabled}
          className="h-8 text-sm flex-1"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          disabled={disabled}
          className="h-8 w-8 text-text-tertiary hover:text-status-error flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2 pl-6">
        <Input
          value={item.url}
          onChange={(e) => onUpdate({ ...item, url: e.target.value })}
          placeholder="https://example.com"
          disabled={disabled}
          className="h-8 text-sm flex-1"
        />
        <label className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
          <Switch
            checked={item.openInNewTab ?? true}
            onCheckedChange={(openInNewTab) => onUpdate({ ...item, openInNewTab })}
            disabled={disabled}
            className="scale-75"
          />
          <span>New tab</span>
        </label>
      </div>
    </div>
  );
}

// =============================================================================
// SECTION EDITOR
// =============================================================================

interface SectionEditorProps {
  section: FooterMenuSection;
  pages: PageConfig[];
  onUpdate: (section: FooterMenuSection) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function SectionEditor({
  section,
  pages,
  onUpdate,
  onRemove,
  disabled,
}: SectionEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  const availablePages = getAvailablePages(pages);

  const handleTitleChange = (title: string) => {
    onUpdate({ ...section, title });
  };

  const handleItemUpdate = (index: number, item: FooterMenuItem) => {
    const items = [...section.items];
    items[index] = item;
    onUpdate({ ...section, items });
  };

  const handleItemRemove = (index: number) => {
    const items = section.items.filter((_, i) => i !== index);
    onUpdate({ ...section, items });
  };

  const handleAddPageItem = () => {
    // Find first available page not already in section
    const usedPageIds = new Set(
      section.items
        .filter((item): item is Extract<FooterMenuItem, { kind: 'page' }> => item.kind === 'page')
        .map(item => item.pageId)
    );
    const firstAvailable = availablePages.find(p => !usedPageIds.has(p.id));
    
    if (!firstAvailable) return;

    const newItem: FooterMenuItem = {
      id: generateId('page-item'),
      kind: 'page',
      pageId: firstAvailable.id,
    };
    onUpdate({ ...section, items: [...section.items, newItem] });
  };

  const handleAddExternalItem = () => {
    const newItem: FooterMenuItem = {
      id: generateId('external-item'),
      kind: 'external',
      label: '',
      url: '',
      openInNewTab: true,
    };
    onUpdate({ ...section, items: [...section.items, newItem] });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border-primary rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 bg-surface-secondary cursor-pointer hover:bg-surface-interactive transition-colors">
            <GripVertical className="w-4 h-4 text-text-tertiary" />
            <LayoutList className="w-4 h-4 text-text-secondary" />
            <Input
              value={section.title}
              onChange={(e) => {
                e.stopPropagation();
                handleTitleChange(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              placeholder="Section title"
              disabled={disabled}
              className="h-7 text-sm font-medium flex-1"
            />
            <span className="text-xs text-text-tertiary">
              {section.items.length} item{section.items.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={disabled}
              className="h-7 w-7 text-text-tertiary hover:text-status-error"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-2 border-t border-border-primary">
            {section.items.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-2">
                No items in this section
              </p>
            ) : (
              section.items.map((item, index) => (
                <MenuItemEditor
                  key={item.id}
                  item={item}
                  pages={pages}
                  onUpdate={(updated) => handleItemUpdate(index, updated)}
                  onRemove={() => handleItemRemove(index)}
                  disabled={disabled}
                />
              ))
            )}

            {/* Add item buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddPageItem}
                disabled={disabled || availablePages.length === 0}
                className="flex-1 text-xs h-8"
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                Add Page
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddExternalItem}
                disabled={disabled}
                className="flex-1 text-xs h-8"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                Add Link
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =============================================================================
// COLUMN EDITOR
// =============================================================================

interface ColumnEditorProps {
  column: FooterMenuColumn;
  columnIndex: number;
  totalColumns: number;
  pages: PageConfig[];
  onUpdate: (column: FooterMenuColumn) => void;
  onRemove: () => void;
  disabled?: boolean;
}

function ColumnEditor({
  column,
  columnIndex,
  totalColumns,
  pages,
  onUpdate,
  onRemove,
  disabled,
}: ColumnEditorProps) {
  const [isOpen, setIsOpen] = useState(true);

  const handleSectionUpdate = (index: number, section: FooterMenuSection) => {
    const sections = [...column.sections];
    sections[index] = section;
    onUpdate({ ...column, sections });
  };

  const handleSectionRemove = (index: number) => {
    const sections = column.sections.filter((_, i) => i !== index);
    onUpdate({ ...column, sections });
  };

  const handleAddSection = () => {
    const newSection: FooterMenuSection = {
      id: generateId('section'),
      title: 'New Section',
      items: [],
    };
    onUpdate({ ...column, sections: [...column.sections, newSection] });
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border border-border-primary rounded-lg overflow-hidden">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 bg-background-primary cursor-pointer hover:bg-surface-secondary transition-colors">
            <Columns3 className="w-4 h-4 text-text-secondary" />
            <span className="font-medium text-sm flex-1">
              Column {columnIndex + 1}
            </span>
            <span className="text-xs text-text-tertiary">
              {column.sections.length} section{column.sections.length !== 1 ? 's' : ''}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={disabled || totalColumns <= 1}
              className="h-7 w-7 text-text-tertiary hover:text-status-error"
              title={totalColumns <= 1 ? 'Cannot remove last column' : 'Remove column'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
            {isOpen ? (
              <ChevronUp className="w-4 h-4 text-text-tertiary" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-tertiary" />
            )}
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 space-y-3 border-t border-border-primary bg-surface-secondary/50">
            {column.sections.length === 0 ? (
              <p className="text-xs text-text-tertiary text-center py-4">
                No sections in this column
              </p>
            ) : (
              column.sections.map((section, index) => (
                <SectionEditor
                  key={section.id}
                  section={section}
                  pages={pages}
                  onUpdate={(updated) => handleSectionUpdate(index, updated)}
                  onRemove={() => handleSectionRemove(index)}
                  disabled={disabled}
                />
              ))
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleAddSection}
              disabled={disabled}
              className="w-full text-xs h-8 border-dashed"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Add Section
            </Button>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function FooterMenuEditor({
  menuColumns = [],
  onMenuColumnsChange,
  pages,
  disabled,
}: FooterMenuEditorProps) {
  const MAX_COLUMNS = 4;

  const handleColumnUpdate = (index: number, column: FooterMenuColumn) => {
    const columns = [...menuColumns];
    columns[index] = column;
    onMenuColumnsChange(columns);
  };

  const handleColumnRemove = (index: number) => {
    const columns = menuColumns.filter((_, i) => i !== index);
    // Re-assign layout orders
    const reordered = columns.map((col, i) => ({ ...col, layoutOrder: i }));
    onMenuColumnsChange(reordered);
  };

  const handleAddColumn = () => {
    if (menuColumns.length >= MAX_COLUMNS) return;

    const newColumn: FooterMenuColumn = {
      id: generateId('column'),
      layoutOrder: menuColumns.length,
      sections: [
        {
          id: generateId('section'),
          title: 'New Section',
          items: [],
        },
      ],
    };
    onMenuColumnsChange([...menuColumns, newColumn]);
  };

  const handleInitializeFromPages = () => {
    const defaultColumns = createDefaultMenuColumnsFromPages(pages);
    if (defaultColumns.length > 0) {
      onMenuColumnsChange(defaultColumns);
    }
  };

  const availablePages = getAvailablePages(pages);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Columns3 className="w-4 h-4" />
          Footer Menu Sections
        </CardTitle>
        <p className="text-xs text-text-tertiary mt-1">
          Organize your footer links into columns and sections
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {menuColumns.length === 0 ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-sm text-text-tertiary">
              No menu columns configured yet
            </p>
            {availablePages.length > 0 ? (
              <Button
                variant="outline"
                onClick={handleInitializeFromPages}
                disabled={disabled}
                className="mx-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Initialize from Pages
              </Button>
            ) : (
              <p className="text-xs text-text-tertiary">
                Enable pages with &quot;Show in Footer&quot; to add them here
              </p>
            )}
          </div>
        ) : (
          <>
            {menuColumns
              .sort((a, b) => a.layoutOrder - b.layoutOrder)
              .map((column, index) => (
                <ColumnEditor
                  key={column.id}
                  column={column}
                  columnIndex={index}
                  totalColumns={menuColumns.length}
                  pages={pages}
                  onUpdate={(updated) => handleColumnUpdate(index, updated)}
                  onRemove={() => handleColumnRemove(index)}
                  disabled={disabled}
                />
              ))}
          </>
        )}

        {menuColumns.length > 0 && menuColumns.length < MAX_COLUMNS && (
          <Button
            variant="outline"
            onClick={handleAddColumn}
            disabled={disabled}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Column
          </Button>
        )}

        {menuColumns.length >= MAX_COLUMNS && (
          <p className="text-xs text-text-tertiary text-center">
            Maximum {MAX_COLUMNS} columns allowed
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default FooterMenuEditor;

