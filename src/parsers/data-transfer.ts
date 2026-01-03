/**
 * DataTransfer parser module
 *
 * Extracts media from DataTransfer objects (drag & drop, clipboard).
 */

import type { MediaType, MediaSource, MediaHint } from '../types';
import { isAbsoluteUrl, normalizeUrl, extractEmbeddedUrl } from '../utils/url';
import { extractFilename, extractExtension } from '../utils/filename';
import { getMediaTypeFromMime } from '../utils/mime';
import { detectMediaType } from '../detectors';
import { parseHtml, type HtmlExtractedItem } from './html';

/**
 * Raw extracted item from DataTransfer parsing
 */
export interface DataTransferExtractedItem {
  url: string;
  file?: File;
  source: MediaSource;
  mediaType: MediaType;
  format: string;
  filename: string;
  hint: MediaHint;
  confidence: number;
  dedupeKey?: string;
}

/**
 * Options for DataTransfer parsing
 */
export interface DataTransferParseOptions {
  /** Media types to extract */
  mediaTypes?: MediaType[];

  /** Extract embedded URLs from wrapper URLs (Google Images, etc.) */
  extractEmbeddedUrls?: boolean;

  /** Prefer embedded URL over wrapper URL */
  preferEmbeddedUrl?: boolean;
}

const DEFAULT_OPTIONS: DataTransferParseOptions = {
  mediaTypes: ['image', 'video', 'audio', 'document'],
  extractEmbeddedUrls: true,
  preferEmbeddedUrl: true,
};

/**
 * Parse a DataTransfer object and extract media items
 *
 * Handles:
 * - File drops/pastes
 * - HTML content (parsed for media)
 * - URI lists
 * - Plain text URLs
 */
export function parseDataTransfer(
  dataTransfer: DataTransfer,
  options: DataTransferParseOptions = {}
): DataTransferExtractedItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const items: DataTransferExtractedItem[] = [];
  const seen = new Set<string>();

  // Helper to add item if not duplicate
  const addItem = (item: DataTransferExtractedItem) => {
    const key = item.dedupeKey || item.url;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  // 1. Handle file drops
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (!file) continue;

      const mediaType = getMediaTypeFromMime(file.type);

      // Check if this media type is wanted
      if (opts.mediaTypes && !opts.mediaTypes.includes(mediaType)) continue;

      // Create blob URL for the file
      const blobUrl = URL.createObjectURL(file);

      // Extract filename parts
      const nameParts = file.name.split('.');
      const ext = nameParts.length > 1 ? nameParts.pop()!.toLowerCase() : '';
      const name = nameParts.join('.') || 'file';

      addItem({
        url: blobUrl,
        file,
        source: 'file',
        mediaType,
        format: ext,
        filename: name,
        hint: i === 0 ? 'primary' : 'unknown',
        confidence: 1.0,
      });
    }
  }

  // 2. Parse HTML content
  const html = dataTransfer.getData('text/html');
  if (html) {
    const htmlParseOpts = opts.mediaTypes ? { mediaTypes: opts.mediaTypes } : {};
    const htmlItems = parseHtml(html, htmlParseOpts);

    // Convert HTML items to DataTransfer items
    htmlItems.forEach((item: HtmlExtractedItem, index: number) => {
      if (opts.mediaTypes && !opts.mediaTypes.includes(item.mediaType)) return;

      const dtItem: DataTransferExtractedItem = {
        url: item.url,
        source: item.source,
        mediaType: item.mediaType,
        format: item.format,
        filename: item.filename,
        hint: index === 0 && items.length === 0 ? 'primary' : item.hint,
        confidence: item.confidence,
      };
      if (item.dedupeKey) dtItem.dedupeKey = item.dedupeKey;
      addItem(dtItem);
    });
  }

  // 3. Parse URI list
  const uriList = dataTransfer.getData('text/uri-list');
  if (uriList) {
    const urls = uriList
      .split(/[\r\n]+/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));

    urls.forEach((url, index) => {
      if (!isAbsoluteUrl(url)) return;

      const detection = detectMediaType(url);
      if (opts.mediaTypes && !opts.mediaTypes.includes(detection.type)) return;

      addItem({
        url,
        source: 'uri-list',
        mediaType: detection.type,
        format: extractExtension(url),
        filename: extractFilename(url),
        hint: index === 0 && items.length === 0 ? 'primary' : 'unknown',
        confidence: detection.confidence,
        dedupeKey: normalizeUrl(url),
      });

      // Check for embedded URL
      if (opts.extractEmbeddedUrls) {
        const embedded = extractEmbeddedUrl(url);
        if (embedded && embedded !== url) {
          const embeddedDetection = detectMediaType(embedded);
          if (opts.mediaTypes && !opts.mediaTypes.includes(embeddedDetection.type)) return;

          addItem({
            url: embedded,
            source: 'embedded',
            mediaType: embeddedDetection.type,
            format: extractExtension(embedded),
            filename: extractFilename(embedded),
            hint: opts.preferEmbeddedUrl ? 'primary' : 'secondary',
            confidence: embeddedDetection.confidence,
            dedupeKey: normalizeUrl(embedded),
          });
        }
      }
    });
  }

  // 4. Parse plain text (might contain URLs)
  const text = dataTransfer.getData('text/plain');
  if (text) {
    // Extract URLs from text
    const urlPattern = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi;
    const matches = text.match(urlPattern) || [];

    matches.forEach((url, index) => {
      // Clean URL (remove trailing punctuation)
      const cleaned = url.replace(/[.,;:!?)]+$/, '');

      const detection = detectMediaType(cleaned);
      if (opts.mediaTypes && !opts.mediaTypes.includes(detection.type)) return;

      addItem({
        url: cleaned,
        source: 'text-url',
        mediaType: detection.type,
        format: extractExtension(cleaned),
        filename: extractFilename(cleaned),
        hint: index === 0 && items.length === 0 ? 'primary' : 'unknown',
        confidence: detection.confidence,
        dedupeKey: normalizeUrl(cleaned),
      });
    });
  }

  return items;
}

