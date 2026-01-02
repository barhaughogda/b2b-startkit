/**
 * Website Builder Schema and Types
 *
 * Central entry point for all website builder definitions.
 * Re-exports from focused modules to avoid circular dependencies.
 */

// Re-export core types and constants
export * from './types';
import { DEFAULT_BLOCK_APPEARANCE, BackgroundTokens, TextTokens } from './types';
export { DEFAULT_BLOCK_APPEARANCE, BackgroundTokens, TextTokens };

// Re-export validation schemas and helpers
export * from './zod-schemas';
import { 
  getBlockPropsSchema, 
  blockMetadata, 
  footerColumnSchema,
  footerMenuPageItemSchema,
  footerMenuExternalItemSchema,
  footerMenuItemSchema,
  footerMenuSectionSchema,
  footerMenuColumnSchema,
} from './zod-schemas';
export { 
  getBlockPropsSchema, 
  blockMetadata, 
  blockMetadata as BLOCK_METADATA,
  footerColumnSchema,
  footerMenuPageItemSchema,
  footerMenuExternalItemSchema,
  footerMenuItemSchema,
  footerMenuSectionSchema,
  footerMenuColumnSchema,
};

// Re-export content generators
export * from './content-generators';
import { createBlockInstance } from './content-generators';
export { createBlockInstance };

// Re-export metadata
export * from './metadata';
