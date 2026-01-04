/**
 * URL pattern-based filtering for media items
 *
 * Provides include/exclude patterns for filtering media by URL.
 */

import type { ExtractedMedia, MediaType } from '../types';
import { extractDomain, extractPath, extractRegisteredDomain } from '../utils/url';

// =============================================================================
// Pattern Types
// =============================================================================

/**
 * Pattern matching mode
 */
export type PatternMode = 'include' | 'exclude';

/**
 * Pattern definition for URL filtering
 */
export interface UrlPattern {
  /** The pattern string or regex */
  pattern: string | RegExp;

  /** Whether this is an include or exclude pattern */
  mode: PatternMode;

  /** Optional description for the pattern */
  description?: string;

  /** Limit to specific media types */
  mediaTypes?: MediaType[];
}

/**
 * Pattern filter configuration
 */
export interface PatternFilterConfig {
  /** Include patterns - URLs must match at least one */
  include?: (string | RegExp)[];

  /** Exclude patterns - URLs matching any will be removed */
  exclude?: (string | RegExp)[];

  /** Domain whitelist - only allow URLs from these domains */
  allowedDomains?: string[];

  /** Domain blacklist - reject URLs from these domains */
  blockedDomains?: string[];

  /** Path patterns to include */
  pathPatterns?: (string | RegExp)[];

  /** Case sensitive matching (default: false) */
  caseSensitive?: boolean;
}

// =============================================================================
// Common Patterns
// =============================================================================

/**
 * Common exclude patterns for unwanted media
 */
