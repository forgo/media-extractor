/**
 * Filename utilities for the Media Extractor library
 *
 * Provides functions for extracting, sanitizing, and manipulating
 * filenames from URLs and other sources.
 */

import { parseUrl, isDataUrl, safeDecodeURIComponent } from './url';

// =============================================================================
// Filename Extraction
// =============================================================================

/**
 * Extract a filename from a URL
 * Returns 'file' as fallback if extraction fails
 */
export function extractFilename(url: string): string {
  if (!url || typeof url !== 'string') return 'file';

  // Handle data URLs
  if (isDataUrl(url)) {
    return 'file';
  }

  const parsed = parseUrl(url);
  if (!parsed) return 'file';

  try {
    const pathname = parsed.pathname;
    const decoded = safeDecodeURIComponent(pathname);

    // Get the last segment of the path
    const segments = decoded.split('/').filter(Boolean);
    if (segments.length === 0) return 'file';

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) return 'file';

    // Remove extension if present
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex > 0) {
      return sanitizeFilename(lastSegment.slice(0, dotIndex));
    }

    return sanitizeFilename(lastSegment) || 'file';
  } catch {
    return 'file';
  }
}

/**
 * Extract file extension from a URL
 * Returns empty string if no extension found
 */
export function extractExtension(url: string): string {
  if (!url || typeof url !== 'string') return '';

  // Handle data URLs specially
  if (isDataUrl(url)) {
    return extractExtensionFromDataUrl(url);
  }

  const parsed = parseUrl(url);
  if (!parsed) return '';

  try {
    const pathname = parsed.pathname;
    const decoded = safeDecodeURIComponent(pathname);

    // Get the last segment
    const segments = decoded.split('/').filter(Boolean);
    if (segments.length === 0) return '';

    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) return '';

    // Extract extension
    const dotIndex = lastSegment.lastIndexOf('.');
    if (dotIndex > 0 && dotIndex < lastSegment.length - 1) {
      let ext = lastSegment.slice(dotIndex + 1).toLowerCase();

      // Remove any query string that might have sneaked in
      const queryIndex = ext.indexOf('?');
      if (queryIndex > 0) {
        ext = ext.slice(0, queryIndex);
      }

      // Validate it's a reasonable extension
      if (ext.length > 0 && ext.length <= 10 && /^[a-z0-9]+$/i.test(ext)) {
        return ext;
      }
    }

    // Try to get extension from query params (some CDNs use this)
    const format =
      parsed.searchParams.get('format') ||
      parsed.searchParams.get('f') ||
      parsed.searchParams.get('ext') ||
      parsed.searchParams.get('type');

    if (format && format.length <= 10 && /^[a-z0-9]+$/i.test(format)) {
      return format.toLowerCase();
    }

    return '';
  } catch {
    return '';
  }
}

/**
 * Extract extension from a data URL's MIME type
 */
export function extractExtensionFromDataUrl(url: string): string {
  if (!isDataUrl(url)) return '';

  const match = /^data:([^;,]+)/.exec(url);
  if (!match?.[1]) return '';

  const mimeType = match[1].toLowerCase();

  // Map common MIME types to extensions
  const mimeToExt: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/svg+xml': 'svg',
    'image/bmp': 'bmp',
    'image/ico': 'ico',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/avif': 'avif',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'image/tiff': 'tiff',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/ogg': 'ogv',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'application/pdf': 'pdf',
  };

  return mimeToExt[mimeType] || '';
}

/**
 * Get both filename and extension from a URL
 */
export function extractFilenameAndExtension(url: string): { filename: string; extension: string } {
  return {
    filename: extractFilename(url),
    extension: extractExtension(url),
  };
}

// =============================================================================
// Filename Sanitization
// =============================================================================

/** Characters that are not allowed in filenames on various OS */
const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\x00-\x1f]/g;

/** Reserved filenames on Windows */
const WINDOWS_RESERVED_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
]);

/**
 * Sanitize a filename to be safe for filesystem use
 * - Removes invalid characters
 * - Handles reserved names
 * - Limits length
 * - Prevents path traversal
 */
