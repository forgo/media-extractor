/**
 * URL parser module
 *
 * Extracts media information from URL strings.
 */

import type { MediaType, MediaSource, MediaHint } from '../types';
import {
  isAbsoluteUrl,
  isDataUrl,
  isBlobUrl,
  normalizeUrl,
  extractEmbeddedUrl,
  isUrlShortener,
  countRedirects,
} from '../utils/url';
import { extractFilename, extractExtension } from '../utils/filename';
import { detectMediaType } from '../detectors';

/**
 * Extracted item from URL parsing
 */
export interface UrlExtractedItem {
  url: string;
  source: MediaSource;
  mediaType: MediaType;
  format: string;
  filename: string;
  hint: MediaHint;
  confidence: number;
  dedupeKey?: string;
  embeddedFrom?: string;
  isShortener?: boolean;
  redirectCount?: number;
}

/**
 * Options for URL parsing
 */
export interface UrlParseOptions {
  /** Media types to extract */
  mediaTypes?: MediaType[];

  /** Extract embedded URLs from wrapper URLs */
  extractEmbeddedUrls?: boolean;

  /** Prefer embedded URL over wrapper URL */
  preferEmbeddedUrl?: boolean;

  /** Flag URL shorteners */
  detectUrlShorteners?: boolean;

  /** Count redirect levels */
  countRedirects?: boolean;
}

const DEFAULT_OPTIONS: UrlParseOptions = {
  mediaTypes: ['image', 'video', 'audio', 'document'],
  extractEmbeddedUrls: true,
  preferEmbeddedUrl: true,
  detectUrlShorteners: true,
  countRedirects: true,
};

/**
 * Parse a single URL and extract media information
 */
export function parseUrl(url: string, options: UrlParseOptions = {}): UrlExtractedItem | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  if (!url) return null;

  // Validate URL
  if (!isAbsoluteUrl(url) && !isDataUrl(url) && !isBlobUrl(url)) {
    return null;
  }

  // Detect media type
  const detection = detectMediaType(url);

  // Check if media type is wanted
  if (opts.mediaTypes && !opts.mediaTypes.includes(detection.type)) {
    return null;
  }

  // Build result
  const result: UrlExtractedItem = {
    url,
    source: isDataUrl(url) ? 'data-url' : isBlobUrl(url) ? 'blob-url' : 'text-url',
    mediaType: detection.type,
    format: extractExtension(url),
    filename: extractFilename(url),
    hint: 'unknown',
    confidence: detection.confidence,
    dedupeKey: normalizeUrl(url),
  };

  // Check for URL shortener
  if (opts.detectUrlShorteners && isUrlShortener(url)) {
    result.isShortener = true;
    result.hint = 'unknown'; // Can't determine until resolved
  }

  // Count redirects
  if (opts.countRedirects) {
    const redirects = countRedirects(url);
    if (redirects > 0) {
      result.redirectCount = redirects;
    }
  }

  return result;
}

/**
 * Parse a URL and extract embedded URLs if present
 */
export function parseUrlWithEmbedded(
  url: string,
  options: UrlParseOptions = {}
): UrlExtractedItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const items: UrlExtractedItem[] = [];

  // Parse the main URL
  const mainItem = parseUrl(url, opts);
  if (!mainItem) return [];

  // If not extracting embedded, just return main
  if (!opts.extractEmbeddedUrls) {
    return [mainItem];
  }

  // Check for embedded URL
  const embeddedUrl = extractEmbeddedUrl(url);
  if (embeddedUrl && embeddedUrl !== url) {
    const embeddedItem = parseUrl(embeddedUrl, opts);

    if (embeddedItem) {
      embeddedItem.source = 'embedded';
      embeddedItem.embeddedFrom = url;

      if (opts.preferEmbeddedUrl) {
        // Embedded first (preferred)
        embeddedItem.hint = 'primary';
        mainItem.hint = 'secondary';
        items.push(embeddedItem, mainItem);
      } else {
        // Main first, embedded as secondary
        mainItem.hint = 'primary';
        embeddedItem.hint = 'secondary';
        items.push(mainItem, embeddedItem);
      }
    } else {
      items.push(mainItem);
    }
  } else {
    items.push(mainItem);
  }

  return items;
}

/**
 * Parse multiple URLs
 */
export function parseUrls(urls: string[], options: UrlParseOptions = {}): UrlExtractedItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const items: UrlExtractedItem[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    if (!url) continue;
    const urlItems = parseUrlWithEmbedded(url, opts);

    urlItems.forEach((item) => {
      const key = item.dedupeKey || item.url;
      if (!seen.has(key)) {
        seen.add(key);

        // First item gets primary hint if not already set
        if (items.length === 0 && item.hint === 'unknown') {
          item.hint = 'primary';
        }

        items.push(item);
      }
    });
  }

  return items;
}

/**
 * Extract URLs from plain text
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];

  // Match HTTP(S) URLs
  const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
  const matches = text.match(urlPattern) || [];

  // Clean URLs (remove trailing punctuation) - limit replacement to avoid ReDoS
  return matches.map((url) => {
    // Only strip up to 10 trailing punctuation chars to prevent ReDoS
    const trailingMatch = /[.,;:!?)]{1,10}$/.exec(url);
    return trailingMatch ? url.slice(0, -trailingMatch[0].length) : url;
  });
}

/**
 * Parse URLs from plain text
 */
export function parseTextForUrls(text: string, options: UrlParseOptions = {}): UrlExtractedItem[] {
  const urls = extractUrlsFromText(text);
  return parseUrls(urls, options);
}

/**
 * Validate that a URL is a valid media URL
 */
export function isValidMediaUrl(url: string, mediaTypes?: MediaType[]): boolean {
  if (!url) return false;

  if (!isAbsoluteUrl(url) && !isDataUrl(url) && !isBlobUrl(url)) {
    return false;
  }

  const detection = detectMediaType(url);

  if (detection.type === 'unknown') {
    return false;
  }

  if (mediaTypes && !mediaTypes.includes(detection.type)) {
    return false;
  }

  return true;
}
