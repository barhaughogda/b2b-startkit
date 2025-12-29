/**
 * Service Icon Upload Constants
 * 
 * Defines allowed types and size limits for service icon uploads.
 * Only SVG files are allowed for custom icons.
 */

/** Maximum file size for service icons (500KB) */
export const MAX_SERVICE_ICON_SIZE = 500 * 1024; // 500KB

/** Allowed MIME types for service icons */
export const ALLOWED_SERVICE_ICON_TYPES = ['image/svg+xml'] as const;

/** Allowed file extensions */
export const ALLOWED_SERVICE_ICON_EXTENSIONS = ['.svg'] as const;

/** Cache control header for service icons */
export const SERVICE_ICON_CACHE_CONTROL = 'public, max-age=31536000, immutable';

/**
 * SVG elements that are dangerous and should be removed
 * These can execute JavaScript or load external resources
 */
export const DANGEROUS_SVG_ELEMENTS = [
  'script',
  'foreignObject',
  'iframe',
  'object',
  'embed',
  'use', // Can load external resources via xlink:href
  'animate',
  'animateMotion', 
  'animateTransform',
  'set', // Can modify attributes
  'mpath',
] as const;

/**
 * SVG attributes that can execute JavaScript
 * All event handlers and javascript: URLs
 */
export const DANGEROUS_SVG_ATTRIBUTES = [
  // Event handlers
  'onload',
  'onerror',
  'onclick',
  'onmouseover',
  'onmouseout',
  'onmousedown',
  'onmouseup',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onselect',
  'onkeydown',
  'onkeypress',
  'onkeyup',
  'onabort',
  'ondblclick',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  // Other dangerous attributes
  'href', // For <a> tags that could navigate away
  'xlink:href', // Can load external resources
] as const;

/**
 * Patterns that indicate potentially dangerous content in attribute values
 */
export const DANGEROUS_ATTRIBUTE_VALUE_PATTERNS = [
  /javascript:/i,
  /data:/i, // data: URLs can embed arbitrary content
  /vbscript:/i,
  /expression\s*\(/i, // CSS expressions (IE)
  /url\s*\(/i, // CSS url() can load external resources in some contexts
];

