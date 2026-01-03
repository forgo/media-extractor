/**
 * Deduplication module for media items
 *
 * Provides functions to identify and remove duplicate media items
 * using various strategies (URL, content hash, similarity).
 */

import type { ExtractedMedia } from '../types';
import { normalizeUrl, getDedupeKey, extractDomain, isDataUrl } from '../utils/url';
import { calculateAspectRatio } from './dimensions';

// =============================================================================
// Deduplication Strategies
// =============================================================================

/**
 * Deduplication strategy
 */
export type DedupeStrategy =
  | 'exact' // Exact URL match only
  | 'normalized' // Normalized URL (lowercase, sorted params, etc.)
  | 'path' // Same domain + path (ignores query string)
  | 'filename' // Same filename (ignores path)
  | 'smart'; // Combination of strategies

/**
 * Deduplication options
 */
export interface DedupeOptions {
  /** Deduplication strategy */
  strategy?: DedupeStrategy;

  /** Keep first or last occurrence of duplicates */
  keepFirst?: boolean;

  /** Prefer items with dimensions over those without */
  preferWithDimensions?: boolean;

  /** Prefer items from certain domains */
  preferredDomains?: string[];

  /** Prefer items with certain sources */
  preferredSources?: ExtractedMedia['source'][];

  /** Custom key generator function */
  keyGenerator?: (item: ExtractedMedia) => string;
}

// =============================================================================
// Key Generation Functions
// =============================================================================

/**
 * Generate a dedup key based on strategy
 */
export function generateDedupeKey(
  item: ExtractedMedia,
  strategy: DedupeStrategy = 'normalized'
): string {
  const url = item.url;

  switch (strategy) {
    case 'exact':
      return url;

    case 'normalized':
      return normalizeUrl(url);

    case 'path':
      return getDedupeKey(url);

    case 'filename':
      return extractFilenameKey(url);

    case 'smart':
      return generateSmartKey(item);

    default:
      return normalizeUrl(url);
  }
}

/**
 * Extract just the filename for comparison
 */
