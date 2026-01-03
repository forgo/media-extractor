/**
 * Filters module index
 *
 * Provides a unified API for filtering extracted media items.
 */

import type { ExtractedMedia, MediaType, DimensionFilter } from '../types';

// Re-export all filter modules
export * from './dimensions';
export * from './patterns';
export * from './dedup';

// Import for combined filter
import { filterByDimensions, checkFileSize, DIMENSION_PRESETS } from './dimensions';
import { filterByPatterns, type PatternFilterConfig, COMMON_EXCLUDE_PATTERNS } from './patterns';
import { deduplicate, type DedupeOptions, type DedupeStrategy } from './dedup';

// =============================================================================
// Combined Filter Configuration
// =============================================================================

/**
 * Combined filter configuration
 */
export interface FilterConfig {
  /** Media types to include (default: all) */
  mediaTypes?: MediaType[];

  /** Dimension filter */
  dimensions?: DimensionFilter;

  /** URL pattern filter */
  patterns?: PatternFilterConfig;

  /** Deduplication options */
  dedupe?: DedupeOptions | boolean;

  /** Security filter - only include certain statuses */
  securityStatuses?: ExtractedMedia['security']['status'][];

  /** Minimum file size in bytes */
  minFileSize?: number;

  /** Maximum file size in bytes */
  maxFileSize?: number;

  /** Custom filter function */
  customFilter?: (item: ExtractedMedia) => boolean;

  /** Filter out common unwanted items (tracking, ads, etc.) */
  filterUnwanted?: boolean;
}

/**
 * Filter presets for common use cases
 */
export const FILTER_PRESETS = {
  /** Allow everything, no filtering */
  none: {},

  /** Basic filtering - remove tiny images and duplicates */
  basic: {
    dimensions: DIMENSION_PRESETS.noTiny,
    dedupe: true,
    filterUnwanted: true,
  },

  /** Standard filtering for most use cases */
  standard: {
    dimensions: DIMENSION_PRESETS.noSmall,
    dedupe: { strategy: 'normalized' as DedupeStrategy },
    securityStatuses: ['safe', 'unchecked'] as const,
    filterUnwanted: true,
  },

  /** Strict filtering for high-quality content only */
  strict: {
    dimensions: DIMENSION_PRESETS.mediumPlus,
    dedupe: { strategy: 'smart' as DedupeStrategy, preferWithDimensions: true },
    securityStatuses: ['safe'] as const,
    filterUnwanted: true,
    patterns: {
      exclude: [
        ...COMMON_EXCLUDE_PATTERNS.tracking,
        ...COMMON_EXCLUDE_PATTERNS.uiElements,
        ...COMMON_EXCLUDE_PATTERNS.ads,
        ...COMMON_EXCLUDE_PATTERNS.thumbnails,
      ],
    },
  },

  /** Photos only - optimized for photography */
  photos: {
    mediaTypes: ['image'] as MediaType[],
    dimensions: DIMENSION_PRESETS.photo,
    dedupe: { strategy: 'smart' as DedupeStrategy, preferWithDimensions: true },
    filterUnwanted: true,
  },

  /** Videos only */
  videos: {
    mediaTypes: ['video'] as MediaType[],
    dedupe: true,
  },

  /** Documents only */
  documents: {
    mediaTypes: ['document'] as MediaType[],
    dedupe: true,
  },
} as const;

// =============================================================================
// Combined Filter Function
// =============================================================================

/**
 * Apply a combined filter configuration to media items
 *
 * @param items - Array of extracted media items
 * @param config - Filter configuration
 * @returns Filtered array of media items
 */
export function applyFilters<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  config: FilterConfig = {}
): ExtractedMedia<TMeta>[] {
  let filtered = [...items];

  // Filter by media type
  if (config.mediaTypes && config.mediaTypes.length > 0) {
    filtered = filtered.filter((item) => config.mediaTypes!.includes(item.mediaType));
  }

  // Filter by security status
  if (config.securityStatuses && config.securityStatuses.length > 0) {
    filtered = filtered.filter((item) => config.securityStatuses!.includes(item.security.status));
  }

  // Filter out common unwanted items
  if (config.filterUnwanted) {
    const unwantedPatterns = [
      ...COMMON_EXCLUDE_PATTERNS.tracking,
      ...COMMON_EXCLUDE_PATTERNS.uiElements,
      ...COMMON_EXCLUDE_PATTERNS.ads,
      ...COMMON_EXCLUDE_PATTERNS.placeholders,
    ];
    filtered = filterByPatterns(filtered, { exclude: unwantedPatterns });
  }

  // Apply dimension filter
  if (config.dimensions) {
    filtered = filterByDimensions(filtered, config.dimensions);
  }

  // Apply file size filter
  if (config.minFileSize !== undefined || config.maxFileSize !== undefined) {
    const sizeConfig: { minFileSize?: number; maxFileSize?: number } = {};
    if (config.minFileSize !== undefined) sizeConfig.minFileSize = config.minFileSize;
    if (config.maxFileSize !== undefined) sizeConfig.maxFileSize = config.maxFileSize;
    filtered = filtered.filter((item) => checkFileSize(item.fileSize, sizeConfig));
  }

  // Apply pattern filter
  if (config.patterns) {
    filtered = filterByPatterns(filtered, config.patterns);
  }

  // Apply custom filter
  if (config.customFilter) {
    filtered = filtered.filter(config.customFilter);
  }

  // Apply deduplication (last step to work on filtered set)
  if (config.dedupe) {
    const dedupeOptions: DedupeOptions = typeof config.dedupe === 'boolean' ? {} : config.dedupe;
    filtered = deduplicate(filtered, dedupeOptions);
  }

  return filtered;
}

