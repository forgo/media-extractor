/**
 * MediaExtractor - Main extraction engine
 *
 * Provides a unified API for extracting media from various sources
 * with configurable security, filtering, and detection options.
 */

import type {
  ExtractedMedia,
  ExtractorConfig,
  MediaType,
  MediaSource,
  ExtractionResult,
} from './types';

import { detectMediaType, getMediaType } from './detectors';
import { parseHtml, type HtmlExtractedItem } from './parsers/html';
import { parseDataTransfer, type DataTransferExtractedItem } from './parsers/data-transfer';
import { parseDom, parseDocument, type DomExtractedItem } from './parsers/dom';
import { parseUrl, parseUrls, type UrlExtractedItem } from './parsers/url';
import { SecurityScanner, SECURITY_PRESETS } from './security';
import { applyFilters, FILTER_PRESETS, type FilterConfig, deduplicate } from './filters';
import { extractFilename, extractExtension } from './utils/filename';
import { getMimeFromExtension } from './utils/mime';
import { isAbsoluteUrl, normalizeUrl } from './utils/url';

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_CONFIG: Required<ExtractorConfig> = {
  mediaTypes: ['image', 'video', 'audio', 'document'],
  confidenceThreshold: 0.5,
  security: {},
  filters: {},
  extractDimensions: true,
  extractMetadata: true,
  followEmbeddedUrls: true,
  maxItems: 1000,
  maxDepth: 3,
  deduplication: true,
};

// =============================================================================
// MediaExtractor Class
// =============================================================================

/**
 * MediaExtractor provides a unified API for extracting media from various sources.
 */
export class MediaExtractor<TMeta = unknown> {
  private config: Required<ExtractorConfig>;
  private securityScanner: SecurityScanner;
  private extractionCount = 0;

  constructor(config: Partial<ExtractorConfig> = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    };

