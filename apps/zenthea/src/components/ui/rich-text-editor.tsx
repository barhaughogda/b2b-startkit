'use client';

/**
 * Rich Text Editor Component
 * 
 * A professional WYSIWYG rich text editor built with Tiptap for the website builder.
 * Supports:
 * - Bold, italic, underline formatting
 * - Headings (H1-H4) with distinct visual styling
 * - Text alignment (left, center, right)
 * - Links (add/edit/remove)
 * - Bullet lists and numbered lists
 * - Proper paragraph spacing and line breaks
 * 
 * Note: Block-level background color is handled in the CustomTextBlockEditor settings.
 */

import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import Link from '@tiptap/extension-link';
import { cn } from '@/lib/utils';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Type,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  ChevronDown,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link as LinkIcon,
  Unlink,
  List,
  ListOrdered,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

// =============================================================================
// CONSTANTS
// =============================================================================

export const EDITOR_MIN_HEIGHT = '150px';
export const EDITOR_MAX_HEIGHT = '300px';
export const EDITOR_SIDEBAR_MIN_HEIGHT = '200px';
export const EDITOR_SIDEBAR_MAX_HEIGHT = '400px';
export const MAX_CONTENT_LENGTH = 50000; // characters

// =============================================================================
// TYPES
// =============================================================================

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
  disabled?: boolean;
}

// =============================================================================
// TOOLBAR BUTTON COMPONENT
// =============================================================================

interface ToolbarButtonProps {
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  tooltip: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, isActive, disabled, tooltip, children }: ToolbarButtonProps) {
  // Use onMouseDown with preventDefault to preserve text selection when clicking toolbar buttons
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!disabled) {
      onClick();
    }
  };

  // Extract keyboard shortcut from tooltip if present (e.g., "Bold (Ctrl+B)" -> "Control+B")
  const ariaKeyshortcuts = tooltip.includes('Ctrl+') 
    ? tooltip.match(/Ctrl\+(\w+)/)?.[1] 
      ? `Control+${tooltip.match(/Ctrl\+(\w+)/)?.[1]}` 
      : undefined
    : undefined;

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onMouseDown={handleMouseDown}
            disabled={disabled}
            aria-label={tooltip.split('(')[0]?.trim() || ''}
            aria-keyshortcuts={ariaKeyshortcuts}
            aria-pressed={isActive}
            className={cn(
              'p-1.5 rounded-md transition-colors',
              'hover:bg-surface-secondary',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              isActive && 'bg-interactive-primary/10 text-interactive-primary'
            )}
          >
            {children}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// =============================================================================
// TOOLBAR DIVIDER
// =============================================================================

function ToolbarDivider() {
  return <div className="w-px h-5 bg-border-primary mx-1" />;
}

// =============================================================================
// HEADING DROPDOWN COMPONENT
// =============================================================================

interface HeadingDropdownProps {
  editor: ReturnType<typeof useEditor>;
  disabled?: boolean;
}

