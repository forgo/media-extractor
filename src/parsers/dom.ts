/**
 * DOM parser module
 *
 * Extracts media from live DOM elements.
 */

import type { MediaType, MediaSource, MediaHint, MediaDimensions } from '../types';
import { isAbsoluteUrl, isDataUrl, isBlobUrl, normalizeUrl } from '../utils/url';
import { extractFilename, extractExtension } from '../utils/filename';
import { detectMediaType } from '../detectors';

/**
 * Raw extracted item from DOM parsing
 */
export interface DomExtractedItem {
  url: string;
  source: MediaSource;
  mediaType: MediaType;
  format: string;
  filename: string;
  dimensions?: MediaDimensions;
  hint: MediaHint;
  confidence: number;
  dedupeKey?: string;
  element?: Element;
  alt?: string;
  title?: string;
  /** URL of parent anchor link, if the element is wrapped in <a> */
  linkUrl?: string;
}

/**
 * Options for DOM parsing
 */
export interface DomParseOptions {
  /** Media types to extract */
  mediaTypes?: MediaType[];

  /** Extract from iframes (same-origin only) */
  traverseIframes?: boolean;

  /** Extract from shadow DOM */
  traverseShadowDom?: boolean;

  /** Extract background images via computed styles */
  extractBackgroundImages?: boolean;

  /** Include hidden elements */
  includeHidden?: boolean;

  /** Minimum dimensions for images (skip smaller) */
  minDimensions?: { width: number; height: number };

  /** Additional selectors to search */
  customSelectors?: string[];

  /** Selectors to ignore */
  ignoreSelectors?: string[];
}

const DEFAULT_OPTIONS: DomParseOptions = {
  mediaTypes: ['image', 'video', 'audio', 'document'],
  traverseIframes: false,
  traverseShadowDom: false,
  extractBackgroundImages: true,
  includeHidden: false,
  minDimensions: { width: 1, height: 1 },
};

/**
 * Check if an element is visible
 */
function isVisible(element: Element): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
}

/**
 * Get natural dimensions of an element
 */
function getDimensions(element: Element): MediaDimensions {
  if (element instanceof HTMLImageElement) {
    return {
      width: element.naturalWidth || element.width || null,
      height: element.naturalHeight || element.height || null,
    };
  }

  if (element instanceof HTMLVideoElement) {
    return {
      width: element.videoWidth || element.width || null,
      height: element.videoHeight || element.height || null,
    };
  }

  const rect = element.getBoundingClientRect();
  return {
    width: rect.width || null,
    height: rect.height || null,
  };
}

/**
 * Extract background-image URL from computed styles
 */
function getBackgroundImageUrl(element: Element): string | null {
  const style = window.getComputedStyle(element);
  const bgImage = style.backgroundImage;

  if (!bgImage || bgImage === 'none') return null;

  // Extract URL from url("...")
  const match = bgImage.match(/url\s*\(\s*['"]?([^'")\s]+)['"]?\s*\)/i);
  return match?.[1] ?? null;
}

/**
 * Find parent anchor element and return its href
 */
