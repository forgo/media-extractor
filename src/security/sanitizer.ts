/**
 * Content Sanitizer module
 *
 * Provides safe content sanitization for URLs, filenames, and HTML content.
 */

import { safeDecodeURIComponent, isJavascriptUrl, isDataUrl } from '../utils/url';
import { sanitizeFilename as baseFileSanitize } from '../utils/filename';

// =============================================================================
// URL Sanitization
// =============================================================================

/**
 * Characters that should be encoded in URLs
 */
const UNSAFE_URL_CHARS = /[<>"{}|\\^`\[\]]/g;

/**
 * Control characters that should be removed
 */
const CONTROL_CHARS = /[\x00-\x1f\x7f]/g;

/**
 * Unicode directional override characters (can be used for spoofing)
 */
const BIDI_CHARS = /[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g;

/**
 * Sanitize a URL for safe usage
 *
 * @param url - The URL to sanitize
 * @param options - Sanitization options
 * @returns Sanitized URL or null if URL is dangerous
 */
export function sanitizeUrl(
  url: string,
  options: {
    /** Allow data: URLs (default: false for security) */
    allowDataUrls?: boolean;
    /** Allow javascript: URLs (default: never - XSS risk) */
    allowJavascriptUrls?: boolean;
    /** Strip tracking parameters (default: true) */
    stripTracking?: boolean;
    /** Maximum URL length (default: 8192) */
    maxLength?: number;
  } = {}
): string | null {
  const {
    allowDataUrls = false,
    allowJavascriptUrls = false,
    stripTracking = true,
    maxLength = 8192,
  } = options;

  if (!url || typeof url !== 'string') {
    return null;
  }

  // Trim whitespace and remove control characters
  let sanitized = url.trim().replace(CONTROL_CHARS, '');

  // Remove bidirectional override characters
  sanitized = sanitized.replace(BIDI_CHARS, '');

  // Check length
  if (sanitized.length > maxLength) {
    return null;
  }

  // Never allow javascript: URLs unless explicitly enabled (strongly discouraged)
  if (isJavascriptUrl(sanitized)) {
    if (!allowJavascriptUrls) {
      return null;
    }
  }

  // Handle data: URLs
  if (isDataUrl(sanitized)) {
    if (!allowDataUrls) {
      return null;
    }
    // For allowed data URLs, validate basic structure
    if (!sanitized.match(/^data:[a-z]+\/[a-z0-9.+-]+[;,]/i)) {
      return null;
    }
  }

  // Decode to check for double-encoding attacks, then re-encode safely
  const decoded = safeDecodeURIComponent(sanitized);

  // Check again after decoding for javascript: URLs
  if (isJavascriptUrl(decoded) && !allowJavascriptUrls) {
    return null;
  }

  // Encode any remaining unsafe characters
  sanitized = sanitized.replace(UNSAFE_URL_CHARS, (char) =>
    encodeURIComponent(char)
  );

  // Optionally strip tracking parameters
  if (stripTracking && !isDataUrl(sanitized)) {
    sanitized = stripTrackingParams(sanitized);
  }

  return sanitized;
}

// =============================================================================
// Tracking Parameter Removal
// =============================================================================

/**
 * Common tracking parameters to strip from URLs
 */
const TRACKING_PARAMS = new Set([
  // Google Analytics
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',

  // Facebook
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',

  // Other social/marketing
  'gclid', // Google Ads
  'gclsrc',
  'dclid', // DoubleClick
  'msclkid', // Microsoft Ads
  'twclid', // Twitter
  'igshid', // Instagram
  'mc_eid', // Mailchimp
  '_hsenc', // HubSpot
  '_hsmi',
  'mkt_tok', // Marketo
  'oly_enc_id', // Omeda
  'oly_anon_id',
  'vero_id',
  'wickedid',

  // Analytics
  '_ga',
  '_gl',
  '_ke',
  'trk_contact',
  'trk_msg',
  'trk_module',
  'trk_sid',

  // Affiliate
  'ref',
  'affiliate_id',
  'aff_id',
  'partner_id',

  // Misc
  'si', // Spotify
  'feature', // YouTube (some)
  'share', // Various
  '__s', // Drip
  's_kwcid', // Adobe
  'spm', // Alibaba
  'algo_pvid',
  'algo_expid',
]);

/**
 * Strip tracking parameters from a URL
 */
export function stripTrackingParams(url: string): string {
  try {
    const parsed = new URL(url);

    // Collect params to remove
    const toRemove: string[] = [];
    parsed.searchParams.forEach((_, key) => {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        toRemove.push(key);
      }
    });

    // Remove tracking params
    toRemove.forEach((key) => parsed.searchParams.delete(key));

    return parsed.toString();
  } catch {
    // If URL parsing fails, return original
    return url;
  }
}

// =============================================================================
// Filename Sanitization
// =============================================================================

/**
 * Sanitize a filename for safe file system usage
 * Re-exports the utility function with additional security checks
 */
export function sanitizeFilename(
  filename: string,
  options: {
    /** Maximum filename length (default: 255) */
    maxLength?: number;
    /** Replacement character for unsafe chars (default: '_') */
    replacement?: string;
    /** Preserve unicode characters (default: true) */
    preserveUnicode?: boolean;
  } = {}
): string {
  const { maxLength = 255, replacement = '_', preserveUnicode = true } = options;

  // Use base sanitizer
  let sanitized = baseFileSanitize(filename);

  // Remove any remaining control characters
  sanitized = sanitized.replace(CONTROL_CHARS, replacement);

  // Remove bidirectional override characters
  sanitized = sanitized.replace(BIDI_CHARS, '');

  // Optionally strip non-ASCII
  if (!preserveUnicode) {
    sanitized = sanitized.replace(/[^\x20-\x7e]/g, replacement);
  }

  // Collapse multiple replacement chars
  const escapedReplacement = replacement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  sanitized = sanitized.replace(new RegExp(`${escapedReplacement}+`, 'g'), replacement);

  // Trim replacement chars from ends
  sanitized = sanitized.replace(new RegExp(`^${escapedReplacement}+|${escapedReplacement}+$`, 'g'), '');

  // Enforce max length (preserve extension if possible)
  if (sanitized.length > maxLength) {
    const extMatch = sanitized.match(/\.[a-z0-9]{1,10}$/i);
    if (extMatch) {
      const ext = extMatch[0];
      const nameMaxLen = maxLength - ext.length;
      sanitized = sanitized.slice(0, nameMaxLen) + ext;
    } else {
      sanitized = sanitized.slice(0, maxLength);
    }
  }

  // Fallback for empty result
  if (!sanitized || sanitized === replacement) {
    return 'file';
  }

  return sanitized;
}

// =============================================================================
// HTML Content Sanitization
// =============================================================================

/**
 * Dangerous HTML tags that should never be allowed
 */
const DANGEROUS_TAGS = new Set([
  'script',
  'iframe',
  'object',
  'embed',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'style',
  'link',
  'meta',
  'base',
  'applet',
  'frame',
  'frameset',
  'layer',
  'ilayer',
  'bgsound',
  'title',
  'head',
  'html',
  'body',
]);

/**
 * Dangerous HTML attributes that can contain scripts
 */
const DANGEROUS_ATTRS = new Set([
  'onclick',
  'ondblclick',
  'onmousedown',
  'onmouseup',
  'onmouseover',
  'onmouseout',
  'onmousemove',
  'onkeydown',
  'onkeyup',
  'onkeypress',
  'onfocus',
  'onblur',
  'onchange',
  'onsubmit',
  'onreset',
  'onselect',
  'onload',
  'onunload',
  'onerror',
  'onabort',
  'onresize',
  'onscroll',
  'ondrag',
  'ondragend',
  'ondragenter',
  'ondragleave',
  'ondragover',
  'ondragstart',
  'ondrop',
  'oncontextmenu',
  'oncopy',
  'oncut',
  'onpaste',
  'oninput',
  'oninvalid',
  'onsearch',
  'ontouchstart',
  'ontouchmove',
  'ontouchend',
  'ontouchcancel',
  'onpointerdown',
  'onpointerup',
  'onpointermove',
  'onanimationstart',
  'onanimationend',
  'onanimationiteration',
  'ontransitionend',
  'formaction',
  'xlink:href',
  'data-bind',
]);

/**
 * Remove dangerous HTML content while preserving structure
 * This is a simple regex-based sanitizer for extracting URLs
 * For full HTML rendering, use a proper sanitizer like DOMPurify
 *
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML with dangerous elements removed
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = html;

  // Remove dangerous tags and their contents
  for (const tag of DANGEROUS_TAGS) {
    // Remove opening tags with attributes
    const openingTag = new RegExp(`<${tag}\\b[^>]*>`, 'gi');
    sanitized = sanitized.replace(openingTag, '');

    // Remove closing tags
    const closingTag = new RegExp(`</${tag}>`, 'gi');
    sanitized = sanitized.replace(closingTag, '');

    // Remove self-closing tags
    const selfClosing = new RegExp(`<${tag}\\b[^>]*/?>`, 'gi');
    sanitized = sanitized.replace(selfClosing, '');
  }

  // Remove script/style content between tags
  sanitized = sanitized.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  sanitized = sanitized.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');

  // Remove dangerous attributes from remaining tags
  for (const attr of DANGEROUS_ATTRS) {
    const attrPattern = new RegExp(`\\s*${attr}\\s*=\\s*(?:"[^"]*"|'[^']*'|[^\\s>]*)`, 'gi');
    sanitized = sanitized.replace(attrPattern, '');
  }

  // Remove javascript: URLs in href/src attributes
  sanitized = sanitized.replace(
    /(href|src|action)\s*=\s*(['"]?)\s*javascript:[^'">\s]*/gi,
    '$1=$2#blocked'
  );

  // Remove data: URLs in src (potential XSS vector)
  sanitized = sanitized.replace(
    /src\s*=\s*(['"]?)\s*data:text\/html[^'">\s]*/gi,
    'src=$1#blocked'
  );

  return sanitized;
}

/**
 * Extract only safe media URLs from HTML content
 * Returns an array of validated media URLs
 *
 * @param html - HTML content to extract from
 * @returns Array of safe media URLs
 */
export function extractSafeUrls(html: string): string[] {
  const sanitized = sanitizeHtml(html);
  const urls: string[] = [];

  // Match src and href attributes
  const urlPattern = /(?:src|href)\s*=\s*(['"]?)([^'">\s]+)\1/gi;
  let match;

  while ((match = urlPattern.exec(sanitized)) !== null) {
    const url = match[2];
    if (!url) continue;

    // Validate the URL
    const safe = sanitizeUrl(url, { allowDataUrls: true });
    if (safe && safe.startsWith('http')) {
      urls.push(safe);
    }
  }

  return urls;
}

// =============================================================================
// Content-Type Validation
// =============================================================================

/**
 * Safe MIME types for media content
 */
const SAFE_MEDIA_TYPES = new Set([
  // Images
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'image/x-icon',
  'image/avif',
  'image/heic',
  'image/heif',

  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',

  // Audio
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'audio/webm',
  'audio/aac',
  'audio/flac',
  'audio/midi',
  'audio/x-midi',

  // Documents
  'application/pdf',
]);

/**
 * Check if a MIME type is safe for media content
 */
export function isSafeMimeType(mimeType: string): boolean {
  if (!mimeType) return false;

  // Normalize: lowercase and remove parameters
  const normalized = (mimeType.toLowerCase().split(';')[0] ?? '').trim();

  return SAFE_MEDIA_TYPES.has(normalized);
}

/**
 * Validate that a Content-Type header indicates safe media
 */
export function validateContentType(contentType: string): {
  safe: boolean;
  mimeType: string | null;
  charset: string | null;
} {
  if (!contentType) {
    return { safe: false, mimeType: null, charset: null };
  }

  const parts = contentType.split(';').map((p) => p.trim());
  const mimeType = (parts[0] ?? '').toLowerCase();

  let charset: string | null = null;
  for (const part of parts.slice(1)) {
    if (part.startsWith('charset=')) {
      charset = part.slice(8).replace(/['"]/g, '');
    }
  }

  return {
    safe: isSafeMimeType(mimeType),
    mimeType,
    charset,
  };
}