export const COMMON_EXCLUDE_PATTERNS = {
  /** Tracking pixels and beacons */
  tracking: [
    /pixel\.(gif|png)/i,
    /beacon\.(gif|png)/i,
    /spacer\.(gif|png)/i,
    /clear\.(gif|png)/i,
    /1x1\.(gif|png)/i,
    /tracking/i,
    /analytics/i,
    /stat\.(gif|png)/i,
  ],

  /** Social media buttons and icons */
  socialIcons: [
    /facebook[^/]*icon/i,
    /twitter[^/]*icon/i,
    /instagram[^/]*icon/i,
    /linkedin[^/]*icon/i,
    /pinterest[^/]*icon/i,
    /share[^/]*button/i,
    /social[^/]*icon/i,
  ],

  /** UI elements and icons */
  uiElements: [
    /\/icons?\//i,
    /\/sprites?\//i,
    /\/buttons?\//i,
    /\/arrows?\//i,
    /\/logos?\//i,
    /loading\.(gif|png|svg)/i,
    /spinner\.(gif|png|svg)/i,
  ],

  /** Ads and monetization */
  ads: [
    /doubleclick/i,
    /googlesyndication/i,
    /googleadservices/i,
    /ad\d+\./i,
    /\/ads?\//i,
    /\/advert/i,
    /banner[^/]*ad/i,
  ],

  /** Placeholder images */
  placeholders: [
    /placeholder/i,
    /blank\.(gif|png|jpg)/i,
    /empty\.(gif|png|jpg)/i,
    /default[^/]*avatar/i,
    /no[^/]*image/i,
  ],

  /** Avatar/profile images (small) */
  avatars: [/avatar/i, /profile[^/]*pic/i, /user[^/]*thumb/i, /\/avatars?\//i],

  /** Thumbnail suffixes */
  thumbnails: [
    /_thumb\./i,
    /-thumb\./i,
    /_small\./i,
    /-small\./i,
    /_thumbnail\./i,
    /\/thumbnails?\//i,
    /\?[^#]*size=s/i,
    /\?[^#]*w=\d{1,2}&/i, // Very small width params
  ],
} as const;

/**
 * Common include patterns for quality content
 */
export const COMMON_INCLUDE_PATTERNS = {
  /** Full-size image indicators */
  fullSize: [
    /_full\./i,
    /-full\./i,
    /_large\./i,
    /-large\./i,
    /_original\./i,
    /\/originals?\//i,
    /\/full\//i,
  ],

  /** High resolution indicators */
  highRes: [
    /@2x\./i,
    /@3x\./i,
    /_hd\./i,
    /-hd\./i,
    /_hq\./i,
    /[_-]2k\./i,
    /[_-]4k\./i,
    /\/hires?\//i,
  ],

  /** Photo galleries */
  galleries: [/\/gallery\//i, /\/photos?\//i, /\/images?\//i, /\/pictures?\//i, /\/media\//i],

  /** Content images */
  content: [/\/content\//i, /\/articles?\//i, /\/posts?\//i, /\/uploads?\//i],
} as const;

// =============================================================================
// Pattern Matching Functions
// =============================================================================

/**
 * Compile a pattern string to a RegExp
 */
function compilePattern(pattern: string | RegExp, caseSensitive: boolean): RegExp {
  if (pattern instanceof RegExp) {
    if (caseSensitive) {
      return pattern;
    }
    // Remove 'i' flag if present and caseSensitive is false
    return new RegExp(
      pattern.source,
      pattern.flags.includes('i') ? pattern.flags : pattern.flags + 'i'
    );
  }

  // Escape special regex characters for literal matching
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Support wildcards: * -> .*, ? -> .
  const wildcarded = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');

  return new RegExp(wildcarded, caseSensitive ? '' : 'i');
}

/**
 * Check if a URL matches a pattern
 */
export function matchesPattern(
  url: string,
  pattern: string | RegExp,
  caseSensitive = false
): boolean {
  const regex = compilePattern(pattern, caseSensitive);
  return regex.test(url);
}

/**
 * Check if a URL matches any pattern in a list
 */
export function matchesAnyPattern(
  url: string,
  patterns: (string | RegExp)[],
  caseSensitive = false
): boolean {
  return patterns.some((pattern) => matchesPattern(url, pattern, caseSensitive));
}

/**
 * Check if a domain matches an allowed/blocked domain
 * Supports wildcards: *.example.com matches sub.example.com
 */
export function matchesDomain(url: string, domain: string): boolean {
  const urlDomain = extractDomain(url).toLowerCase();
  const targetDomain = domain.toLowerCase();

  // Exact match
  if (urlDomain === targetDomain) {
    return true;
  }

  // Wildcard match (*.example.com)
  if (targetDomain.startsWith('*.')) {
    const baseDomain = targetDomain.slice(2);
    return urlDomain === baseDomain || urlDomain.endsWith('.' + baseDomain);
  }

  // Registered domain match (matches all subdomains)
  const urlRegistered = extractRegisteredDomain(url);
  if (urlRegistered === targetDomain) {
    return true;
  }

  return false;
}

// =============================================================================
// Filter Functions
// =============================================================================

/**
 * Apply pattern filter to a URL
 *
 * @param url - The URL to check
 * @param config - Pattern filter configuration
 * @returns true if the URL passes the filter
 */
export function checkPatternFilter(url: string, config: PatternFilterConfig): boolean {
  const caseSensitive = config.caseSensitive ?? false;

  // Check domain whitelist (if specified, URL must be from allowed domain)
  if (config.allowedDomains && config.allowedDomains.length > 0) {
    if (!config.allowedDomains.some((domain) => matchesDomain(url, domain))) {
      return false;
    }
  }

  // Check domain blacklist
  if (config.blockedDomains && config.blockedDomains.length > 0) {
    if (config.blockedDomains.some((domain) => matchesDomain(url, domain))) {
      return false;
    }
  }

  // Check exclude patterns first (reject if matches any)
  if (config.exclude && config.exclude.length > 0) {
    if (matchesAnyPattern(url, config.exclude, caseSensitive)) {
      return false;
    }
  }

  // Check include patterns (if specified, must match at least one)
  if (config.include && config.include.length > 0) {
    if (!matchesAnyPattern(url, config.include, caseSensitive)) {
      return false;
    }
  }

  // Check path patterns (if specified, path must match at least one)
  if (config.pathPatterns && config.pathPatterns.length > 0) {
    const path = extractPath(url);
    if (!matchesAnyPattern(path, config.pathPatterns, caseSensitive)) {
      return false;
    }
  }

  return true;
}

/**
 * Filter extracted media items by URL patterns
 *
 * @param items - Array of extracted media items
 * @param config - Pattern filter configuration
 * @returns Filtered array of media items
 */
export function filterByPatterns<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  config: PatternFilterConfig
): ExtractedMedia<TMeta>[] {
  return items.filter((item) => checkPatternFilter(item.url, config));
}

/**
 * Filter out common unwanted media (tracking, icons, etc.)
 *
 * @param items - Array of extracted media items
 * @returns Filtered array without common unwanted items
 */
export function filterOutUnwanted<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): ExtractedMedia<TMeta>[] {
  const excludePatterns = [
    ...COMMON_EXCLUDE_PATTERNS.tracking,
    ...COMMON_EXCLUDE_PATTERNS.uiElements,
    ...COMMON_EXCLUDE_PATTERNS.ads,
    ...COMMON_EXCLUDE_PATTERNS.placeholders,
  ];

  return filterByPatterns(items, { exclude: excludePatterns });
}

/**
 * Filter to only include high-quality content images
 *
 * @param items - Array of extracted media items
 * @returns Filtered array with likely high-quality content
 */
export function filterForQuality<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): ExtractedMedia<TMeta>[] {
  // First remove unwanted
  const filtered = filterOutUnwanted(items);

  // Then keep only if matches quality patterns OR doesn't match thumbnail patterns
  const thumbnailPatterns = [...COMMON_EXCLUDE_PATTERNS.thumbnails];

  return filtered.filter((item) => {
    // If it matches a quality indicator, keep it
    const qualityPatterns = [
      ...COMMON_INCLUDE_PATTERNS.fullSize,
      ...COMMON_INCLUDE_PATTERNS.highRes,
    ];
    if (matchesAnyPattern(item.url, qualityPatterns)) {
      return true;
    }

    // If it matches a thumbnail pattern, reject it
    if (matchesAnyPattern(item.url, thumbnailPatterns)) {
      return false;
    }

    // Otherwise keep it
    return true;
  });
}

// =============================================================================
// Domain Filtering
// =============================================================================

/**
 * Filter media items to only include specific domains
 */
export function filterByDomain<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  domains: string[]
): ExtractedMedia<TMeta>[] {
  return items.filter((item) => domains.some((domain) => matchesDomain(item.url, domain)));
}

/**
 * Filter out media items from specific domains
 */
export function excludeByDomain<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  domains: string[]
): ExtractedMedia<TMeta>[] {
  return items.filter((item) => !domains.some((domain) => matchesDomain(item.url, domain)));
}

/**
 * Group media items by domain
 */
export function groupByDomain<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): Map<string, ExtractedMedia<TMeta>[]> {
  const groups = new Map<string, ExtractedMedia<TMeta>[]>();

  for (const item of items) {
    const domain = extractRegisteredDomain(item.url) || 'unknown';
    const existing = groups.get(domain) || [];
    existing.push(item);
    groups.set(domain, existing);
  }

  return groups;
}
