/**
 * Dimension-based filtering for media items
 *
 * Filters media by width, height, aspect ratio, and file size constraints.
 */

import type { ExtractedMedia, MediaDimensions, DimensionFilter } from '../types';

// =============================================================================
// Dimension Filter Presets
// =============================================================================

/**
 * Preset dimension filters for common use cases
 */
export const DIMENSION_PRESETS = {
  /** Allow any dimensions */
  any: {
    minWidth: 0,
    minHeight: 0,
  },

  /** Filter out tiny images (likely icons/spacers) */
  noTiny: {
    minWidth: 32,
    minHeight: 32,
  },

  /** Filter out small images (likely thumbnails) */
  noSmall: {
    minWidth: 100,
    minHeight: 100,
  },

  /** Medium or larger images */
  mediumPlus: {
    minWidth: 300,
    minHeight: 200,
  },

  /** Large images only */
  largeOnly: {
    minWidth: 800,
    minHeight: 600,
  },

  /** HD or larger */
  hdPlus: {
    minWidth: 1280,
    minHeight: 720,
  },

  /** Full HD or larger */
  fullHdPlus: {
    minWidth: 1920,
    minHeight: 1080,
  },

  /** 4K or larger */
  fourKPlus: {
    minWidth: 3840,
    minHeight: 2160,
  },

  /** Square-ish aspect ratios (good for profile pics) */
  squarish: {
    minAspectRatio: 0.8,
    maxAspectRatio: 1.2,
  },

  /** Wide/landscape images */
  landscape: {
    minAspectRatio: 1.3,
  },

  /** Tall/portrait images */
  portrait: {
    maxAspectRatio: 0.8,
  },

  /** Banner-style images (very wide) */
  banner: {
    minAspectRatio: 2.5,
    minWidth: 600,
  },

  /** Standard photo dimensions (avoid icons/tracking) */
  photo: {
    minWidth: 200,
    minHeight: 150,
    minAspectRatio: 0.5,
    maxAspectRatio: 3.0,
  },
} as const;

// =============================================================================
// Dimension Checking Functions
// =============================================================================

/**
 * Calculate aspect ratio from dimensions
 */
export function calculateAspectRatio(dimensions: MediaDimensions): number | null {
  const { width, height } = dimensions;
  if (width === null || height === null || height === 0) {
    return null;
  }
  return width / height;
}

/**
 * Calculate total pixel count
 */
export function calculatePixelCount(dimensions: MediaDimensions): number | null {
  const { width, height } = dimensions;
  if (width === null || height === null) {
    return null;
  }
  return width * height;
}

/**
 * Check if dimensions pass a filter
 */
export function checkDimensions(
  dimensions: MediaDimensions | undefined,
  filter: DimensionFilter
): boolean {
  // If no dimensions available and filter requires them
  if (!dimensions) {
    // If filter has any requirements, fail (unless explicitly allowing unknown)
    const hasRequirements =
      filter.minWidth !== undefined ||
      filter.minHeight !== undefined ||
      filter.maxWidth !== undefined ||
      filter.maxHeight !== undefined ||
      filter.minAspectRatio !== undefined ||
      filter.maxAspectRatio !== undefined;

    return !hasRequirements;
  }

  const { width, height } = dimensions;
  const aspectRatio = calculateAspectRatio(dimensions);

  // Check width constraints
  if (filter.minWidth !== undefined) {
    if (width === null || width < filter.minWidth) return false;
  }
  if (filter.maxWidth !== undefined) {
    if (width === null || width > filter.maxWidth) return false;
  }

  // Check height constraints
  if (filter.minHeight !== undefined) {
    if (height === null || height < filter.minHeight) return false;
  }
  if (filter.maxHeight !== undefined) {
    if (height === null || height > filter.maxHeight) return false;
  }

  // Check aspect ratio constraints
  if (filter.minAspectRatio !== undefined) {
    if (aspectRatio === null || aspectRatio < filter.minAspectRatio) return false;
  }
  if (filter.maxAspectRatio !== undefined) {
    if (aspectRatio === null || aspectRatio > filter.maxAspectRatio) return false;
  }

  return true;
}

/**
 * Check if a media item's file size passes filter
 */
export function checkFileSize(
  fileSize: number | undefined,
  filter: { minFileSize?: number; maxFileSize?: number }
): boolean {
  if (fileSize === undefined) {
    // If no size info and filter requires it, consider it passing
    // (we can't know the size until we download)
    return true;
  }

  if (filter.minFileSize !== undefined && fileSize < filter.minFileSize) {
    return false;
  }

  if (filter.maxFileSize !== undefined && fileSize > filter.maxFileSize) {
    return false;
  }

  return true;
}

// =============================================================================
// Filter Creation Helpers
// =============================================================================

/**
 * Create a dimension filter from a preset name
 */
export function createPresetFilter(preset: keyof typeof DIMENSION_PRESETS): DimensionFilter {
  return { ...DIMENSION_PRESETS[preset] };
}