/**
 * Apply a preset filter to media items
 *
 * @param items - Array of extracted media items
 * @param preset - Preset name
 * @returns Filtered array of media items
 */
export function applyPreset<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  preset: keyof typeof FILTER_PRESETS
): ExtractedMedia<TMeta>[] {
  return applyFilters(items, FILTER_PRESETS[preset] as FilterConfig);
}

// =============================================================================
// Filter Builder
// =============================================================================

/**
 * Fluent filter builder for constructing complex filters
 */
export class FilterBuilder<TMeta = unknown> {
  private items: ExtractedMedia<TMeta>[];
  private config: FilterConfig = {};

  constructor(items: ExtractedMedia<TMeta>[]) {
    this.items = items;
  }

  /**
   * Filter by media types
   */
  mediaTypes(...types: MediaType[]): this {
    this.config.mediaTypes = types;
    return this;
  }

  /**
   * Filter images only
   */
  imagesOnly(): this {
    this.config.mediaTypes = ['image'];
    return this;
  }

  /**
   * Filter videos only
   */
  videosOnly(): this {
    this.config.mediaTypes = ['video'];
    return this;
  }

  /**
   * Apply dimension filter
   */
  dimensions(filter: DimensionFilter): this {
    this.config.dimensions = filter;
    return this;
  }

  /**
   * Apply dimension preset
   */
  dimensionPreset(preset: keyof typeof DIMENSION_PRESETS): this {
    this.config.dimensions = DIMENSION_PRESETS[preset];
    return this;
  }

  /**
   * Set minimum dimensions
   */
  minSize(width: number, height: number): this {
    this.config.dimensions = {
      ...this.config.dimensions,
      minWidth: width,
      minHeight: height,
    };
    return this;
  }

  /**
   * Set maximum dimensions
   */
  maxSize(width: number, height: number): this {
    this.config.dimensions = {
      ...this.config.dimensions,
      maxWidth: width,
      maxHeight: height,
    };
    return this;
  }

  /**
   * Apply URL patterns
   */
  patterns(patterns: PatternFilterConfig): this {
    this.config.patterns = patterns;
    return this;
  }

  /**
   * Add include patterns
   */
  include(...patterns: (string | RegExp)[]): this {
    this.config.patterns = {
      ...this.config.patterns,
      include: [...(this.config.patterns?.include || []), ...patterns],
    };
    return this;
  }

  /**
   * Add exclude patterns
   */
  exclude(...patterns: (string | RegExp)[]): this {
    this.config.patterns = {
      ...this.config.patterns,
      exclude: [...(this.config.patterns?.exclude || []), ...patterns],
    };
    return this;
  }

  /**
   * Allow only specific domains
   */
  fromDomains(...domains: string[]): this {
    this.config.patterns = {
      ...this.config.patterns,
      allowedDomains: domains,
    };
    return this;
  }

  /**
   * Block specific domains
   */
  notFromDomains(...domains: string[]): this {
    this.config.patterns = {
      ...this.config.patterns,
      blockedDomains: domains,
    };
    return this;
  }

  /**
   * Apply deduplication
   */
  dedupe(options?: DedupeOptions): this {
    this.config.dedupe = options || true;
    return this;
  }

  /**
   * Use smart deduplication
   */
  smartDedupe(): this {
    this.config.dedupe = { strategy: 'smart', preferWithDimensions: true };
    return this;
  }

  /**
   * Filter by security status
   */
  securityStatus(...statuses: ExtractedMedia['security']['status'][]): this {
    this.config.securityStatuses = statuses;
    return this;
  }

  /**
   * Only include safe items
   */
  safeOnly(): this {
    this.config.securityStatuses = ['safe'];
    return this;
  }

  /**
   * Set file size range
   */
  fileSize(options: { min?: number; max?: number }): this {
    if (options.min !== undefined) {
      this.config.minFileSize = options.min;
    }
    if (options.max !== undefined) {
      this.config.maxFileSize = options.max;
    }
    return this;
  }

  /**
   * Add custom filter function
   */
  filter(fn: (item: ExtractedMedia<TMeta>) => boolean): this {
    const existing = this.config.customFilter;
    // Cast to any to work around generic variance issues
    this.config.customFilter = existing
      ? (item) => existing(item) && (fn as (item: ExtractedMedia) => boolean)(item)
      : (fn as (item: ExtractedMedia) => boolean);
    return this;
  }

  /**
   * Remove common unwanted items
   */
  removeUnwanted(): this {
    this.config.filterUnwanted = true;
    return this;
  }

  /**
   * Execute the filter and return results
   */
  execute(): ExtractedMedia<TMeta>[] {
    return applyFilters(this.items, this.config);
  }

  /**
   * Get the first matching item
   */
  first(): ExtractedMedia<TMeta> | null {
    const results = this.execute();
    return results[0] ?? null;
  }

  /**
   * Count matching items
   */
  count(): number {
    return this.execute().length;
  }

  /**
   * Check if any items match
   */
  any(): boolean {
    return this.count() > 0;
  }
}

/**
 * Create a filter builder for fluent filtering
 */
export function filter<TMeta = unknown>(items: ExtractedMedia<TMeta>[]): FilterBuilder<TMeta> {
  return new FilterBuilder(items);
}
