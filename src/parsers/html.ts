/**
 * HTML parser module
 *
 * Extracts media URLs from HTML strings by parsing the DOM structure.
 */

import type { MediaType, MediaSource, MediaHint, MediaDimensions } from '../types';
import { isAbsoluteUrl, isDataUrl, isBlobUrl, normalizeUrl } from '../utils/url';
import { extractFilename, extractExtension } from '../utils/filename';
import { detectMediaType } from '../detectors';

/**
 * Raw extracted item from HTML parsing
 */
export interface HtmlExtractedItem {
  url: string;
  source: MediaSource;
  mediaType: MediaType;
  format: string;
  filename: string;
  dimensions?: MediaDimensions;
  hint: MediaHint;
  confidence: number;
  dedupeKey?: string;
  alt?: string;
  title?: string;
  srcset?: string;
  /** URL of parent anchor link, if the element is wrapped in <a> */
  linkUrl?: string;
}

/**
 * Options for HTML parsing
 */
export interface HtmlParseOptions {
  /** Base URL for resolving relative URLs */
  baseUrl?: string;

  /** Additional CSS selectors to search */
  selectors?: string[];

  /** Selectors to ignore */
  ignoreSelectors?: string[];

  /** Media types to extract */
  mediaTypes?: MediaType[];

  /** Extract srcset URLs */
  extractSrcset?: boolean;

  /** Extract background images from inline styles */
  extractBackgroundImages?: boolean;

  /** Extract links to media files */
  extractLinks?: boolean;
}

const DEFAULT_OPTIONS: HtmlParseOptions = {
  mediaTypes: ['image', 'video', 'audio', 'document'],
  extractSrcset: true,
  extractBackgroundImages: true,
  extractLinks: true,
};

/**
 * Resolve a relative URL against a base URL
 */
function resolveUrl(url: string, baseUrl?: string): string | null {
  if (!url) return null;

  // Already absolute
  if (isAbsoluteUrl(url) || isDataUrl(url) || isBlobUrl(url)) {
    return url;
  }

  // Need base URL to resolve
  if (!baseUrl) return null;

  try {
    return new URL(url, baseUrl).href;
  } catch {
    return null;
  }
}

/**
 * Parse a srcset attribute and extract URLs
 */
export function parseSrcset(srcset: string, baseUrl?: string): string[] {
  if (!srcset) return [];

  const urls: string[] = [];
  const entries = srcset.split(',');

  for (const entry of entries) {
    const trimmed = entry.trim();
    // srcset format: "url descriptor" or just "url"
    const parts = trimmed.split(/\s+/);
    const firstPart = parts[0];
    if (firstPart) {
      const url = resolveUrl(firstPart, baseUrl);
      if (url) {
        urls.push(url);
      }
    }
  }

  return urls;
}

/**
 * Extract background-image URL from a style string
 */
export function extractBackgroundImageUrl(style: string, baseUrl?: string): string | null {
  if (!style) return null;

  // Match url() in background or background-image
  // Using bounded whitespace to prevent ReDoS
  const match = /url\(\s{0,20}["']?([^"'()]+)["']?\s{0,20}\)/i.exec(style);
  if (!match?.[1]) return null;

  return resolveUrl(match[1].trim(), baseUrl);
}

/**
 * Find parent anchor element and return its href
 */
function getParentLinkUrl(element: Element, baseUrl?: string): string | null {
  let current: Element | null = element;

  while (current) {
    if (current.tagName === 'A') {
      const href = current.getAttribute('href');
      if (href) {
        return resolveUrl(href, baseUrl);
      }
    }
    current = current.parentElement;
  }

  return null;
}

/**
 * Parse an HTML string and extract media items
 */