    this.securityScanner = new SecurityScanner(this.config.security);
  }

  getConfig(): Required<ExtractorConfig> {
    return { ...this.config };
  }

  configure(updates: Partial<ExtractorConfig>): this {
    this.config = {
      ...this.config,
      ...updates,
    };

    if (updates.security) {
      this.securityScanner = new SecurityScanner(this.config.security);
    }

    return this;
  }

  getSecurityScanner(): SecurityScanner {
    return this.securityScanner;
  }

  // ===========================================================================
  // URL Extraction
  // ===========================================================================

  fromUrl(url: string): ExtractionResult<TMeta> {
    const startTime = Date.now();

    if (!url || !isAbsoluteUrl(url)) {
      return this.createResult([], startTime, { invalidUrls: 1 });
    }

    const parsed = parseUrl(url, {
      extractEmbeddedUrls: this.config.followEmbeddedUrls,
    });

    const items = this.processUrlItems(parsed ? [parsed] : [], 'url');
    return this.createResult(items, startTime);
  }

  fromUrls(urls: string[]): ExtractionResult<TMeta> {
    const startTime = Date.now();

    const parsed = parseUrls(urls, {
      extractEmbeddedUrls: this.config.followEmbeddedUrls,
    });

    const items = this.processUrlItems(parsed, 'url');
    return this.createResult(items, startTime);
  }

  // ===========================================================================
  // HTML Extraction
  // ===========================================================================

  fromHtml(html: string, baseUrl?: string): ExtractionResult<TMeta> {
    const startTime = Date.now();

    if (!html) {
      return this.createResult([], startTime);
    }

    const parsed = parseHtml(html, baseUrl ? { baseUrl } : {});
    const items = this.processHtmlItems(parsed, 'html');
    return this.createResult(items, startTime);
  }

  // ===========================================================================
  // DOM Extraction
  // ===========================================================================

  fromElement(element: Element, _baseUrl?: string): ExtractionResult<TMeta> {
    const startTime = Date.now();

    if (!element) {
      return this.createResult([], startTime);
    }

    const parsed = parseDom(element, {
      traverseIframes: false,
      traverseShadowDom: true,
    });

    const items = this.processDomItems(parsed, 'dom');
    return this.createResult(items, startTime);
  }

  fromDocument(doc?: Document): ExtractionResult<TMeta> {
    const startTime = Date.now();

    const targetDoc = doc || (typeof document !== 'undefined' ? document : null);
    if (!targetDoc) {
      return this.createResult([], startTime);
    }

    const parsed = parseDocument({
      traverseIframes: false,
      traverseShadowDom: true,
    });

    const items = this.processDomItems(parsed, 'dom');
    return this.createResult(items, startTime);
  }

  // ===========================================================================
  // DataTransfer / Clipboard Extraction
  // ===========================================================================

  fromDataTransfer(dataTransfer: DataTransfer | null): ExtractionResult<TMeta> {
    const startTime = Date.now();

    if (!dataTransfer) {
      return this.createResult([], startTime);
    }

    const parsed = parseDataTransfer(dataTransfer, {
      extractEmbeddedUrls: this.config.followEmbeddedUrls,
    });

    const items = this.processDataTransferItems(parsed, 'drop');
    return this.createResult(items, startTime);
  }

  fromClipboard(clipboardData: DataTransfer | null): ExtractionResult<TMeta> {
    const startTime = Date.now();

    if (!clipboardData) {
      return this.createResult([], startTime);
    }

    // Use parseDataTransfer for DataTransfer objects (clipboard uses the same format)
    const parsed = parseDataTransfer(clipboardData, {
      extractEmbeddedUrls: this.config.followEmbeddedUrls,
    });

    const items = this.processDataTransferItems(parsed, 'paste');
    return this.createResult(items, startTime);
  }

  fromDragEvent(event: DragEvent): ExtractionResult<TMeta> {
    return this.fromDataTransfer(event.dataTransfer);
  }

  fromClipboardEvent(event: ClipboardEvent): ExtractionResult<TMeta> {
    return this.fromClipboard(event.clipboardData);
  }

  // ===========================================================================
  // File Extraction
  // ===========================================================================

  fromFiles(files: File[] | FileList): ExtractionResult<TMeta> {
    const startTime = Date.now();
    const fileArray = Array.from(files);

    const items: ExtractedMedia<TMeta>[] = [];

    for (const file of fileArray) {
      if (items.length >= this.config.maxItems) break;

      const mediaType = getMediaType(file.name, this.config.confidenceThreshold);
      if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
        continue;
      }

      const objectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(file) : '';

      const item = this.createMediaItem(objectUrl, 'file', mediaType, {
        file,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
      });

      items.push(item);
    }

    return this.createResult(items, startTime);
  }

  // ===========================================================================
  // Combined Extraction
  // ===========================================================================

  extract(source: string | Element | DataTransfer | File[] | FileList): ExtractionResult<TMeta> {
    if (typeof source === 'string') {
      if (isAbsoluteUrl(source)) {
        return this.fromUrl(source);
      }
      return this.fromHtml(source);
    }

    if (source instanceof Element) {
      return this.fromElement(source);
    }

    if (source instanceof DataTransfer) {
      return this.fromDataTransfer(source);
    }

    if (source instanceof FileList || (Array.isArray(source) && source[0] instanceof File)) {
      return this.fromFiles(source);
    }

    return this.createResult([], Date.now());
  }

  extractAll(sources: (string | Element | DataTransfer | File[])[]): ExtractionResult<TMeta> {
    const startTime = Date.now();
    const allItems: ExtractedMedia<TMeta>[] = [];
    const stats = {
      urlsProcessed: 0,
      itemsExtracted: 0,
      itemsFiltered: 0,
      invalidUrls: 0,
      blockedUrls: 0,
      quarantinedUrls: 0,
    };

    for (const source of sources) {
      const result = this.extract(source);
      allItems.push(...result.items);

      stats.urlsProcessed += result.stats.urlsProcessed;
      stats.itemsExtracted += result.stats.itemsExtracted;
      stats.invalidUrls += result.stats.invalidUrls;
      stats.blockedUrls += result.stats.blockedUrls;
      stats.quarantinedUrls += result.stats.quarantinedUrls;
    }

    const deduped = this.config.deduplication
      ? deduplicate(allItems, { strategy: 'normalized' })
      : allItems;

    const filtered = applyFilters(deduped, this.config.filters as FilterConfig);
    stats.itemsFiltered = deduped.length - filtered.length;

    const limited = filtered.slice(0, this.config.maxItems);

    return {
      items: limited,
      stats: {
        ...stats,
        itemsExtracted: limited.length,
        extractionTimeMs: Date.now() - startTime,
      },
    };
  }

  // ===========================================================================
  // Internal Processing
  // ===========================================================================

  private processUrlItems(items: UrlExtractedItem[], source: MediaSource): ExtractedMedia<TMeta>[] {
    const result: ExtractedMedia<TMeta>[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (result.length >= this.config.maxItems) break;
      if (!item.url || !isAbsoluteUrl(item.url)) continue;

      const normalized = normalizeUrl(item.url);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const detection = detectMediaType(item.url);
      const mediaType =
        detection.confidence >= this.config.confidenceThreshold ? detection.type : 'unknown';

      if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
        continue;
      }

      const media = this.createMediaItem(item.url, item.source || source, mediaType, {
        confidence: detection.confidence,
      });

      result.push(media);
    }

    return applyFilters(result, this.config.filters as FilterConfig);
  }

  private processHtmlItems(
    items: HtmlExtractedItem[],
    source: MediaSource
  ): ExtractedMedia<TMeta>[] {
    const result: ExtractedMedia<TMeta>[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (result.length >= this.config.maxItems) break;
      if (!item.url || !isAbsoluteUrl(item.url)) continue;

      const normalized = normalizeUrl(item.url);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const detection = detectMediaType(item.url);
      const mediaType =
        item.mediaType ||
        (detection.confidence >= this.config.confidenceThreshold ? detection.type : 'unknown');

      if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
        continue;
      }

      // Convert MediaDimensions to required format
      const dims =
        item.dimensions?.width != null && item.dimensions?.height != null
          ? { width: item.dimensions.width, height: item.dimensions.height }
          : undefined;

      const media = this.createMediaItem(item.url, item.source || source, mediaType, {
        ...(dims && { dimensions: dims }),
        confidence: detection.confidence,
      });

      result.push(media);
    }

    return applyFilters(result, this.config.filters as FilterConfig);
  }

  private processDomItems(items: DomExtractedItem[], source: MediaSource): ExtractedMedia<TMeta>[] {
    const result: ExtractedMedia<TMeta>[] = [];
    const seen = new Set<string>();

    for (const item of items) {
      if (result.length >= this.config.maxItems) break;
      if (!item.url || !isAbsoluteUrl(item.url)) continue;

      const normalized = normalizeUrl(item.url);
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const detection = detectMediaType(item.url);
      const mediaType =
        item.mediaType ||
        (detection.confidence >= this.config.confidenceThreshold ? detection.type : 'unknown');

      if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
        continue;
      }

      // Convert MediaDimensions to required format
      const dims =
        item.dimensions?.width != null && item.dimensions?.height != null
          ? { width: item.dimensions.width, height: item.dimensions.height }
          : undefined;

      const media = this.createMediaItem(item.url, item.source || source, mediaType, {
        ...(dims && { dimensions: dims }),
        confidence: detection.confidence,
      });

      result.push(media);
    }

    return applyFilters(result, this.config.filters as FilterConfig);
  }

  private processDataTransferItems(
    items: DataTransferExtractedItem[],
    source: 'drop' | 'paste'
  ): ExtractedMedia<TMeta>[] {
    const result: ExtractedMedia<TMeta>[] = [];

    for (const item of items) {
      if (result.length >= this.config.maxItems) break;

      // Handle file items
      if (item.file) {
        const mediaType = getMediaType(item.file.name, this.config.confidenceThreshold);
        if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
          continue;
        }

        const objectUrl = typeof URL !== 'undefined' ? URL.createObjectURL(item.file) : '';

        const media = this.createMediaItem(objectUrl, source, mediaType, {
          file: item.file,
          filename: item.file.name,
          mimeType: item.file.type,
          fileSize: item.file.size,
        });

        result.push(media);
      }
      // Handle URL items
      else if (item.url && isAbsoluteUrl(item.url)) {
        const detection = detectMediaType(item.url);
        const mediaType =
          item.mediaType ||
          (detection.confidence >= this.config.confidenceThreshold ? detection.type : 'unknown');

        if (!this.config.mediaTypes.includes(mediaType) && mediaType !== 'unknown') {
          continue;
        }

        const media = this.createMediaItem(item.url, item.source || source, mediaType, {
          confidence: detection.confidence,
        });

        result.push(media);
      }
    }

    return result;
  }

  private createMediaItem(
    url: string,
    source: MediaSource,
    mediaType: MediaType,
    extras: {
      file?: File;
      filename?: string;
      mimeType?: string;
      fileSize?: number;
      dimensions?: { width: number; height: number };
      confidence?: number;
    } = {}
  ): ExtractedMedia<TMeta> {
    const security = this.securityScanner.scan(
      url,
      extras.dimensions
        ? {
            dimensions: {
              width: extras.dimensions.width,
              height: extras.dimensions.height,
            },
          }
        : {}
    );

    const filename = extras.filename || extractFilename(url);
    const extension = extractExtension(url);
    const mimeType = extras.mimeType || getMimeFromExtension(extension);

    this.extractionCount++;

    const result: ExtractedMedia<TMeta> = {
      id: `media_${this.extractionCount}_${Date.now()}`,
      url,
      source,
      mediaType,
      security,
      extractedAt: new Date(),
      metadata: undefined as TMeta,
    };

    // Only add optional properties if they have values
    if (extras.file) result.file = extras.file;
    if (filename) result.filename = filename;
    if (mimeType) result.mimeType = mimeType;
    if (extras.fileSize) result.fileSize = extras.fileSize;
    if (extras.dimensions) {
      result.dimensions = {
        width: extras.dimensions.width,
        height: extras.dimensions.height,
      };
    }

    return result;
  }

  private createResult(
    items: ExtractedMedia<TMeta>[],
    startTime: number,
    additionalStats: Partial<ExtractionResult<TMeta>['stats']> = {}
  ): ExtractionResult<TMeta> {
    const blocked = items.filter((i) => i.security.status === 'blocked').length;
    const quarantined = items.filter((i) => i.security.status === 'quarantined').length;

    const finalItems =
      this.config.security.mode === 'permissive'
        ? items
        : items.filter((i) => i.security.status !== 'blocked');

    return {
      items: finalItems,
      stats: {
        urlsProcessed: items.length + (additionalStats.invalidUrls || 0),
        itemsExtracted: finalItems.length,
        itemsFiltered: items.length - finalItems.length,
        invalidUrls: 0,
        blockedUrls: blocked,
        quarantinedUrls: quarantined,
        extractionTimeMs: Date.now() - startTime,
        ...additionalStats,
      },
    };
  }
}