/**
 * Combine multiple dimension filters (uses most restrictive values)
 */
export function combineDimensionFilters(...filters: DimensionFilter[]): DimensionFilter {
  const combined: DimensionFilter = {};

  for (const filter of filters) {
    // Take the largest minimum values
    if (filter.minWidth !== undefined) {
      combined.minWidth = Math.max(combined.minWidth ?? 0, filter.minWidth);
    }
    if (filter.minHeight !== undefined) {
      combined.minHeight = Math.max(combined.minHeight ?? 0, filter.minHeight);
    }
    if (filter.minAspectRatio !== undefined) {
      combined.minAspectRatio = Math.max(combined.minAspectRatio ?? 0, filter.minAspectRatio);
    }

    // Take the smallest maximum values
    if (filter.maxWidth !== undefined) {
      combined.maxWidth = Math.min(combined.maxWidth ?? Infinity, filter.maxWidth);
    }
    if (filter.maxHeight !== undefined) {
      combined.maxHeight = Math.min(combined.maxHeight ?? Infinity, filter.maxHeight);
    }
    if (filter.maxAspectRatio !== undefined) {
      combined.maxAspectRatio = Math.min(
        combined.maxAspectRatio ?? Infinity,
        filter.maxAspectRatio
      );
    }
  }

  return combined;
}

// =============================================================================
// Media Filtering Functions
// =============================================================================

/**
 * Filter extracted media items by dimensions
 *
 * @param items - Array of extracted media items
 * @param filter - Dimension filter to apply
 * @returns Filtered array of media items
 */
export function filterByDimensions<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  filter: DimensionFilter
): ExtractedMedia<TMeta>[] {
  return items.filter((item) => checkDimensions(item.dimensions, filter));
}

/**
 * Filter extracted media items by file size
 *
 * @param items - Array of extracted media items
 * @param options - Size filter options
 * @returns Filtered array of media items
 */
export function filterByFileSize<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  options: { minFileSize?: number; maxFileSize?: number }
): ExtractedMedia<TMeta>[] {
  return items.filter((item) => checkFileSize(item.fileSize, options));
}

/**
 * Sort media items by dimensions (largest first)
 */
export function sortBySize<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  order: 'asc' | 'desc' = 'desc'
): ExtractedMedia<TMeta>[] {
  return [...items].sort((a, b) => {
    const pixelsA = a.dimensions ? (calculatePixelCount(a.dimensions) ?? 0) : 0;
    const pixelsB = b.dimensions ? (calculatePixelCount(b.dimensions) ?? 0) : 0;
    return order === 'desc' ? pixelsB - pixelsA : pixelsA - pixelsB;
  });
}

/**
 * Sort media items by aspect ratio
 */
export function sortByAspectRatio<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[],
  order: 'asc' | 'desc' = 'desc'
): ExtractedMedia<TMeta>[] {
  return [...items].sort((a, b) => {
    const ratioA = a.dimensions ? (calculateAspectRatio(a.dimensions) ?? 0) : 0;
    const ratioB = b.dimensions ? (calculateAspectRatio(b.dimensions) ?? 0) : 0;
    return order === 'desc' ? ratioB - ratioA : ratioA - ratioB;
  });
}

/**
 * Get the largest media item by pixel count
 */
export function getLargest<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): ExtractedMedia<TMeta> | null {
  if (items.length === 0) return null;

  let largest = items[0];
  if (!largest) return null;

  let largestPixels = largest.dimensions ? (calculatePixelCount(largest.dimensions) ?? 0) : 0;

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    if (!item) continue;

    const pixels = item.dimensions ? (calculatePixelCount(item.dimensions) ?? 0) : 0;
    if (pixels > largestPixels) {
      largest = item;
      largestPixels = pixels;
    }
  }

  return largest;
}

/**
 * Group media items by size category
 */
export function groupBySize<TMeta = unknown>(
  items: ExtractedMedia<TMeta>[]
): Record<'tiny' | 'small' | 'medium' | 'large' | 'unknown', ExtractedMedia<TMeta>[]> {
  const groups = {
    tiny: [] as ExtractedMedia<TMeta>[],
    small: [] as ExtractedMedia<TMeta>[],
    medium: [] as ExtractedMedia<TMeta>[],
    large: [] as ExtractedMedia<TMeta>[],
    unknown: [] as ExtractedMedia<TMeta>[],
  };

  for (const item of items) {
    if (!item.dimensions || item.dimensions.width === null) {
      groups.unknown.push(item);
      continue;
    }

    const pixels = calculatePixelCount(item.dimensions) ?? 0;

    if (pixels < 32 * 32) {
      groups.tiny.push(item);
    } else if (pixels < 300 * 200) {
      groups.small.push(item);
    } else if (pixels < 1280 * 720) {
      groups.medium.push(item);
    } else {
      groups.large.push(item);
    }
  }

  return groups;
}