export function sanitizeFilename(filename: string, maxLength = 200): string {
  if (!filename || typeof filename !== 'string') return 'file';

  // Limit input length before regex operations to prevent ReDoS
  const truncated = filename.slice(0, maxLength * 2);

  let sanitized = truncated
    // Replace invalid characters with underscores
    .replace(INVALID_FILENAME_CHARS, '_')
    // Remove leading/trailing whitespace and dots
    .trim()
    .replace(/^\.{1,100}|\.{1,100}$/g, '')
    // Replace multiple underscores/dashes with single (bounded)
    .replace(/[_-]{1,100}/g, '_')
    // Remove any remaining path separators (path traversal prevention)
    .replace(/[/\\]/g, '_');

  // Handle Windows reserved names
  const upperName = sanitized.toUpperCase().split('.')[0] ?? '';
  if (WINDOWS_RESERVED_NAMES.has(upperName)) {
    sanitized = '_' + sanitized;
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  // Ensure we have something
  return sanitized || 'file';
}

/**
 * Sanitize a full filename including extension
 */
export function sanitizeFullFilename(filename: string, extension: string, maxLength = 200): string {
  const sanitizedName = sanitizeFilename(filename, maxLength - extension.length - 1);
  const sanitizedExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();

  if (sanitizedExt) {
    return `${sanitizedName}.${sanitizedExt}`;
  }

  return sanitizedName;
}

/**
 * Check if a filename contains path traversal attempts
 */
export function hasPathTraversal(filename: string): boolean {
  if (!filename) return false;

  // Check for common path traversal patterns
  return (
    filename.includes('..') ||
    filename.includes('/') ||
    filename.includes('\\') ||
    filename.startsWith('~')
  );
}

// =============================================================================
// Filename Generation
// =============================================================================

/**
 * Generate a unique filename by adding a number suffix
 */
export function makeUnique(
  filename: string,
  extension: string,
  existingNames: Set<string>
): string {
  const sanitizedName = sanitizeFilename(filename);
  const sanitizedExt = extension.replace(/[^a-z0-9]/gi, '').toLowerCase();

  const fullName = sanitizedExt ? `${sanitizedName}.${sanitizedExt}` : sanitizedName;

  if (!existingNames.has(fullName.toLowerCase())) {
    return fullName;
  }

  // Add number suffix until unique
  let counter = 1;
  while (counter < 10000) {
    const candidateName = sanitizedExt
      ? `${sanitizedName}_${counter}.${sanitizedExt}`
      : `${sanitizedName}_${counter}`;

    if (!existingNames.has(candidateName.toLowerCase())) {
      return candidateName;
    }

    counter++;
  }

  // Fallback with timestamp
  const timestamp = Date.now();
  return sanitizedExt
    ? `${sanitizedName}_${timestamp}.${sanitizedExt}`
    : `${sanitizedName}_${timestamp}`;
}

/**
 * Generate a filename from a URL with proper extension
 */
export function generateFilename(url: string, defaultName = 'file'): string {
  const { filename, extension } = extractFilenameAndExtension(url);

  const name = filename || defaultName;
  const ext = extension;

  return sanitizeFullFilename(name, ext);
}

// =============================================================================
// Extension Handling
// =============================================================================

/**
 * Normalize a file extension
 * - Lowercase
 * - Remove leading dot if present
 * - Handle common aliases (jpeg -> jpg)
 */
export function normalizeExtension(extension: string): string {
  if (!extension) return '';

  const normalized = extension.toLowerCase().replace(/^\.+/, '');

  // Handle common aliases
  const aliases: Record<string, string> = {
    jpeg: 'jpg',
    jpe: 'jpg',
    jfif: 'jpg',
    tif: 'tiff',
    htm: 'html',
    mpeg: 'mpg',
  };

  return aliases[normalized] || normalized;
}

/**
 * Check if an extension represents an image format
 */
export function isImageExtension(extension: string): boolean {
  const imageExts = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'bmp',
    'ico',
    'avif',
    'heic',
    'heif',
    'tiff',
    'tif',
    'jfif',
  ]);

  return imageExts.has(normalizeExtension(extension));
}

/**
 * Check if an extension represents a video format
 */
export function isVideoExtension(extension: string): boolean {
  const videoExts = new Set([
    'mp4',
    'webm',
    'mkv',
    'avi',
    'mov',
    'wmv',
    'flv',
    'ogv',
    'm4v',
    '3gp',
    'mpg',
    'mpeg',
  ]);

  return videoExts.has(normalizeExtension(extension));
}

/**
 * Check if an extension represents an audio format
 */
export function isAudioExtension(extension: string): boolean {
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'opus']);

  return audioExts.has(normalizeExtension(extension));
}

/**
 * Check if an extension represents a document format
 */
export function isDocumentExtension(extension: string): boolean {
  const docExts = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf']);

  return docExts.has(normalizeExtension(extension));
}