export function parseHtml(html: string, options: HtmlParseOptions = {}): HtmlExtractedItem[] {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const items: HtmlExtractedItem[] = [];
  const seen = new Set<string>();

  // Parse HTML to DOM
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Helper to add item if not duplicate
  const addItem = (item: HtmlExtractedItem) => {
    const key = item.dedupeKey || item.url;
    if (seen.has(key)) return;
    seen.add(key);
    items.push(item);
  };

  // Helper to check if element should be ignored
  const shouldIgnore = (element: Element): boolean => {
    if (!opts.ignoreSelectors) return false;
    return opts.ignoreSelectors.some((selector) => element.matches(selector));
  };

  // Helper to determine hint based on index and element context
  const getHint = (element: Element, index: number): MediaHint => {
    // First item is often primary
    if (index === 0) return 'primary';

    // Check for small images (likely UI elements)
    const width = parseInt(element.getAttribute('width') || '', 10);
    const height = parseInt(element.getAttribute('height') || '', 10);
    if (width > 0 && height > 0 && width <= 32 && height <= 32) {
      return 'ui-element';
    }

    // Check for icon/button classes
    const className = element.className.toString().toLowerCase();
    if (
      className.includes('icon') ||
      className.includes('btn') ||
      className.includes('logo') ||
      className.includes('avatar')
    ) {
      return 'ui-element';
    }

    return 'unknown';
  };

  // 1. Extract <img> elements
  if (opts.mediaTypes?.includes('image')) {
    const imgs = doc.querySelectorAll('img');
    let imgIndex = 0;

    imgs.forEach((img) => {
      if (shouldIgnore(img)) return;

      const src = resolveUrl(img.getAttribute('src') || '', opts.baseUrl);
      if (src) {
        const detection = detectMediaType(src);

        const item: HtmlExtractedItem = {
          url: src,
          source: 'html-element',
          mediaType: detection.type,
          format: extractExtension(src),
          filename: extractFilename(src),
          dimensions: {
            width: parseInt(img.getAttribute('width') || '', 10) || null,
            height: parseInt(img.getAttribute('height') || '', 10) || null,
          },
          hint: getHint(img, imgIndex),
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(src),
        };
        const alt = img.getAttribute('alt');
        const title = img.getAttribute('title');
        const srcset = img.getAttribute('srcset');
        if (alt) item.alt = alt;
        if (title) item.title = title;
        if (srcset) item.srcset = srcset;
        // Check if image is wrapped in a link
        const linkUrl = getParentLinkUrl(img, opts.baseUrl);
        if (linkUrl) item.linkUrl = linkUrl;
        addItem(item);

        imgIndex++;
      }

      // Extract srcset
      if (opts.extractSrcset) {
        const srcset = img.getAttribute('srcset');
        if (srcset) {
          const srcsetUrls = parseSrcset(srcset, opts.baseUrl);
          srcsetUrls.forEach((url) => {
            const detection = detectMediaType(url);
            addItem({
              url,
              source: 'html-element',
              mediaType: detection.type,
              format: extractExtension(url),
              filename: extractFilename(url),
              hint: 'secondary',
              confidence: detection.confidence,
              dedupeKey: normalizeUrl(url),
            });
          });
        }
      }
    });

    // Extract <picture> sources
    const sources = doc.querySelectorAll('picture source');
    sources.forEach((source) => {
      if (shouldIgnore(source)) return;

      const srcset = source.getAttribute('srcset');
      if (srcset) {
        const urls = parseSrcset(srcset, opts.baseUrl);
        urls.forEach((url) => {
          const detection = detectMediaType(url);
          addItem({
            url,
            source: 'html-element',
            mediaType: detection.type,
            format: extractExtension(url),
            filename: extractFilename(url),
            hint: 'secondary',
            confidence: detection.confidence,
            dedupeKey: normalizeUrl(url),
          });
        });
      }
    });

    // Extract inline SVG
    const svgs = doc.querySelectorAll('svg');
    svgs.forEach((svg) => {
      if (shouldIgnore(svg)) return;

      const svgString = svg.outerHTML;
      const dataUrl = `data:image/svg+xml,${encodeURIComponent(svgString)}`;

      let dimensions: MediaDimensions | undefined;
      const viewBox = svg.getAttribute('viewBox');
      if (viewBox) {
        const parts = viewBox.split(/\s+/);
        const w = parts[2];
        const h = parts[3];
        if (parts.length >= 4 && w && h) {
          dimensions = {
            width: parseFloat(w) || null,
            height: parseFloat(h) || null,
          };
        }
      }

      const svgItem: HtmlExtractedItem = {
        url: dataUrl,
        source: 'html-element',
        mediaType: 'image',
        format: 'svg',
        filename: 'inline-svg',
        hint: 'unknown',
        confidence: 1.0,
      };
      if (dimensions) svgItem.dimensions = dimensions;
      addItem(svgItem);
    });

    // Extract background images
    if (opts.extractBackgroundImages) {
      const allElements = doc.querySelectorAll('*');
      allElements.forEach((el) => {
        if (shouldIgnore(el)) return;

        const style = el.getAttribute('style');
        if (style) {
          const bgUrl = extractBackgroundImageUrl(style, opts.baseUrl);
          if (bgUrl) {
            const detection = detectMediaType(bgUrl);
            if (detection.type === 'image') {
              const bgItem: HtmlExtractedItem = {
                url: bgUrl,
                source: 'html-element',
                mediaType: 'image',
                format: extractExtension(bgUrl),
                filename: extractFilename(bgUrl),
                hint: 'secondary',
                confidence: detection.confidence,
                dedupeKey: normalizeUrl(bgUrl),
              };
              // Check if element is wrapped in a link
              const linkUrl = getParentLinkUrl(el, opts.baseUrl);
              if (linkUrl) bgItem.linkUrl = linkUrl;
              addItem(bgItem);
            }
          }
        }
      });
    }
  }

  // 2. Extract <video> elements
  if (opts.mediaTypes?.includes('video')) {
    const videos = doc.querySelectorAll('video');
    videos.forEach((video, index) => {
      if (shouldIgnore(video)) return;

      const src = resolveUrl(video.getAttribute('src') || '', opts.baseUrl);
      if (src) {
        const detection = detectMediaType(src);
        addItem({
          url: src,
          source: 'html-element',
          mediaType: detection.type !== 'unknown' ? detection.type : 'video',
          format: extractExtension(src),
          filename: extractFilename(src),
          dimensions: {
            width: parseInt(video.getAttribute('width') || '', 10) || null,
            height: parseInt(video.getAttribute('height') || '', 10) || null,
          },
          hint: index === 0 ? 'primary' : 'unknown',
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(src),
        });
      }

      // Video sources
      video.querySelectorAll('source').forEach((source) => {
        const srcUrl = resolveUrl(source.getAttribute('src') || '', opts.baseUrl);
        if (srcUrl) {
          const detection = detectMediaType(srcUrl);
          addItem({
            url: srcUrl,
            source: 'html-element',
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
      const poster = resolveUrl(video.getAttribute('poster') || '', opts.baseUrl);
      if (poster && opts.mediaTypes?.includes('image')) {
        addItem({
          url: poster,
          source: 'html-element',
          mediaType: 'image',
          format: extractExtension(poster),
          filename: extractFilename(poster),
          hint: 'secondary',
          confidence: 0.9,
          dedupeKey: normalizeUrl(poster),
        });
      }
    });
  }

  // 3. Extract <audio> elements
  if (opts.mediaTypes?.includes('audio')) {
    const audios = doc.querySelectorAll('audio');
    audios.forEach((audio, index) => {
      if (shouldIgnore(audio)) return;

      const src = resolveUrl(audio.getAttribute('src') || '', opts.baseUrl);
      if (src) {
        const detection = detectMediaType(src);
        addItem({
          url: src,
          source: 'html-element',
          mediaType: detection.type !== 'unknown' ? detection.type : 'audio',
          format: extractExtension(src),
          filename: extractFilename(src),
          hint: index === 0 ? 'primary' : 'unknown',
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(src),
        });
      }

      // Audio sources
      audio.querySelectorAll('source').forEach((source) => {
        const srcUrl = resolveUrl(source.getAttribute('src') || '', opts.baseUrl);
        if (srcUrl) {
          const detection = detectMediaType(srcUrl);
          addItem({
            url: srcUrl,
            source: 'html-element',
            mediaType: detection.type !== 'unknown' ? detection.type : 'audio',
            format: extractExtension(srcUrl),
            filename: extractFilename(srcUrl),
            hint: 'secondary',
            confidence: detection.confidence,
            dedupeKey: normalizeUrl(srcUrl),
          });
        }
      });
    });
  }

  // 4. Extract links to media files
  if (opts.extractLinks) {
    const links = doc.querySelectorAll('a[href]');
    links.forEach((link) => {
      if (shouldIgnore(link)) return;

      const href = resolveUrl(link.getAttribute('href') || '', opts.baseUrl);
      if (!href) return;

      const detection = detectMediaType(href);
      if (detection.type !== 'unknown' && opts.mediaTypes?.includes(detection.type)) {
        const linkItem: HtmlExtractedItem = {
          url: href,
          source: 'html-element',
          mediaType: detection.type,
          format: extractExtension(href),
          filename: extractFilename(href),
          hint: 'unknown',
          confidence: detection.confidence,
          dedupeKey: normalizeUrl(href),
        };
        const title = link.getAttribute('title');
        if (title) linkItem.title = title;
        addItem(linkItem);
      }
    });
  }

  // 5. Custom selectors
  if (opts.selectors) {
    opts.selectors.forEach((selector) => {
      const elements = doc.querySelectorAll(selector);
      elements.forEach((el) => {
        if (shouldIgnore(el)) return;

        // Try to extract URL from common attributes
        const possibleAttrs = ['src', 'href', 'data-src', 'data-url', 'data-image'];
        for (const attr of possibleAttrs) {
          const url = resolveUrl(el.getAttribute(attr) || '', opts.baseUrl);
          if (url) {
            const detection = detectMediaType(url);
            if (detection.type !== 'unknown' && opts.mediaTypes?.includes(detection.type)) {
              addItem({
                url,
                source: 'html-element',
                mediaType: detection.type,
                format: extractExtension(url),
                filename: extractFilename(url),
                hint: 'unknown',
                confidence: detection.confidence,
                dedupeKey: normalizeUrl(url),
              });
            }
          }
        }
      });
    });
  }

  return items;
}
