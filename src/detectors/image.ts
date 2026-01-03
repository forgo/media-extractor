/**
 * Image detection module
 *
 * Provides functions to detect and validate image URLs.
 */

import type { MediaType } from '../types';
import {
  isAbsoluteUrl,
  isDataUrl,
  isBlobUrl,
  parseUrl,
  extractPath,
  safeDecodeURIComponent,
} from '../utils/url';
import { extractExtension, isImageExtension } from '../utils/filename';
import { getMimeFromDataUrl, isImageMime, getSupportedImageExtensions } from '../utils/mime';

/** Supported image extensions */
const IMAGE_EXTENSIONS = new Set(getSupportedImageExtensions());

/** Common image CDN patterns that indicate an image even without extension */
const IMAGE_CDN_PATTERNS = [
  /\/image[s]?\//i,
  /\/img[s]?\//i,
  /\/photo[s]?\//i,
  /\/picture[s]?\//i,
  /\/media\//i,
  /\/upload[s]?\//i,
  /\/asset[s]?\//i,
  /\/static\//i,
  /\.cloudinary\.com\//i,
  /\.imgix\.net\//i,
  /\.unsplash\.com\//i,
  /\.pexels\.com\//i,
  /images\.unsplash\.com\//i,
  /\.twimg\.com\//i,
  /\.fbcdn\.net\//i,
  /\.cdninstagram\.com\//i,
  /\.pinimg\.com\//i,
  /\.giphy\.com\//i,
  /\.imgur\.com\//i,
  /i\.imgur\.com\//i,
  /\.gstatic\.com\//i,
];

/** Query parameters that typically contain image format info */
const IMAGE_FORMAT_PARAMS = ['format', 'f', 'type', 'output', 'fm', 'ext'];

/** Query parameters that indicate image operations (resizing, cropping, etc.) */
const IMAGE_OPERATION_PARAMS = [
  'w',
  'h',
  'width',
  'height',
  'size',
  'resize',
  'crop',
  'fit',
  'q',
  'quality',
  'auto',
  'dpr',
];

/**
 * Check if a URL appears to be an image based on extension
 */
export function hasImageExtension(url: string): boolean {
  const ext = extractExtension(url);
  return isImageExtension(ext);
}

/**
 * Check if a data URL is an image
 */
export function isImageDataUrl(url: string): boolean {
  if (!isDataUrl(url)) return false;

  const mime = getMimeFromDataUrl(url);
  return mime ? isImageMime(mime) : false;
}

/**
 * Check if URL matches common image CDN patterns
 */
export function matchesImageCdnPattern(url: string): boolean {
  if (!url) return false;

  for (const pattern of IMAGE_CDN_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if URL has query parameters suggesting image operations
 */
export function hasImageQueryParams(url: string): boolean {
  const parsed = parseUrl(url);
  if (!parsed) return false;

  // Check for format parameters
  for (const param of IMAGE_FORMAT_PARAMS) {
    const value = parsed.searchParams.get(param);
    if (value && IMAGE_EXTENSIONS.has(value.toLowerCase())) {
      return true;
    }
  }

  // Check for operation parameters (suggests it's an image being processed)
  let operationCount = 0;
  for (const param of IMAGE_OPERATION_PARAMS) {
    if (parsed.searchParams.has(param)) {
      operationCount++;
    }
  }

  // If multiple image operation params, likely an image
  return operationCount >= 2;
}

/**
 * Detect if a URL is an image URL
 *
 * @param url - The URL to check
 * @returns Confidence score from 0 to 1
 */
export function detectImage(url: string): number {
  if (!url) return 0;

  // Data URLs - check MIME type
  if (isDataUrl(url)) {
    return isImageDataUrl(url) ? 1.0 : 0;
  }

  // Blob URLs could be images - give them a moderate score
  if (isBlobUrl(url)) {
    return 0.5;
  }

  // Check for absolute URL
  if (!isAbsoluteUrl(url)) return 0;

  // Extension-based detection (highest confidence)
  if (hasImageExtension(url)) {
    return 1.0;
  }

  // CDN pattern matching (high confidence)
  if (matchesImageCdnPattern(url)) {
    // Even higher if it also has image query params
    if (hasImageQueryParams(url)) {
      return 0.9;
    }
    return 0.7;
  }

  // Query parameter hints (moderate confidence)
  if (hasImageQueryParams(url)) {
    return 0.6;
  }

  // Check if path contains image-related segments
  const path = extractPath(url).toLowerCase();
  const decodedPath = safeDecodeURIComponent(path);

  if (
    decodedPath.includes('/image') ||
    decodedPath.includes('/img') ||
    decodedPath.includes('/photo') ||
    decodedPath.includes('/picture')
  ) {
    return 0.5;
  }

  // No extension URLs could still be images (CDN without extensions)
  const lastSegment = decodedPath.split('/').pop() || '';
  if (lastSegment && !lastSegment.includes('.')) {
    // Could be an image, low confidence
    return 0.3;
  }

  return 0;
}

/**
 * Check if a URL is likely an image (boolean version)
 *
 * @param url - The URL to check
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isImageUrl(url: string, threshold: number = 0.5): boolean {
  return detectImage(url) >= threshold;
}

/**
 * Get the detected media type for an image URL
 * Returns 'image' if detected, 'unknown' otherwise
 */
export function getImageMediaType(url: string): MediaType {
  return isImageUrl(url) ? 'image' : 'unknown';
}

/**
 * Check if dimensions suggest a tracking pixel
 */
export function isTrackingPixelSize(width: number | null, height: number | null): boolean {
  if (width === null || height === null) return false;
  return width <= 1 && height <= 1;
}

/**
 * Check if dimensions suggest a UI element (small icon/button)
 */
export function isUiElementSize(
  width: number | null,
  height: number | null,
  maxDimension: number = 32
): boolean {
  if (width === null || height === null) return false;
  return width <= maxDimension && height <= maxDimension;
}

/**
 * Check if URL pattern suggests a UI element (icon, button, etc.)
 */
export function isUiElementUrl(url: string): boolean {
  if (!url) return false;

  const path = extractPath(url).toLowerCase();
  const decodedPath = safeDecodeURIComponent(path);

  const uiPatterns = [
    '/icon',
    '/icons/',
    '/btn',
    '/button',
    '/arrow',
    '/check',
    '/close',
    '/menu',
    '/nav',
    '/logo',
    '/favicon',
    '/sprite',
    '/ui/',
    '/assets/ui',
    '/images/icons',
  ];

  for (const pattern of uiPatterns) {
    if (decodedPath.includes(pattern)) {
      return true;
    }
  }

  return false;
}