function extractFilenameKey(url: string): string {
  try {
    // Handle data URLs specially
    if (isDataUrl(url)) {
      // Use the full data URL as key (they should be unique)
      return url;
    }

    const parsed = new URL(url);
    const path = parsed.pathname;
    const filename = path.split('/').pop() || '';

    // Remove query params and fragment from filename
    return (filename.split(/[?#]/)[0] ?? '').toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Generate a "smart" dedup key that considers multiple factors
 */
function generateSmartKey(item: ExtractedMedia): string {
  const url = item.url;

  // Handle data URLs
  if (isDataUrl(url)) {
    return url;
  }

  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();

    // Get filename without extension for fuzzy matching
    const pathParts = path.split('/');
    const filename = pathParts.pop() || '';
    const filenameNoExt = filename.replace(/\.[^.]+$/, '');

    // For images, try to identify the "base" image name
    // (remove size indicators, etc.)
    const baseFilename = filenameNoExt
      .replace(/[-_](small|medium|large|thumb|thumbnail|preview)$/i, '')
      .replace(/[-_]\d+x\d+$/i, '') // Remove size suffixes like _800x600
      .replace(/[-_](s|m|l|xl|xxl)$/i, '') // Remove size codes
      .replace(/@\d+x$/i, ''); // Remove @2x, @3x etc.

    // Include enough path context to distinguish different images
    // with the same filename
    const pathContext = pathParts.slice(-2).join('/');

    return `${domain}/${pathContext}/${baseFilename}`;
  } catch {
    return normalizeUrl(url);
  }
}

// =============================================================================
// Scoring for Preference
// =============================================================================

/**
 * Score an item for preference when deduplicating
 * Higher score = more preferred
 */
export function scoreItem(item: ExtractedMedia, options: DedupeOptions): number {
  let score = 0;

  // Prefer items with dimensions
  if (options.preferWithDimensions && item.dimensions) {
    const { width, height } = item.dimensions;
    if (width !== null && height !== null) {
      score += 10;
      // Bonus for larger images
      score += Math.min(20, Math.floor((width * height) / 100000));
    }
  }

  // Prefer items from preferred domains
  if (options.preferredDomains && options.preferredDomains.length > 0) {
    const domain = extractDomain(item.url);
    const index = options.preferredDomains.indexOf(domain);
    if (index >= 0) {
      score += 50 - index * 5; // Earlier in list = higher preference
    }
  }

  // Prefer items from preferred sources
  if (options.preferredSources && options.preferredSources.length > 0) {
    const index = options.preferredSources.indexOf(item.source);
    if (index >= 0) {
      score += 30 - index * 3; // Earlier in list = higher preference
    }
  }

  // Prefer items with file info
  if (item.filename) score += 5;
  if (item.mimeType) score += 5;
  if (item.fileSize) score += 5;

  // Prefer safe items over quarantined
  if (item.security.status === 'safe') {
    score += 20;
  } else if (item.security.status === 'quarantined') {
    score += 5;
  }

  return score;
}

// =============================================================================
// Deduplication Functions
// =============================================================================

/**
 * Remove duplicate media items
 *
 * @param items - Array of extracted media items
 * @param options - Deduplication options
 * @returns Deduplicated array of media items
 */
export function deduplicate<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  options: DedupeOptions = {}
): ExtractedMedia<TMeta>[] {
  const { strategy = 'normalized', keepFirst = true, keyGenerator } = options;

  // Map to store best item for each key
  const seen = new Map<string, { item: ExtractedMedia<TMeta>; score: number; index: number }>();

  items.forEach((item, index) => {
    // Generate dedup key
    const key = keyGenerator ? keyGenerator(item) : generateDedupeKey(item, strategy);

    const existing = seen.get(key);

    if (!existing) {
      // First occurrence
      seen.set(key, {
        item,
        score: scoreItem(item, options),
        index,
      });
    } else {
      // Duplicate found - decide which to keep
      const newScore = scoreItem(item, options);

      // If scores are equal, use keepFirst preference
      const shouldReplace =
        newScore > existing.score || (newScore === existing.score && !keepFirst);

      if (shouldReplace) {
        seen.set(key, { item, score: newScore, index });
      }
    }
  });

  // Return items in original order
  const result = Array.from(seen.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.item);

  return result;
}

/**
 * Find duplicate groups in media items
 *
 * @param items - Array of extracted media items
 * @param strategy - Deduplication strategy
 * @returns Map of dedup key to array of duplicate items
 */
export function findDuplicates<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  strategy: DedupeStrategy = 'normalized'
): Map<string, ExtractedMedia<TMeta>[]> {
  const groups = new Map<string, ExtractedMedia<TMeta>[]>();

  for (const item of items) {
    const key = generateDedupeKey(item, strategy);
    const existing = groups.get(key) || [];
    existing.push(item);
    groups.set(key, existing);
  }

  // Filter to only groups with actual duplicates
  const duplicates = new Map<string, ExtractedMedia<TMeta>[]>();
  for (const [key, group] of groups) {
    if (group.length > 1) {
      duplicates.set(key, group);
    }
  }

  return duplicates;
}

/**
 * Count duplicates in a list of items
 */
export function countDuplicates<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  strategy: DedupeStrategy = 'normalized'
): number {
  const uniqueCount = deduplicate(items, { strategy }).length;
  return items.length - uniqueCount;
}

// =============================================================================
// Similarity Detection
// =============================================================================

/**
 * Check if two items are likely the same image at different sizes
 */
export function isSizeVariant(item1: ExtractedMedia, item2: ExtractedMedia): boolean {
  // Must be from the same domain
  if (extractDomain(item1.url) !== extractDomain(item2.url)) {
    return false;
  }

  // Must have similar aspect ratios (within 10%)
  if (item1.dimensions && item2.dimensions) {
    const ratio1 = calculateAspectRatio(item1.dimensions);
    const ratio2 = calculateAspectRatio(item2.dimensions);

    if (ratio1 !== null && ratio2 !== null) {
      const difference = Math.abs(ratio1 - ratio2) / Math.max(ratio1, ratio2);
      if (difference > 0.1) {
        return false;
      }
    }
  }

  // Check if URLs indicate size variants
  const sizePatterns = [
    /[-_](small|medium|large|thumb|preview|full|original)/i,
    /[-_]\d+x\d+/i,
    /[-_](s|m|l|xl|xxl)/i,
    /@\d+x/i,
    /\?.*(?:size|width|height|w|h)=/i,
  ];

  // Remove size indicators from both URLs
  let url1 = item1.url;
  let url2 = item2.url;

  for (const pattern of sizePatterns) {
    url1 = url1.replace(pattern, '');
    url2 = url2.replace(pattern, '');
  }

  // If URLs match after removing size indicators, they're variants
  return normalizeUrl(url1) === normalizeUrl(url2);
}

/**
 * Group items that are size variants of each other
 */
export function groupSizeVariants<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): ExtractedMedia<TMeta>[][] {
  const groups: ExtractedMedia<TMeta>[][] = [];
  const assigned = new Set<number>();

  for (let i = 0; i < items.length; i++) {
    if (assigned.has(i)) continue;

    const item = items[i];
    if (!item) continue;

    const group: ExtractedMedia<TMeta>[] = [item];
    assigned.add(i);

    for (let j = i + 1; j < items.length; j++) {
      if (assigned.has(j)) continue;

      const otherItem = items[j];
      if (!otherItem) continue;

      if (isSizeVariant(item, otherItem)) {
        group.push(otherItem);
        assigned.add(j);
      }
    }

    groups.push(group);
  }

  return groups;
}

/**
 * Keep only the largest variant from each size variant group
 */
export function keepLargestVariants<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): ExtractedMedia<TMeta>[] {
  const groups = groupSizeVariants(items);

  return groups
    .map((group) => {
      const first = group[0];
      if (!first) return undefined;
      if (group.length === 1) return first;

      // Find the largest by dimensions
      return group.reduce((best, current) => {
        const bestPixels = best.dimensions
          ? (best.dimensions.width ?? 0) * (best.dimensions.height ?? 0)
          : 0;
        const currentPixels = current.dimensions
          ? (current.dimensions.width ?? 0) * (current.dimensions.height ?? 0)
          : 0;

        return currentPixels > bestPixels ? current : best;
      });
    })
    .filter((item): item is ExtractedMedia<TMeta> => item !== undefined);
}