function getParentLinkUrl(element: Element): string | null {
  let current: Element | null = element;

  while (current) {
    if (current instanceof HTMLAnchorElement && current.href) {
      return current.href;
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Determine hint based on element and context
 */
function getHint(element: Element, dimensions?: MediaDimensions): MediaHint {
  // Small images are likely UI elements
  if (dimensions?.width && dimensions?.height) {
    if (dimensions.width <= 32 && dimensions.height <= 32) {
      return 'ui-element';
    }
  }

  // Check classes for UI indicators
  const className = element.className.toString().toLowerCase();
  if (
    className.includes('icon') ||
    className.includes('btn') ||
    className.includes('button') ||
    className.includes('logo') ||
    className.includes('avatar') ||
    className.includes('thumbnail')
  ) {
    return 'ui-element';
  }

  // Check data attributes
  if (element.hasAttribute('data-icon') || element.hasAttribute('role')) {
    const role = element.getAttribute('role');
    if (role === 'button' || role === 'icon') {
      return 'ui-element';
    }
  }

  return 'unknown';
}

/**
 * Parse a DOM element and its descendants for media
 */
export function parseDom(
  root: Element,
  options: DomParseOptions = {}
): DomExtractedItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const items: DomExtractedItem[] = [];
  const seen = new Set<string>();

  // Helper to add item if not duplicate
  const addItem = (item: DomExtractedItem) => {
    const key = item.dedupeKey || item.url;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  // Helper to check if element should be ignored
  const shouldIgnore = (element: Element): boolean => {
    if (opts.ignoreSelectors) {
      for (const selector of opts.ignoreSelectors) {
        try {
          if (element.matches(selector)) return true;
        } catch {
          // Invalid selector, skip
        }
      }
    }
    return false;
  };

  // Helper to check dimensions
  const meetsDimensionRequirements = (dimensions?: MediaDimensions): boolean => {
    if (!opts.minDimensions) return true;
    if (!dimensions) return true;

    const { width, height } = dimensions;
    if (width === null || height === null) return true;

    return width >= opts.minDimensions.width && height >= opts.minDimensions.height;
  };

  // Process an element tree
  const processElement = (element: Element) => {
    // Skip hidden elements if configured
    if (!opts.includeHidden && !isVisible(element)) return;

    // Skip ignored elements
    if (shouldIgnore(element)) return;

    // Process images
    if (element instanceof HTMLImageElement && opts.mediaTypes?.includes('image')) {
      const src = element.currentSrc || element.src;
      if (src && (isAbsoluteUrl(src) || isDataUrl(src) || isBlobUrl(src))) {
        const dimensions = getDimensions(element);

        if (meetsDimensionRequirements(dimensions)) {
          const detection = detectMediaType(src);
          const item: DomExtractedItem = {
            url: src,
            source: 'dom-element',
            mediaType: detection.type !== 'unknown' ? detection.type : 'image',
            format: extractExtension(src),
            filename: extractFilename(src),
            dimensions,
            hint: getHint(element, dimensions),
            confidence: detection.confidence,
            dedupeKey: normalizeUrl(src),
            element,
          };
          if (element.alt) item.alt = element.alt;
          if (element.title) item.title = element.title;
          // Check if image is wrapped in a link
          const linkUrl = getParentLinkUrl(element);
          if (linkUrl) item.linkUrl = linkUrl;
          addItem(item);
        }
      }
    }

    // Process videos
    if (element instanceof HTMLVideoElement && opts.mediaTypes?.includes('video')) {
      const src = element.currentSrc || element.src;
      if (src && (isAbsoluteUrl(src) || isBlobUrl(src))) {
        const dimensions = getDimensions(element);
        const detection = detectMediaType(src);

        const item: DomExtractedItem = {
          url: src,
          source: 'dom-element',
          mediaType: detection.type !== 'unknown' ? detection.type : 'video',
          format: extractExtension(src),
          filename: extractFilename(src),
          dimensions,
          hint: 'unknown',
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(src),
          element,
        };
        if (element.title) item.title = element.title;
        addItem(item);
      }

      // Video sources
      element.querySelectorAll('source').forEach((source) => {
        const srcUrl = source.src;
        if (srcUrl && isAbsoluteUrl(srcUrl)) {
          const detection = detectMediaType(srcUrl);
          addItem({
            url: srcUrl,
            source: 'dom-element',
            mediaType: detection.type !== 'unknown' ? detection.type : 'video',
            format: extractExtension(srcUrl),
            filename: extractFilename(srcUrl),
            hint: 'secondary',
            confidence: detection.confidence,
            dedupeKey: normalizeUrl(srcUrl),
          });
        }
      });

      // Video poster
      if (element.poster && opts.mediaTypes?.includes('image')) {
        addItem({
          url: element.poster,
          source: 'dom-element',
          mediaType: 'image',
          format: extractExtension(element.poster),
          filename: extractFilename(element.poster),
          hint: 'secondary',
          confidence: 0.9,
          dedupeKey: normalizeUrl(element.poster),
        });
      }
    }

    // Process audio
    if (element instanceof HTMLAudioElement && opts.mediaTypes?.includes('audio')) {
      const src = element.currentSrc || element.src;
      if (src && (isAbsoluteUrl(src) || isBlobUrl(src))) {
        const detection = detectMediaType(src);

        addItem({
          url: src,
          source: 'dom-element',
          mediaType: detection.type !== 'unknown' ? detection.type : 'audio',
          format: extractExtension(src),
          filename: extractFilename(src),
          hint: 'unknown',
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(src),
          element,
        });
      }

      // Audio sources
      element.querySelectorAll('source').forEach((source) => {
        const srcUrl = source.src;
        if (srcUrl && isAbsoluteUrl(srcUrl)) {
          const detection = detectMediaType(srcUrl);
          addItem({
            url: srcUrl,
            source: 'dom-element',
            mediaType: detection.type !== 'unknown' ? detection.type : 'audio',
            format: extractExtension(srcUrl),
            filename: extractFilename(srcUrl),
            hint: 'secondary',
            confidence: detection.confidence,
            dedupeKey: normalizeUrl(srcUrl),
          });
        }
      });
    }

    // Process background images
    if (opts.extractBackgroundImages && opts.mediaTypes?.includes('image')) {
      const bgUrl = getBackgroundImageUrl(element);
      if (bgUrl && (isAbsoluteUrl(bgUrl) || isDataUrl(bgUrl))) {
        const detection = detectMediaType(bgUrl);
        if (detection.type === 'image') {
          const dimensions = getDimensions(element);

          if (meetsDimensionRequirements(dimensions)) {
            const item: DomExtractedItem = {
              url: bgUrl,
              source: 'dom-element',
              mediaType: 'image',
              format: extractExtension(bgUrl),
              filename: extractFilename(bgUrl),
              dimensions,
              hint: 'secondary',
              confidence: detection.confidence,
              dedupeKey: normalizeUrl(bgUrl),
              element,
            };
            // Check if element is wrapped in a link
            const linkUrl = getParentLinkUrl(element);
            if (linkUrl) item.linkUrl = linkUrl;
            addItem(item);
          }
        }
      }
    }

    // Process shadow DOM
    if (opts.traverseShadowDom && element.shadowRoot) {
      element.shadowRoot.querySelectorAll('*').forEach(processElement);
    }

    // Process children
    element.querySelectorAll('*').forEach(processElement);
  };

  // Process iframes
  const processIframe = (iframe: HTMLIFrameElement) => {
    if (!opts.traverseIframes) return;

    try {
      const doc = iframe.contentDocument;
      if (doc && doc.body) {
        doc.body.querySelectorAll('*').forEach(processElement);
      }
    } catch {
      // Cross-origin iframe, can't access
    }
  };

  // Start processing
  processElement(root);

  // Process iframes if requested
  if (opts.traverseIframes) {
    root.querySelectorAll('iframe').forEach((iframe) => {
      processIframe(iframe as HTMLIFrameElement);
    });
  }

  // Process custom selectors
  if (opts.customSelectors) {
    opts.customSelectors.forEach((selector) => {
      try {
        root.querySelectorAll(selector).forEach((el) => {
          // Try to extract URL from common attributes
          const possibleAttrs = ['src', 'href', 'data-src', 'data-url', 'data-image'];
          for (const attr of possibleAttrs) {
            const url = el.getAttribute(attr);
            if (url && (isAbsoluteUrl(url) || isDataUrl(url) || isBlobUrl(url))) {
              const detection = detectMediaType(url);
              if (opts.mediaTypes?.includes(detection.type)) {
                addItem({
                  url,
                  source: 'dom-element',
                  mediaType: detection.type,
                  format: extractExtension(url),
                  filename: extractFilename(url),
                  hint: 'unknown',
                  confidence: detection.confidence,
                  dedupeKey: normalizeUrl(url),
                  element: el,
                });
              }
            }
          }
        });
      } catch {
        // Invalid selector, skip
      }
    });
  }

  return items;
}

/**
 * Parse the entire document for media
 */
export function parseDocument(options: DomParseOptions = {}): DomExtractedItem[] {
  return parseDom(document.body, options);
}
