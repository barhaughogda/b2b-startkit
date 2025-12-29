/**
 * Website Builder Preview PostMessage Types
 * 
 * Defines TypeScript types for postMessage communication between
 * the website builder and preview iframe.
 */

import type {
  TemplateId,
  HeaderConfig,
  FooterConfig,
  ThemeConfig,
  BlockInstance,
  PageConfig,
  SiteStructure,
} from './schema';

// Preview data structure
export interface PreviewData {
  templateId: TemplateId;
  header: HeaderConfig;
  footer: FooterConfig;
  theme: ThemeConfig;
  blocks: BlockInstance[];
  tenantName?: string;
  tenantId?: string;
  logoUrl?: string;
  contactInfo?: {
    phone: string;
    email: string;
    address: {
      street: string;
      city: string;
      state: string;
      zipCode: string;
    };
  };
  pages?: PageConfig[];
  activePageId?: string;
  selectedBlockId?: string | null;
  /** Site structure type */
  siteStructure?: SiteStructure;
  /** Base path for URLs */
  basePath?: string;
}

// PostMessage types
export type PreviewMessage =
  | { type: 'PREVIEW_UPDATE'; payload: PreviewData }
  | { type: 'PREVIEW_READY' }
  | { type: 'BLOCK_SELECTED'; blockId: string }
  | { type: 'NAVIGATE_PAGE'; pageId: string }
  | { type: 'SELECT_BLOCK'; blockId: string };

/**
 * Type guard to validate preview messages
 */
export function isValidPreviewMessage(data: unknown): data is PreviewMessage {
  if (!data || typeof data !== 'object') {
    return false;
  }

  const obj = data as Record<string, unknown>;
  
  if (!('type' in obj) || typeof obj.type !== 'string') {
    return false;
  }

  switch (obj.type) {
    case 'PREVIEW_UPDATE':
      return 'payload' in obj && typeof obj.payload === 'object';
    case 'PREVIEW_READY':
      return true;
    case 'BLOCK_SELECTED':
    case 'NAVIGATE_PAGE':
    case 'SELECT_BLOCK':
      return 'blockId' in obj || 'pageId' in obj;
    default:
      return false;
  }
}

/**
 * Validates that a message event is from the same origin
 */
export function isMessageFromSameOrigin(event: MessageEvent): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return event.origin === window.location.origin;
}