// =============================================================================
// Factory Functions
// =============================================================================

export function createExtractor<TMeta = unknown>(
  config?: Partial<ExtractorConfig>
): MediaExtractor<TMeta> {
  return new MediaExtractor<TMeta>(config);
}

export function createSecureExtractor<TMeta = unknown>(
  preset: keyof typeof SECURITY_PRESETS = 'balanced'
): MediaExtractor<TMeta> {
  return new MediaExtractor<TMeta>({
    security: SECURITY_PRESETS[preset],
  });
}

export function createFilteredExtractor<TMeta = unknown>(
  preset: keyof typeof FILTER_PRESETS = 'standard'
): MediaExtractor<TMeta> {
  return new MediaExtractor<TMeta>({
    filters: FILTER_PRESETS[preset],
  });
}

// =============================================================================
// Quick Extraction Functions
// =============================================================================

let defaultExtractor: MediaExtractor | null = null;

function getDefaultExtractor(): MediaExtractor {
  if (!defaultExtractor) {
    defaultExtractor = new MediaExtractor({
      security: { mode: 'balanced' },
      deduplication: true,
    });
  }
  return defaultExtractor;
}

export function extractFromUrl(url: string): ExtractionResult {
  return getDefaultExtractor().fromUrl(url);
}

export function extractFromHtml(html: string, baseUrl?: string): ExtractionResult {
  return getDefaultExtractor().fromHtml(html, baseUrl);
}

export function extractFromElement(element: Element): ExtractionResult {
  return getDefaultExtractor().fromElement(element);
}

export function extractFromDataTransfer(dataTransfer: DataTransfer): ExtractionResult {
  return getDefaultExtractor().fromDataTransfer(dataTransfer);
}

export function extractFromClipboard(clipboardData: DataTransfer): ExtractionResult {
  return getDefaultExtractor().fromClipboard(clipboardData);
}

export function extractFromFiles(files: File[] | FileList): ExtractionResult {
  return getDefaultExtractor().fromFiles(files);
}
