/**
 * Document detection module
 *
 * Provides functions to detect and validate document URLs (PDFs, Word docs, etc.).
 */

import type { MediaType } from '../types';
import { isAbsoluteUrl, isDataUrl, isBlobUrl, parseUrl, extractPath } from '../utils/url';
import { extractExtension, isDocumentExtension } from '../utils/filename';
import { getMimeFromDataUrl, isDocumentMime, getSupportedDocumentExtensions } from '../utils/mime';

/** Supported document extensions */
const _DOCUMENT_EXTENSIONS = new Set(getSupportedDocumentExtensions());
void _DOCUMENT_EXTENSIONS; // Preserve for future use

/** Document hosting/viewing platforms */
const DOCUMENT_PLATFORMS: {
  domain: RegExp;
  patterns?: RegExp[];
}[] = [
  {
    domain: /^docs\.google\.com$/i,
    patterns: [/\/document\//, /\/spreadsheets\//, /\/presentation\//, /\/viewer/],
  },
  {
    domain: /^drive\.google\.com$/i,
    patterns: [/\/file\//, /\/viewer/],
  },
  {
    domain: /^.*\.sharepoint\.com$/i,
    patterns: [/\/_layouts\//, /\/Documents\//],
  },
  {
    domain: /^(www\.)?dropbox\.com$/i,
    patterns: [/\/s\/.*\.(pdf|doc|docx|xls|xlsx|ppt|pptx)/i],
  },
  {
    domain: /^(www\.)?scribd\.com$/i,
    patterns: [/\/document\//, /\/doc\//],
  },
  {
    domain: /^(www\.)?slideshare\.net$/i,
  },
  {
    domain: /^(www\.)?issuu\.com$/i,
  },
  {
    domain: /^(www\.)?box\.com$/i,
    patterns: [/\/s\//, /\/file\//],
  },
];

/** Document-related CDN/URL patterns */
const DOCUMENT_CDN_PATTERNS = [
  /\/pdf\//i,
  /\/documents?\//i,
  /\/downloads?\//i,
  /\/files?\//i,
  /\.pdf\?/i,
  /attachment[^?#]*\.pdf/i,
  /download[^?#]*\.pdf/i,
];

/**
 * Check if a URL has a document file extension
 */
export function hasDocumentExtension(url: string): boolean {
  const ext = extractExtension(url);
  return isDocumentExtension(ext);
}

/**
 * Check if a data URL is a document
 */
export function isDocumentDataUrl(url: string): boolean {
  if (!isDataUrl(url)) return false;

  const mime = getMimeFromDataUrl(url);
  return mime ? isDocumentMime(mime) : false;
}

/**
 * Check if URL is from a known document platform
 */
export function isDocumentPlatformUrl(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;

  const domain = parsed.hostname.toLowerCase();

  for (const platform of DOCUMENT_PLATFORMS) {
    if (platform.domain.test(domain)) {
      // If no patterns specified, domain match is enough
      if (!platform.patterns) return true;

      // Check if URL matches any pattern
      const fullUrl = parsed.pathname + parsed.search;
      for (const pattern of platform.patterns) {
        if (pattern.test(fullUrl)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if URL matches document CDN patterns
 */
export function matchesDocumentCdnPattern(url: string): boolean {
  if (!url) return false;

  for (const pattern of DOCUMENT_CDN_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if the URL path suggests a document
 */
export function hasDocumentPathIndicator(url: string): boolean {
  const path = extractPath(url).toLowerCase();

  const indicators = ['/pdf', '/doc', '/document', '/download', '/file', '/attachment', '/export'];

  for (const indicator of indicators) {
    if (path.includes(indicator)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if a URL is a document URL
 *
 * @param url - The URL to check
 * @returns Confidence score from 0 to 1
 */
export function detectDocument(url: string): number {
  if (!url) return 0;

  // Data URLs - check MIME type
  if (isDataUrl(url)) {
    return isDocumentDataUrl(url) ? 1.0 : 0;
  }

  // Blob URLs could be documents - moderate score
  if (isBlobUrl(url)) {
    return 0.4;
  }

  // Check for absolute URL
  if (!isAbsoluteUrl(url)) return 0;

  // Document file extension (highest confidence)
  if (hasDocumentExtension(url)) {
    return 1.0;
  }

  // Known document platform (high confidence)
  if (isDocumentPlatformUrl(url)) {
    return 0.9;
  }

  // Document CDN patterns (moderate-high confidence)
  if (matchesDocumentCdnPattern(url)) {
    // Even higher if path also suggests document
    if (hasDocumentPathIndicator(url)) {
      return 0.85;
    }
    return 0.7;
  }

  // Path indicators alone (lower confidence)
  if (hasDocumentPathIndicator(url)) {
    return 0.5;
  }

  return 0;
}

/**
 * Check if a URL is likely a document (boolean version)
 *
 * @param url - The URL to check
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isDocumentUrl(url: string, threshold = 0.5): boolean {
  return detectDocument(url) >= threshold;
}

/**
 * Get the detected media type for a document URL
 * Returns 'document' if detected, 'unknown' otherwise
 */
export function getDocumentMediaType(url: string): MediaType {
  return isDocumentUrl(url) ? 'document' : 'unknown';
}

/**
 * Check if a URL is specifically a PDF
 */
export function isPdfUrl(url: string): boolean {
  const ext = extractExtension(url);
  if (ext.toLowerCase() === 'pdf') return true;

  // Check data URL
  if (isDataUrl(url)) {
    const mime = getMimeFromDataUrl(url);
    return mime === 'application/pdf';
  }

  return false;
}