function HeadingDropdown({ editor, disabled }: HeadingDropdownProps) {
  // Store selection state before dropdown opens
  const selectionRef = useRef<{ from: number; to: number } | null>(null);
  
  if (!editor) return null;

  const getCurrentHeading = () => {
    if (editor.isActive('heading', { level: 1 })) return 'Heading 1';
    if (editor.isActive('heading', { level: 2 })) return 'Heading 2';
    if (editor.isActive('heading', { level: 3 })) return 'Heading 3';
    if (editor.isActive('heading', { level: 4 })) return 'Heading 4';
    return 'Paragraph';
  };

  // Save selection before opening dropdown
  const saveSelection = () => {
    if (editor) {
      const { from, to } = editor.state.selection;
      selectionRef.current = { from, to };
    }
  };

  // Apply heading with restored selection - synchronous like Bold/Italic buttons
  const applyHeading = (level: 1 | 2 | 3 | 4 | null) => {
    if (!editor) return;
    
    // Build the command chain - restore selection and apply heading in one atomic operation
    // This is similar to how Bold/Italic work (synchronous, single chain)
    const chain = editor.chain().focus();
    
    // Restore selection if saved
    if (selectionRef.current) {
      chain.setTextSelection(selectionRef.current);
    }
    
    // Apply the heading or paragraph
    if (level === null) {
      chain.setParagraph();
    } else {
      chain.toggleHeading({ level });
    }
    
    // Execute the command - this triggers Tiptap's onUpdate callback
    chain.run();
  };

  const headingOptions = [
    { label: 'Paragraph', icon: Pilcrow, level: null as null, className: 'text-sm' },
    { label: 'Heading 1', icon: Heading1, level: 1 as const, className: 'text-xl font-bold' },
    { label: 'Heading 2', icon: Heading2, level: 2 as const, className: 'text-lg font-bold' },
    { label: 'Heading 3', icon: Heading3, level: 3 as const, className: 'text-base font-semibold' },
    { label: 'Heading 4', icon: Heading4, level: 4 as const, className: 'text-sm font-semibold' },
  ];

  // Save selection on mousedown before dropdown opens
  const handleTriggerMouseDown = () => {
    saveSelection();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          onMouseDown={handleTriggerMouseDown}
          aria-label="Heading style"
          aria-haspopup="menu"
          className={cn(
            'flex items-center gap-1 px-2 py-1.5 rounded-md text-sm',
            'hover:bg-surface-secondary transition-colors',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Type className="w-4 h-4" aria-hidden="true" />
          <span className="text-xs min-w-[70px] text-left">{getCurrentHeading()}</span>
          <ChevronDown className="w-3 h-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48">
        {headingOptions.map((option) => (
          <DropdownMenuItem
            key={option.label}
            onSelect={() => applyHeading(option.level)}
            className={cn('flex items-center gap-2', option.className)}
          >
            <option.icon className="w-4 h-4 flex-shrink-0" />
            <span>{option.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// =============================================================================
// LINK BUTTON COMPONENT
// =============================================================================

interface LinkButtonProps {
  editor: ReturnType<typeof useEditor>;
  disabled?: boolean;
}

function LinkButton({ editor, disabled }: LinkButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [openInNewTab, setOpenInNewTab] = useState(true);

  if (!editor) return null;

  const isLinkActive = editor.isActive('link');

  // Save selection before opening dialog
  const selectionRef = useRef<{ from: number; to: number } | null>(null);

  const handleOpenDialog = useCallback(() => {
    if (!editor || disabled) return;
    
    // Save current selection
    const { from, to } = editor.state.selection;
    selectionRef.current = { from, to };
    
    // If link is active, populate form with current link data
    const currentIsLinkActive = editor.isActive('link');
    if (currentIsLinkActive) {
      const attrs = editor.getAttributes('link');
      setUrl(attrs.href || '');
      setOpenInNewTab(attrs.target === '_blank');
    } else {
      // Get selected text as default URL if no link exists
      const selectedText = editor.state.doc.textBetween(from, to);
      // Auto-detect if selected text looks like a URL
      if (selectedText && /^https?:\/\//.test(selectedText.trim())) {
        setUrl(selectedText.trim());
      } else {
        setUrl('');
      }
      setOpenInNewTab(true);
    }
    
    setIsDialogOpen(true);
  }, [editor, disabled]);

  // Handle Ctrl+K keyboard shortcut - scoped to editor element
  useEffect(() => {
    if (!editor || disabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        // Check if editor container is focused or contains active element
        const editorElement = editor.view.dom;
        const isEditorFocused = 
          document.activeElement === editorElement || 
          editorElement.contains(document.activeElement) ||
          editor.isFocused;
        
        if (isEditorFocused) {
          event.preventDefault();
          handleOpenDialog();
        }
      }
    };

    // Attach listener to editor element instead of window for better scoping
    const editorElement = editor.view.dom;
    editorElement.addEventListener('keydown', handleKeyDown);
    return () => {
      editorElement.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor, disabled, handleOpenDialog]);

  // Validate URL format
  const isValidUrl = (string: string): boolean => {
    if (!string.trim()) return false;
    
    // Allow relative URLs (starting with / or #)
    if (string.startsWith('/') || string.startsWith('#')) {
      return true;
    }
    
    // Validate absolute URLs
    try {
      const url = new URL(string);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch (_) {
      return false;
    }
  };

  const handleSetLink = () => {
    if (!editor || !url.trim()) return;

    const trimmedUrl = url.trim();
    
    // Validate URL format
    if (!isValidUrl(trimmedUrl)) {
      // Show error feedback (could be enhanced with toast notification)
      console.warn('Invalid URL format. Please enter a valid URL.');
      return;
    }

    // Restore selection
    if (selectionRef.current) {
      editor.chain().focus().setTextSelection(selectionRef.current).run();
    }

    // Apply link
    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({
        href: trimmedUrl,
        target: openInNewTab ? '_blank' : null,
      })
      .run();

    setIsDialogOpen(false);
    setUrl('');
  };

  const handleRemoveLink = () => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
    setIsDialogOpen(false);
    setUrl('');
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setUrl('');
    setOpenInNewTab(true);
  };

  return (
    <>
      <ToolbarButton
        onClick={handleOpenDialog}
        isActive={isLinkActive}
        disabled={disabled}
        tooltip="Add Link (Ctrl+K)"
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>

      {isLinkActive && (
        <ToolbarButton
          onClick={handleRemoveLink}
          disabled={disabled}
          tooltip="Remove Link"
        >
          <Unlink className="w-4 h-4" />
        </ToolbarButton>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isLinkActive ? 'Edit Link' : 'Add Link'}</DialogTitle>
            <DialogDescription>
              {isLinkActive
                ? 'Update the URL for the selected link.'
                : 'Enter a URL to create a link from the selected text.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && url.trim()) {
                    e.preventDefault();
                    handleSetLink();
                  }
                }}
                autoFocus
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="open-in-new-tab"
                checked={openInNewTab}
                onCheckedChange={(checked) => setOpenInNewTab(checked === true)}
              />
              <Label htmlFor="open-in-new-tab" className="text-sm font-normal cursor-pointer">
                Open in new tab
              </Label>
            </div>
          </div>
          <DialogFooter>
            {isLinkActive && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleRemoveLink}
                className="mr-auto"
              >
                Remove Link
              </Button>
            )}
            <Button type="button" variant="outline" onClick={handleCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSetLink}
              disabled={!url.trim() || !isValidUrl(url.trim())}
            >
              {isLinkActive ? 'Update Link' : 'Add Link'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// =============================================================================
// MAIN RICH TEXT EDITOR COMPONENT
// =============================================================================

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  className,
  minHeight = EDITOR_MIN_HEIGHT,
  maxHeight = EDITOR_MAX_HEIGHT,
  disabled = false,
}: RichTextEditorProps) {
  // Validate content length before processing
  const handleChange = useCallback((html: string) => {
    if (html.length > MAX_CONTENT_LENGTH) {
      // Truncate and notify (could also show toast, but keeping it simple for now)
      console.warn(`Content exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`);
      onChange(html.substring(0, MAX_CONTENT_LENGTH));
      return;
    }
    onChange(html);
  }, [onChange]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4],
        },
        // Enable hard breaks for Shift+Enter
        hardBreak: {},
        // Configure paragraph to allow empty paragraphs
        paragraph: {},
      }),
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-interactive-primary underline underline-offset-2 hover:text-interactive-primary-hover',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right'],
        defaultAlignment: 'left',
      }),
    ],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      handleChange(html);
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
      // Handle Enter key to create proper line breaks
      handleKeyDown: (view, event) => {
        // Shift+Enter creates a hard break (single line break)
        if (event.key === 'Enter' && event.shiftKey) {
          return false; // Let Tiptap handle it with hardBreak
        }
        // Ctrl+K is handled by LinkButton component via window event listener
        // Regular Enter creates a new paragraph
        return false;
      },
    },
  });

  // Sync editor content when value prop changes externally
  // (e.g., when loading content from database)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      const currentContent = editor.getHTML();
      if (value !== currentContent) {
        editor.commands.setContent(value, { emitUpdate: false });
      }
    }
  }, [value, editor]);

  if (!editor) {
    return (
      <div 
        className={cn(
          'border border-border-primary rounded-lg bg-background-primary animate-pulse',
          className
        )}
        style={{ minHeight }}
      />
    );
  }

  return (
    <div className={cn('border border-border-primary rounded-lg overflow-hidden', className)}>
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 p-2 border-b border-border-primary bg-surface-secondary flex-wrap">
        {/* Heading Dropdown */}
        <HeadingDropdown editor={editor} disabled={disabled} />
        
        <ToolbarDivider />
        
        {/* Bold */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive('bold')}
          disabled={disabled}
          tooltip="Bold (Ctrl+B)"
        >
          <Bold className="w-4 h-4" />
        </ToolbarButton>

        {/* Italic */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive('italic')}
          disabled={disabled}
          tooltip="Italic (Ctrl+I)"
        >
          <Italic className="w-4 h-4" />
        </ToolbarButton>

        {/* Underline */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          isActive={editor.isActive('underline')}
          disabled={disabled}
          tooltip="Underline (Ctrl+U)"
        >
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Link */}
        <LinkButton editor={editor} disabled={disabled} />

        <ToolbarDivider />

        {/* Bullet List */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive('bulletList')}
          disabled={disabled}
          tooltip="Bullet List"
        >
          <List className="w-4 h-4" />
        </ToolbarButton>

        {/* Numbered List */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive('orderedList')}
          disabled={disabled}
          tooltip="Numbered List"
        >
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>

        <ToolbarDivider />

        {/* Align Left */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          isActive={editor.isActive({ textAlign: 'left' })}
          disabled={disabled}
          tooltip="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>

        {/* Align Center */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          isActive={editor.isActive({ textAlign: 'center' })}
          disabled={disabled}
          tooltip="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>

        {/* Align Right */}
        <ToolbarButton
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          isActive={editor.isActive({ textAlign: 'right' })}
          disabled={disabled}
          tooltip="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>
      </div>

      {/* Editor Content */}
      <EditorContent
        editor={editor}
        className={cn(
          'prose prose-sm max-w-none p-4 overflow-y-auto',
          // Base text color
          'text-text-primary',
          // Heading styles - distinct visual hierarchy
          'prose-headings:font-bold prose-headings:text-text-primary prose-headings:leading-tight',
          'prose-h1:text-2xl prose-h1:font-extrabold prose-h1:mb-4 prose-h1:mt-6 first:prose-h1:mt-0',
          'prose-h2:text-xl prose-h2:font-bold prose-h2:mb-3 prose-h2:mt-5 first:prose-h2:mt-0',
          'prose-h3:text-lg prose-h3:font-semibold prose-h3:mb-2 prose-h3:mt-4 first:prose-h3:mt-0',
          'prose-h4:text-base prose-h4:font-semibold prose-h4:mb-2 prose-h4:mt-3 first:prose-h4:mt-0',
          // Paragraph styles
          'prose-p:!text-black prose-p:my-3 prose-p:leading-relaxed',
          // Strong/bold text
          'prose-strong:text-text-primary prose-strong:font-semibold',
          // Links
          'prose-a:text-interactive-primary prose-a:underline prose-a:underline-offset-2 prose-a:no-underline hover:prose-a:text-interactive-primary-hover',
          '[&_.ProseMirror_a]:text-interactive-primary [&_.ProseMirror_a]:underline [&_.ProseMirror_a]:underline-offset-2 [&_.ProseMirror_a]:cursor-pointer hover:[&_.ProseMirror_a]:text-interactive-primary-hover',
          // Lists
          'prose-ul:my-3 prose-ol:my-3 prose-li:my-1',
          'prose-ul:list-disc prose-ul:ml-6 prose-ul:pl-2',
          'prose-ol:list-decimal prose-ol:ml-6 prose-ol:pl-2',
          'prose-li:pl-2 prose-li:leading-relaxed',
          '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:ml-6 [&_.ProseMirror_ul]:pl-2 [&_.ProseMirror_ul]:my-3',
          '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:ml-6 [&_.ProseMirror_ol]:pl-2 [&_.ProseMirror_ol]:my-3',
          '[&_.ProseMirror_li]:pl-2 [&_.ProseMirror_li]:my-1 [&_.ProseMirror_li]:leading-relaxed',
          // ProseMirror specific styles
          '[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[120px]',
          // Placeholder text
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:text-text-tertiary',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none',
          '[&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0',
          // Paragraph spacing in editor - allow empty paragraphs to show
          '[&_.ProseMirror_p]:min-h-[1.5em]',
          '[&_.ProseMirror_p]:!text-black',
          '[&_.ProseMirror_p:empty]:min-h-[1.5em]',
          '[&_.ProseMirror_p:empty::before]:content-["\\00a0"]',
          // Heading styles in editor
          '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-extrabold [&_.ProseMirror_h1]:mb-4 [&_.ProseMirror_h1]:mt-2',
          '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:mt-2',
          '[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:mt-2',
          '[&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:mb-2 [&_.ProseMirror_h4]:mt-2',
          // Text alignment support
          '[&_.ProseMirror_[style*="text-align:_center"]]:text-center',
          '[&_.ProseMirror_[style*="text-align:_right"]]:text-right',
          '[&_.ProseMirror_[style*="text-align:_left"]]:text-left',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        style={{ minHeight, maxHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