/**
 * Parse a ClipboardEvent and extract media items
 *
 * Convenience wrapper for clipboard paste events.
 */
export function parseClipboard(
  event: ClipboardEvent,
  options: DataTransferParseOptions = {}
): DataTransferExtractedItem[] {
  if (!event.clipboardData) return [];
  return parseDataTransfer(event.clipboardData, options);
}

/**
 * Check if a DataTransfer contains potential media
 */
export function hasMedia(dataTransfer: DataTransfer): boolean {
  // Check for files
  if (dataTransfer.files && dataTransfer.files.length > 0) {
    for (let i = 0; i < dataTransfer.files.length; i++) {
      const file = dataTransfer.files[i];
      if (!file) continue;
      const type = file.type;
      if (
        type.startsWith('image/') ||
        type.startsWith('video/') ||
        type.startsWith('audio/') ||
        type === 'application/pdf'
      ) {
        return true;
      }
    }
  }

  // Check for HTML content
  if (dataTransfer.types.includes('text/html')) {
    return true;
  }

  // Check for URI list
  if (dataTransfer.types.includes('text/uri-list')) {
    return true;
  }

  return false;
}

/**
 * Get a preview of what media might be in a DataTransfer
 * (without fully parsing)
 */
export function getDataTransferPreview(dataTransfer: DataTransfer): {
  hasFiles: boolean;
  fileCount: number;
  hasHtml: boolean;
  hasUriList: boolean;
  hasText: boolean;
} {
  return {
    hasFiles: dataTransfer.files && dataTransfer.files.length > 0,
    fileCount: dataTransfer.files ? dataTransfer.files.length : 0,
    hasHtml: dataTransfer.types.includes('text/html'),
    hasUriList: dataTransfer.types.includes('text/uri-list'),
    hasText: dataTransfer.types.includes('text/plain'),
  };
}
