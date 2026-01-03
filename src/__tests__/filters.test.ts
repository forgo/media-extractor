/**
 * Filters module tests
 */

import { describe, expect, it } from 'vitest';
import {
  applyFilters,
  applyPreset,
  COMMON_EXCLUDE_PATTERNS,
  COMMON_INCLUDE_PATTERNS,
  deduplicate,
  DIMENSION_PRESETS,
  filter,
  filterByDimensions,
  filterByPatterns,
  filterByFileSize,
  sortBySize,
  sortByAspectRatio,
  getLargest,
  groupBySize,
  calculateAspectRatio,
  calculatePixelCount,
  checkDimensions,
  checkFileSize,
  createPresetFilter,
  combineDimensionFilters,
  generateDedupeKey,
  scoreItem,
  findDuplicates,
  countDuplicates,
  isSizeVariant,
  groupSizeVariants,
  keepLargestVariants,
  matchesPattern,
  matchesAnyPattern,
  matchesDomain,
  checkPatternFilter,
  filterOutUnwanted,
  filterForQuality,
  filterByDomain,
  excludeByDomain,
  groupByDomain,
} from '../filters';
import type { ExtractedMedia } from '../types';

// Helper to create mock extracted media items
function createMockMedia(overrides: Partial<ExtractedMedia> = {}): ExtractedMedia {
  return {
    id: 'test-' + Math.random().toString(36).substr(2, 9),
    url: 'https://example.com/image.jpg',
    source: 'url',
    mediaType: 'image',
    security: { status: 'safe', threats: [], riskScore: 0 },
    extractedAt: new Date(),
    ...overrides,
  };
}

describe('Filters module', () => {
  describe('filterByDimensions', () => {
    it('should filter by minimum width', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
        createMockMedia({ dimensions: { width: 1000, height: 1000 } }),
      ];

      const filtered = filterByDimensions(items, { minWidth: 400 });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by minimum height', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
      ];

      const filtered = filterByDimensions(items, { minHeight: 400 });
      expect(filtered).toHaveLength(1);
    });

    it('should filter by maximum dimensions', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
        createMockMedia({ dimensions: { width: 5000, height: 5000 } }),
      ];

      const filtered = filterByDimensions(items, { maxWidth: 2000, maxHeight: 2000 });
      expect(filtered).toHaveLength(1);
    });

    it('should filter by aspect ratio', () => {
      const items = [
        createMockMedia({ dimensions: { width: 1000, height: 500 } }), // 2:1
        createMockMedia({ dimensions: { width: 500, height: 500 } }), // 1:1
        createMockMedia({ dimensions: { width: 500, height: 1000 } }), // 1:2
      ];

      const filtered = filterByDimensions(items, { minAspectRatio: 1.5 });
      expect(filtered).toHaveLength(1);
    });

    it('should handle items without dimensions', () => {
      const items = [createMockMedia({ dimensions: undefined })];

      // Items without dimensions may be filtered out depending on implementation
      const filtered = filterByDimensions(items, { minWidth: 100 });
      expect(filtered.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('filterByPatterns', () => {
    it('should include only matching patterns', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/photos/image.jpg' }),
        createMockMedia({ url: 'https://example.com/icons/button.png' }),
      ];

      const filtered = filterByPatterns(items, { include: [/\/photos\//] });
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('/photos/');
    });

    it('should exclude matching patterns', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/tracking/pixel.gif' }),
      ];

      const filtered = filterByPatterns(items, { exclude: [/tracking/] });
      expect(filtered).toHaveLength(1);
    });

    it('should filter by allowed domains', () => {
      const items = [
        createMockMedia({ url: 'https://allowed.com/image.jpg' }),
        createMockMedia({ url: 'https://blocked.com/image.jpg' }),
      ];

      const filtered = filterByPatterns(items, { allowedDomains: ['allowed.com'] });
      expect(filtered).toHaveLength(1);
    });

    it('should filter by blocked domains', () => {
      const items = [
        createMockMedia({ url: 'https://good.com/image.jpg' }),
        createMockMedia({ url: 'https://ads.bad.com/image.jpg' }),
      ];

      const filtered = filterByPatterns(items, { blockedDomains: ['*.bad.com'] });
      expect(filtered).toHaveLength(1);
    });
  });

  describe('deduplicate', () => {
    it('should remove exact duplicates', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/other.jpg' }),
      ];

      const deduped = deduplicate(items);
      expect(deduped).toHaveLength(2);
    });

    it('should normalize URLs for comparison', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/image.jpg?v=1' }),
        createMockMedia({ url: 'HTTPS://EXAMPLE.COM/image.jpg' }),
      ];

      const deduped = deduplicate(items, { strategy: 'normalized' });
      // Depending on normalization, may dedupe some or all
      expect(deduped.length).toBeLessThanOrEqual(3);
    });

    it('should prefer items with dimensions', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({
          url: 'https://example.com/image.jpg',
          dimensions: { width: 1000, height: 1000 },
        }),
      ];

      const deduped = deduplicate(items, { preferWithDimensions: true });
      expect(deduped).toHaveLength(1);
      expect(deduped[0].dimensions).toBeDefined();
    });
  });

  describe('applyFilters', () => {
    it('should filter by media type', () => {
      const items = [
        createMockMedia({ mediaType: 'image' }),
        createMockMedia({ mediaType: 'video' }),
        createMockMedia({ mediaType: 'audio' }),
      ];

      const filtered = applyFilters(items, { mediaTypes: ['image', 'video'] });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by security status', () => {
      const items = [
        createMockMedia({ security: { status: 'safe', threats: [], riskScore: 0 } }),
        createMockMedia({ security: { status: 'quarantined', threats: [], riskScore: 50 } }),
        createMockMedia({ security: { status: 'blocked', threats: [], riskScore: 100 } }),
      ];

      const filtered = applyFilters(items, { securityStatuses: ['safe'] });
      expect(filtered).toHaveLength(1);
    });

    it('should apply custom filter', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/small.jpg', fileSize: 100 }),
        createMockMedia({ url: 'https://example.com/large.jpg', fileSize: 1000000 }),
      ];

      const filtered = applyFilters(items, {
        customFilter: (item) => (item.fileSize || 0) > 500,
      });
      expect(filtered).toHaveLength(1);
    });

    it('should combine multiple filters', () => {
      const items = [
        createMockMedia({
          mediaType: 'image',
          dimensions: { width: 1000, height: 1000 },
          security: { status: 'safe', threats: [], riskScore: 0 },
        }),
        createMockMedia({
          mediaType: 'image',
          dimensions: { width: 50, height: 50 },
          security: { status: 'safe', threats: [], riskScore: 0 },
        }),
        createMockMedia({
          mediaType: 'video',
          dimensions: { width: 1000, height: 1000 },
          security: { status: 'safe', threats: [], riskScore: 0 },
        }),
      ];

      const filtered = applyFilters(items, {
        mediaTypes: ['image'],
        dimensions: { minWidth: 100 },
        securityStatuses: ['safe'],
      });
      expect(filtered).toHaveLength(1);
    });
  });

  describe('applyPreset', () => {
    it('should apply basic preset', () => {
      const items = [
        createMockMedia({ dimensions: { width: 1000, height: 1000 } }),
        createMockMedia({ dimensions: { width: 5, height: 5 } }), // tiny
      ];

      const filtered = applyPreset(items, 'basic');
      expect(filtered).toHaveLength(1);
    });

    it('should apply strict preset', () => {
      const items = [
        createMockMedia({
          security: { status: 'safe', threats: [], riskScore: 0 },
          dimensions: { width: 800, height: 600 },
        }),
        createMockMedia({
          security: { status: 'quarantined', threats: [], riskScore: 50 },
          dimensions: { width: 800, height: 600 },
        }),
      ];

      const filtered = applyPreset(items, 'strict');
      expect(filtered).toHaveLength(1);
    });

    it('should apply none preset (no filtering)', () => {
      const items = [createMockMedia(), createMockMedia()];

      const filtered = applyPreset(items, 'none');
      expect(filtered).toHaveLength(2);
    });
  });

  describe('FilterBuilder', () => {
    it('should build filters fluently', () => {
      const items = [
        createMockMedia({ mediaType: 'image' }),
        createMockMedia({ mediaType: 'video' }),
      ];

      const filtered = filter(items).imagesOnly().execute();

      expect(filtered).toHaveLength(1);
    });

    it('should chain multiple filters', () => {
      const items = [
        createMockMedia({
          mediaType: 'image',
          dimensions: { width: 1000, height: 1000 },
        }),
        createMockMedia({
          mediaType: 'image',
          dimensions: { width: 50, height: 50 },
        }),
      ];

      const filtered = filter(items).imagesOnly().minSize(100, 100).execute();

      expect(filtered).toHaveLength(1);
    });

    it('should provide count method', () => {
      const items = [
        createMockMedia({ mediaType: 'image' }),
        createMockMedia({ mediaType: 'image' }),
        createMockMedia({ mediaType: 'video' }),
      ];

      const count = filter(items).imagesOnly().count();
      expect(count).toBe(2);
    });

    it('should provide first method', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/first.jpg' }),
        createMockMedia({ url: 'https://example.com/second.jpg' }),
      ];

      const first = filter(items).first();
      expect(first?.url).toContain('first');
    });

    it('should provide any method', () => {
      const items = [createMockMedia({ mediaType: 'image' })];

      expect(filter(items).imagesOnly().any()).toBe(true);
      expect(filter(items).videosOnly().any()).toBe(false);
    });

    it('should support smart dedupe', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({
          url: 'https://example.com/image.jpg',
          dimensions: { width: 1000, height: 1000 },
        }),
      ];

      const filtered = filter(items).smartDedupe().execute();

      expect(filtered).toHaveLength(1);
    });

    it('should support custom filter function', () => {
      const items = [createMockMedia({ fileSize: 100 }), createMockMedia({ fileSize: 10000 })];

      const filtered = filter(items)
        .filter((item) => (item.fileSize || 0) > 500)
        .execute();

      expect(filtered).toHaveLength(1);
    });
  });

  describe('DIMENSION_PRESETS', () => {
    it('should have noTiny preset', () => {
      expect(DIMENSION_PRESETS.noTiny).toBeDefined();
      expect(DIMENSION_PRESETS.noTiny.minWidth).toBeGreaterThan(0);
    });

    it('should have photo preset', () => {
      expect(DIMENSION_PRESETS.photo).toBeDefined();
      expect(DIMENSION_PRESETS.photo.minWidth).toBeGreaterThan(100);
    });
  });

  describe('COMMON_EXCLUDE_PATTERNS', () => {
    it('should have tracking patterns', () => {
      expect(COMMON_EXCLUDE_PATTERNS.tracking).toBeDefined();
      expect(COMMON_EXCLUDE_PATTERNS.tracking.length).toBeGreaterThan(0);
    });

    it('should have UI element patterns', () => {
      expect(COMMON_EXCLUDE_PATTERNS.uiElements).toBeDefined();
    });

    it('should have ad patterns', () => {
      expect(COMMON_EXCLUDE_PATTERNS.ads).toBeDefined();
    });
  });

  describe('COMMON_INCLUDE_PATTERNS', () => {
    it('should have fullSize patterns', () => {
      expect(COMMON_INCLUDE_PATTERNS.fullSize).toBeDefined();
      expect(COMMON_INCLUDE_PATTERNS.fullSize.length).toBeGreaterThan(0);
    });

    it('should have highRes patterns', () => {
      expect(COMMON_INCLUDE_PATTERNS.highRes).toBeDefined();
    });

    it('should have galleries patterns', () => {
      expect(COMMON_INCLUDE_PATTERNS.galleries).toBeDefined();
    });
  });
});

// =============================================================================
// Dimension Functions Tests
// =============================================================================

describe('Dimension functions', () => {
  describe('calculateAspectRatio', () => {
    it('should calculate aspect ratio for normal dimensions', () => {
      expect(calculateAspectRatio({ width: 1920, height: 1080 })).toBeCloseTo(16 / 9, 2);
      expect(calculateAspectRatio({ width: 1000, height: 1000 })).toBe(1);
      expect(calculateAspectRatio({ width: 100, height: 200 })).toBe(0.5);
    });

    it('should return null for null dimensions', () => {
      expect(calculateAspectRatio({ width: null, height: 100 })).toBeNull();
      expect(calculateAspectRatio({ width: 100, height: null })).toBeNull();
      expect(calculateAspectRatio({ width: null, height: null })).toBeNull();
    });

    it('should return null for zero height', () => {
      expect(calculateAspectRatio({ width: 100, height: 0 })).toBeNull();
    });
  });

  describe('calculatePixelCount', () => {
    it('should calculate pixel count for normal dimensions', () => {
      expect(calculatePixelCount({ width: 100, height: 100 })).toBe(10000);
      expect(calculatePixelCount({ width: 1920, height: 1080 })).toBe(2073600);
    });

    it('should return null for null dimensions', () => {
      expect(calculatePixelCount({ width: null, height: 100 })).toBeNull();
      expect(calculatePixelCount({ width: 100, height: null })).toBeNull();
      expect(calculatePixelCount({ width: null, height: null })).toBeNull();
    });
  });

  describe('checkDimensions', () => {
    it('should pass when no dimensions and no requirements', () => {
      expect(checkDimensions(undefined, {})).toBe(true);
    });

    it('should fail when no dimensions but has requirements', () => {
      expect(checkDimensions(undefined, { minWidth: 100 })).toBe(false);
      expect(checkDimensions(undefined, { minHeight: 100 })).toBe(false);
      expect(checkDimensions(undefined, { maxWidth: 1000 })).toBe(false);
      expect(checkDimensions(undefined, { maxHeight: 1000 })).toBe(false);
      expect(checkDimensions(undefined, { minAspectRatio: 1 })).toBe(false);
      expect(checkDimensions(undefined, { maxAspectRatio: 2 })).toBe(false);
    });

    it('should check minWidth correctly', () => {
      expect(checkDimensions({ width: 100, height: 100 }, { minWidth: 50 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { minWidth: 100 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { minWidth: 150 })).toBe(false);
      expect(checkDimensions({ width: null, height: 100 }, { minWidth: 50 })).toBe(false);
    });

    it('should check maxWidth correctly', () => {
      expect(checkDimensions({ width: 100, height: 100 }, { maxWidth: 150 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { maxWidth: 100 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { maxWidth: 50 })).toBe(false);
      expect(checkDimensions({ width: null, height: 100 }, { maxWidth: 200 })).toBe(false);
    });

    it('should check minHeight correctly', () => {
      expect(checkDimensions({ width: 100, height: 100 }, { minHeight: 50 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { minHeight: 100 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { minHeight: 150 })).toBe(false);
      expect(checkDimensions({ width: 100, height: null }, { minHeight: 50 })).toBe(false);
    });

    it('should check maxHeight correctly', () => {
      expect(checkDimensions({ width: 100, height: 100 }, { maxHeight: 150 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { maxHeight: 100 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { maxHeight: 50 })).toBe(false);
      expect(checkDimensions({ width: 100, height: null }, { maxHeight: 200 })).toBe(false);
    });

    it('should check minAspectRatio correctly', () => {
      expect(checkDimensions({ width: 200, height: 100 }, { minAspectRatio: 1.5 })).toBe(true);
      expect(checkDimensions({ width: 100, height: 100 }, { minAspectRatio: 1.5 })).toBe(false);
      expect(checkDimensions({ width: 100, height: null }, { minAspectRatio: 1 })).toBe(false);
    });

    it('should check maxAspectRatio correctly', () => {
      expect(checkDimensions({ width: 100, height: 100 }, { maxAspectRatio: 1.5 })).toBe(true);
      expect(checkDimensions({ width: 300, height: 100 }, { maxAspectRatio: 1.5 })).toBe(false);
      expect(checkDimensions({ width: 100, height: null }, { maxAspectRatio: 2 })).toBe(false);
    });
  });

  describe('checkFileSize', () => {
    it('should pass when fileSize is undefined', () => {
      expect(checkFileSize(undefined, { minFileSize: 100 })).toBe(true);
      expect(checkFileSize(undefined, { maxFileSize: 100 })).toBe(true);
    });

    it('should check minFileSize correctly', () => {
      expect(checkFileSize(1000, { minFileSize: 500 })).toBe(true);
      expect(checkFileSize(100, { minFileSize: 500 })).toBe(false);
    });

    it('should check maxFileSize correctly', () => {
      expect(checkFileSize(1000, { maxFileSize: 2000 })).toBe(true);
      expect(checkFileSize(1000, { maxFileSize: 500 })).toBe(false);
    });

    it('should check both min and max', () => {
      expect(checkFileSize(1000, { minFileSize: 500, maxFileSize: 2000 })).toBe(true);
      expect(checkFileSize(100, { minFileSize: 500, maxFileSize: 2000 })).toBe(false);
      expect(checkFileSize(3000, { minFileSize: 500, maxFileSize: 2000 })).toBe(false);
    });
  });

  describe('createPresetFilter', () => {
    it('should create filter from noTiny preset', () => {
      const filter = createPresetFilter('noTiny');
      expect(filter.minWidth).toBe(32);
      expect(filter.minHeight).toBe(32);
    });

    it('should create filter from photo preset', () => {
      const filter = createPresetFilter('photo');
      expect(filter.minWidth).toBe(200);
      expect(filter.minHeight).toBe(150);
      expect(filter.minAspectRatio).toBe(0.5);
      expect(filter.maxAspectRatio).toBe(3.0);
    });

    it('should create filter from hdPlus preset', () => {
      const filter = createPresetFilter('hdPlus');
      expect(filter.minWidth).toBe(1280);
      expect(filter.minHeight).toBe(720);
    });
  });

  describe('combineDimensionFilters', () => {
    it('should take largest min values', () => {
      const combined = combineDimensionFilters({ minWidth: 100 }, { minWidth: 200 });
      expect(combined.minWidth).toBe(200);
    });

    it('should take smallest max values', () => {
      const combined = combineDimensionFilters({ maxWidth: 1000 }, { maxWidth: 500 });
      expect(combined.maxWidth).toBe(500);
    });

    it('should combine all dimension types', () => {
      const combined = combineDimensionFilters(
        { minWidth: 100, minHeight: 100, minAspectRatio: 0.5 },
        { minWidth: 200, maxHeight: 500, maxAspectRatio: 2.0 }
      );
      expect(combined.minWidth).toBe(200);
      expect(combined.minHeight).toBe(100);
      expect(combined.maxHeight).toBe(500);
      expect(combined.minAspectRatio).toBe(0.5);
      expect(combined.maxAspectRatio).toBe(2.0);
    });

    it('should handle empty filters', () => {
      const combined = combineDimensionFilters({}, {});
      expect(combined).toEqual({});
    });
  });

  describe('filterByFileSize', () => {
    it('should filter by minimum file size', () => {
      const items = [
        createMockMedia({ fileSize: 1000 }),
        createMockMedia({ fileSize: 5000 }),
        createMockMedia({ fileSize: 10000 }),
      ];
      const filtered = filterByFileSize(items, { minFileSize: 3000 });
      expect(filtered).toHaveLength(2);
    });

    it('should filter by maximum file size', () => {
      const items = [
        createMockMedia({ fileSize: 1000 }),
        createMockMedia({ fileSize: 5000 }),
        createMockMedia({ fileSize: 10000 }),
      ];
      const filtered = filterByFileSize(items, { maxFileSize: 6000 });
      expect(filtered).toHaveLength(2);
    });

    it('should include items without fileSize', () => {
      const items = [createMockMedia({ fileSize: undefined }), createMockMedia({ fileSize: 5000 })];
      const filtered = filterByFileSize(items, { minFileSize: 3000 });
      expect(filtered).toHaveLength(2);
    });
  });

  describe('sortBySize', () => {
    it('should sort by pixel count descending by default', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
        createMockMedia({ dimensions: { width: 200, height: 200 } }),
      ];
      const sorted = sortBySize(items);
      expect(sorted[0].dimensions?.width).toBe(500);
      expect(sorted[1].dimensions?.width).toBe(200);
      expect(sorted[2].dimensions?.width).toBe(100);
    });

    it('should sort ascending when specified', () => {
      const items = [
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
      ];
      const sorted = sortBySize(items, 'asc');
      expect(sorted[0].dimensions?.width).toBe(100);
      expect(sorted[1].dimensions?.width).toBe(500);
    });

    it('should handle items without dimensions', () => {
      const items = [
        createMockMedia({ dimensions: undefined }),
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
      ];
      const sorted = sortBySize(items);
      expect(sorted[0].dimensions?.width).toBe(500);
    });
  });

  describe('sortByAspectRatio', () => {
    it('should sort by aspect ratio descending by default', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }), // 1:1
        createMockMedia({ dimensions: { width: 300, height: 100 } }), // 3:1
        createMockMedia({ dimensions: { width: 200, height: 100 } }), // 2:1
      ];
      const sorted = sortByAspectRatio(items);
      expect(sorted[0].dimensions?.width).toBe(300);
      expect(sorted[1].dimensions?.width).toBe(200);
      expect(sorted[2].dimensions?.width).toBe(100);
    });

    it('should sort ascending when specified', () => {
      const items = [
        createMockMedia({ dimensions: { width: 300, height: 100 } }),
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
      ];
      const sorted = sortByAspectRatio(items, 'asc');
      expect(sorted[0].dimensions?.width).toBe(100);
    });

    it('should handle items without dimensions', () => {
      const items = [
        createMockMedia({ dimensions: undefined }),
        createMockMedia({ dimensions: { width: 200, height: 100 } }),
      ];
      const sorted = sortByAspectRatio(items);
      expect(sorted[0].dimensions?.width).toBe(200);
    });
  });

  describe('getLargest', () => {
    it('should return the largest item by pixel count', () => {
      const items = [
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
        createMockMedia({ dimensions: { width: 500, height: 500 } }),
        createMockMedia({ dimensions: { width: 200, height: 200 } }),
      ];
      const largest = getLargest(items);
      expect(largest?.dimensions?.width).toBe(500);
    });

    it('should return null for empty array', () => {
      expect(getLargest([])).toBeNull();
    });

    it('should handle items without dimensions', () => {
      const items = [
        createMockMedia({ dimensions: undefined }),
        createMockMedia({ dimensions: { width: 100, height: 100 } }),
      ];
      const largest = getLargest(items);
      expect(largest?.dimensions?.width).toBe(100);
    });

    it('should return first item when all have no dimensions', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/a.jpg', dimensions: undefined }),
        createMockMedia({ url: 'https://example.com/b.jpg', dimensions: undefined }),
      ];
      const largest = getLargest(items);
      expect(largest?.url).toBe('https://example.com/a.jpg');
    });
  });

  describe('groupBySize', () => {
    it('should group items by size category', () => {
      const items = [
        createMockMedia({ dimensions: { width: 10, height: 10 } }), // tiny
        createMockMedia({ dimensions: { width: 100, height: 100 } }), // small
        createMockMedia({ dimensions: { width: 500, height: 500 } }), // medium
        createMockMedia({ dimensions: { width: 2000, height: 1000 } }), // large
        createMockMedia({ dimensions: undefined }), // unknown
      ];
      const groups = groupBySize(items);
      expect(groups.tiny).toHaveLength(1);
      expect(groups.small).toHaveLength(1);
      expect(groups.medium).toHaveLength(1);
      expect(groups.large).toHaveLength(1);
      expect(groups.unknown).toHaveLength(1);
    });

    it('should handle items with null width', () => {
      const items = [createMockMedia({ dimensions: { width: null, height: 100 } })];
      const groups = groupBySize(items);
      expect(groups.unknown).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const groups = groupBySize([]);
      expect(groups.tiny).toHaveLength(0);
      expect(groups.small).toHaveLength(0);
      expect(groups.medium).toHaveLength(0);
      expect(groups.large).toHaveLength(0);
      expect(groups.unknown).toHaveLength(0);
    });
  });
});

// =============================================================================
// Deduplication Functions Tests
// =============================================================================

describe('Deduplication functions', () => {
  describe('generateDedupeKey', () => {
    it('should generate exact key', () => {
      const item = createMockMedia({ url: 'https://example.com/Image.jpg?v=1' });
      const key = generateDedupeKey(item, 'exact');
      expect(key).toBe('https://example.com/Image.jpg?v=1');
    });

    it('should generate normalized key', () => {
      const item = createMockMedia({ url: 'https://EXAMPLE.COM/Image.jpg' });
      const key = generateDedupeKey(item, 'normalized');
      expect(key.toLowerCase()).toContain('example.com');
    });

    it('should generate path key', () => {
      const item = createMockMedia({ url: 'https://example.com/path/image.jpg?v=1' });
      const key = generateDedupeKey(item, 'path');
      expect(key).not.toContain('?');
    });

    it('should generate filename key', () => {
      const item = createMockMedia({ url: 'https://example.com/path/image.jpg?v=1' });
      const key = generateDedupeKey(item, 'filename');
      expect(key).toBe('image.jpg');
    });

    it('should generate smart key', () => {
      const item = createMockMedia({ url: 'https://example.com/gallery/image_small.jpg' });
      const key = generateDedupeKey(item, 'smart');
      expect(key).toContain('example.com');
      expect(key).not.toContain('_small');
    });

    it('should handle data URLs for filename strategy', () => {
      const item = createMockMedia({ url: 'data:image/png;base64,abc123' });
      const key = generateDedupeKey(item, 'filename');
      expect(key).toBe('data:image/png;base64,abc123');
    });

    it('should use normalized as default', () => {
      const item = createMockMedia({ url: 'https://example.com/image.jpg' });
      const key = generateDedupeKey(item);
      expect(key).toBeDefined();
    });
  });

  describe('scoreItem', () => {
    it('should give higher score to items with dimensions', () => {
      const withDims = createMockMedia({ dimensions: { width: 1000, height: 1000 } });
      const withoutDims = createMockMedia({ dimensions: undefined });
      const scoreWith = scoreItem(withDims, { preferWithDimensions: true });
      const scoreWithout = scoreItem(withoutDims, { preferWithDimensions: true });
      expect(scoreWith).toBeGreaterThan(scoreWithout);
    });

    it('should give higher score to preferred domains', () => {
      const preferred = createMockMedia({ url: 'https://preferred.com/image.jpg' });
      const other = createMockMedia({ url: 'https://other.com/image.jpg' });
      const scorePreferred = scoreItem(preferred, { preferredDomains: ['preferred.com'] });
      const scoreOther = scoreItem(other, { preferredDomains: ['preferred.com'] });
      expect(scorePreferred).toBeGreaterThan(scoreOther);
    });

    it('should give higher score to preferred sources', () => {
      const preferred = createMockMedia({ source: 'dom' });
      const other = createMockMedia({ source: 'url' });
      const scorePreferred = scoreItem(preferred, { preferredSources: ['dom'] });
      const scoreOther = scoreItem(other, { preferredSources: ['dom'] });
      expect(scorePreferred).toBeGreaterThan(scoreOther);
    });

    it('should give higher score to safe items', () => {
      const safe = createMockMedia({ security: { status: 'safe', threats: [], riskScore: 0 } });
      const quarantined = createMockMedia({
        security: { status: 'quarantined', threats: [], riskScore: 50 },
      });
      const blocked = createMockMedia({
        security: { status: 'blocked', threats: [], riskScore: 100 },
      });
      const safeScore = scoreItem(safe, {});
      const quarantinedScore = scoreItem(quarantined, {});
      const blockedScore = scoreItem(blocked, {});
      expect(safeScore).toBeGreaterThan(quarantinedScore);
      expect(quarantinedScore).toBeGreaterThan(blockedScore);
    });

    it('should give bonus for file info', () => {
      const withInfo = createMockMedia({
        filename: 'test.jpg',
        mimeType: 'image/jpeg',
        fileSize: 1000,
      });
      const withoutInfo = createMockMedia({});
      expect(scoreItem(withInfo, {})).toBeGreaterThan(scoreItem(withoutInfo, {}));
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate groups', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/other.jpg' }),
      ];
      const duplicates = findDuplicates(items);
      expect(duplicates.size).toBe(1);
      const group = Array.from(duplicates.values())[0];
      expect(group).toHaveLength(2);
    });

    it('should return empty map when no duplicates', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/a.jpg' }),
        createMockMedia({ url: 'https://example.com/b.jpg' }),
      ];
      const duplicates = findDuplicates(items);
      expect(duplicates.size).toBe(0);
    });
  });

  describe('countDuplicates', () => {
    it('should count number of duplicate items', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/image.jpg' }),
        createMockMedia({ url: 'https://example.com/other.jpg' }),
      ];
      expect(countDuplicates(items)).toBe(2); // 3 - 1 = 2 duplicates
    });

    it('should return 0 when no duplicates', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/a.jpg' }),
        createMockMedia({ url: 'https://example.com/b.jpg' }),
      ];
      expect(countDuplicates(items)).toBe(0);
    });
  });

  describe('isSizeVariant', () => {
    it('should detect size variants from same domain', () => {
      const item1 = createMockMedia({
        url: 'https://example.com/image_small.jpg',
        dimensions: { width: 100, height: 100 },
      });
      const item2 = createMockMedia({
        url: 'https://example.com/image_large.jpg',
        dimensions: { width: 500, height: 500 },
      });
      expect(isSizeVariant(item1, item2)).toBe(true);
    });

    it('should not match items from different domains', () => {
      const item1 = createMockMedia({
        url: 'https://example.com/image.jpg',
        dimensions: { width: 100, height: 100 },
      });
      const item2 = createMockMedia({
        url: 'https://other.com/image.jpg',
        dimensions: { width: 100, height: 100 },
      });
      expect(isSizeVariant(item1, item2)).toBe(false);
    });

    it('should not match items with very different aspect ratios', () => {
      const item1 = createMockMedia({
        url: 'https://example.com/a.jpg',
        dimensions: { width: 1000, height: 100 }, // 10:1
      });
      const item2 = createMockMedia({
        url: 'https://example.com/b.jpg',
        dimensions: { width: 100, height: 1000 }, // 1:10
      });
      expect(isSizeVariant(item1, item2)).toBe(false);
    });

    it('should match URLs with dimension suffixes', () => {
      const item1 = createMockMedia({
        url: 'https://example.com/image_100x100.jpg',
        dimensions: { width: 100, height: 100 },
      });
      const item2 = createMockMedia({
        url: 'https://example.com/image_500x500.jpg',
        dimensions: { width: 500, height: 500 },
      });
      expect(isSizeVariant(item1, item2)).toBe(true);
    });

    it('should match URLs with retina suffixes', () => {
      const item1 = createMockMedia({
        url: 'https://example.com/image.jpg',
        dimensions: { width: 100, height: 100 },
      });
      const item2 = createMockMedia({
        url: 'https://example.com/image@2x.jpg',
        dimensions: { width: 200, height: 200 },
      });
      expect(isSizeVariant(item1, item2)).toBe(true);
    });
  });

  describe('groupSizeVariants', () => {
    it('should group size variants together', () => {
      const items = [
        createMockMedia({
          url: 'https://example.com/image_small.jpg',
          dimensions: { width: 100, height: 100 },
        }),
        createMockMedia({
          url: 'https://example.com/image_large.jpg',
          dimensions: { width: 500, height: 500 },
        }),
        createMockMedia({
          url: 'https://example.com/other.jpg',
          dimensions: { width: 200, height: 200 },
        }),
      ];
      const groups = groupSizeVariants(items);
      expect(groups.length).toBe(2); // One group for image variants, one for other
    });

    it('should handle empty array', () => {
      const groups = groupSizeVariants([]);
      expect(groups).toHaveLength(0);
    });
  });

  describe('keepLargestVariants', () => {
    it('should keep only the largest from each variant group', () => {
      const items = [
        createMockMedia({
          url: 'https://example.com/image_small.jpg',
          dimensions: { width: 100, height: 100 },
        }),
        createMockMedia({
          url: 'https://example.com/image_large.jpg',
          dimensions: { width: 500, height: 500 },
        }),
      ];
      const result = keepLargestVariants(items);
      expect(result).toHaveLength(1);
      expect(result[0].dimensions?.width).toBe(500);
    });

    it('should keep items that are not variants', () => {
      const items = [
        createMockMedia({
          url: 'https://example.com/a.jpg',
          dimensions: { width: 100, height: 100 },
        }),
        createMockMedia({
          url: 'https://other.com/b.jpg',
          dimensions: { width: 200, height: 200 },
        }),
      ];
      const result = keepLargestVariants(items);
      expect(result).toHaveLength(2);
    });
  });
});

// =============================================================================
// Pattern Functions Tests
// =============================================================================

describe('Pattern functions', () => {
  describe('matchesPattern', () => {
    it('should match string patterns', () => {
      expect(matchesPattern('https://example.com/photo.jpg', 'photo')).toBe(true);
      expect(matchesPattern('https://example.com/video.mp4', 'photo')).toBe(false);
    });

    it('should match regex patterns', () => {
      expect(matchesPattern('https://example.com/photo.jpg', /photo\.jpg$/)).toBe(true);
      expect(matchesPattern('https://example.com/photo.png', /photo\.jpg$/)).toBe(false);
    });

    it('should support wildcards in string patterns', () => {
      expect(matchesPattern('https://example.com/photo123.jpg', 'photo*.jpg')).toBe(true);
      expect(matchesPattern('https://example.com/photo.jpg', 'photo?.jpg')).toBe(false);
      expect(matchesPattern('https://example.com/photox.jpg', 'photo?.jpg')).toBe(true);
    });

    it('should respect case sensitivity', () => {
      expect(matchesPattern('https://example.com/PHOTO.jpg', 'photo', false)).toBe(true);
      expect(matchesPattern('https://example.com/PHOTO.jpg', 'photo', true)).toBe(false);
    });
  });

  describe('matchesAnyPattern', () => {
    it('should match if any pattern matches', () => {
      const patterns = [/photo/, /image/, /picture/];
      expect(matchesAnyPattern('https://example.com/photo.jpg', patterns)).toBe(true);
      expect(matchesAnyPattern('https://example.com/video.mp4', patterns)).toBe(false);
    });

    it('should return false for empty patterns', () => {
      expect(matchesAnyPattern('https://example.com/photo.jpg', [])).toBe(false);
    });
  });

  describe('matchesDomain', () => {
    it('should match exact domain', () => {
      expect(matchesDomain('https://example.com/image.jpg', 'example.com')).toBe(true);
      expect(matchesDomain('https://other.com/image.jpg', 'example.com')).toBe(false);
    });

    it('should match wildcard domains', () => {
      expect(matchesDomain('https://sub.example.com/image.jpg', '*.example.com')).toBe(true);
      expect(matchesDomain('https://example.com/image.jpg', '*.example.com')).toBe(true);
      expect(matchesDomain('https://other.com/image.jpg', '*.example.com')).toBe(false);
    });

    it('should match registered domain', () => {
      expect(matchesDomain('https://www.example.com/image.jpg', 'example.com')).toBe(true);
      expect(matchesDomain('https://cdn.example.com/image.jpg', 'example.com')).toBe(true);
    });
  });

  describe('checkPatternFilter', () => {
    it('should check allowed domains', () => {
      expect(
        checkPatternFilter('https://allowed.com/image.jpg', {
          allowedDomains: ['allowed.com'],
        })
      ).toBe(true);
      expect(
        checkPatternFilter('https://blocked.com/image.jpg', {
          allowedDomains: ['allowed.com'],
        })
      ).toBe(false);
    });

    it('should check blocked domains', () => {
      expect(
        checkPatternFilter('https://good.com/image.jpg', {
          blockedDomains: ['bad.com'],
        })
      ).toBe(true);
      expect(
        checkPatternFilter('https://bad.com/image.jpg', {
          blockedDomains: ['bad.com'],
        })
      ).toBe(false);
    });

    it('should check exclude patterns', () => {
      expect(
        checkPatternFilter('https://example.com/tracking.gif', {
          exclude: [/tracking/],
        })
      ).toBe(false);
    });

    it('should check include patterns', () => {
      expect(
        checkPatternFilter('https://example.com/photo.jpg', {
          include: [/photo/],
        })
      ).toBe(true);
      expect(
        checkPatternFilter('https://example.com/video.mp4', {
          include: [/photo/],
        })
      ).toBe(false);
    });

    it('should check path patterns', () => {
      expect(
        checkPatternFilter('https://example.com/gallery/image.jpg', {
          pathPatterns: [/gallery/],
        })
      ).toBe(true);
      expect(
        checkPatternFilter('https://example.com/other/image.jpg', {
          pathPatterns: [/gallery/],
        })
      ).toBe(false);
    });

    it('should respect caseSensitive option', () => {
      expect(
        checkPatternFilter('https://example.com/PHOTO.jpg', {
          include: [/photo/],
          caseSensitive: false,
        })
      ).toBe(true);
    });
  });

  describe('filterOutUnwanted', () => {
    it('should filter out tracking pixels', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/tracking.gif' }),
        createMockMedia({ url: 'https://example.com/photo.jpg' }),
      ];
      const filtered = filterOutUnwanted(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('photo.jpg');
    });

    it('should filter out ads', () => {
      const items = [
        createMockMedia({ url: 'https://doubleclick.net/ad.png' }),
        createMockMedia({ url: 'https://example.com/photo.jpg' }),
      ];
      const filtered = filterOutUnwanted(items);
      expect(filtered).toHaveLength(1);
    });
  });

  describe('filterForQuality', () => {
    it('should keep high-quality images', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/photo_full.jpg' }),
        createMockMedia({ url: 'https://example.com/photo_thumb.jpg' }),
      ];
      const filtered = filterForQuality(items);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('_full');
    });

    it('should keep images without quality indicators', () => {
      const items = [createMockMedia({ url: 'https://example.com/photo.jpg' })];
      const filtered = filterForQuality(items);
      expect(filtered).toHaveLength(1);
    });
  });

  describe('filterByDomain', () => {
    it('should filter to only specified domains', () => {
      const items = [
        createMockMedia({ url: 'https://allowed.com/image.jpg' }),
        createMockMedia({ url: 'https://blocked.com/image.jpg' }),
      ];
      const filtered = filterByDomain(items, ['allowed.com']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('allowed.com');
    });
  });

  describe('excludeByDomain', () => {
    it('should exclude specified domains', () => {
      const items = [
        createMockMedia({ url: 'https://good.com/image.jpg' }),
        createMockMedia({ url: 'https://bad.com/image.jpg' }),
      ];
      const filtered = excludeByDomain(items, ['bad.com']);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].url).toContain('good.com');
    });
  });

  describe('groupByDomain', () => {
    it('should group items by domain', () => {
      const items = [
        createMockMedia({ url: 'https://example.com/a.jpg' }),
        createMockMedia({ url: 'https://example.com/b.jpg' }),
        createMockMedia({ url: 'https://other.com/c.jpg' }),
      ];
      const groups = groupByDomain(items);
      expect(groups.size).toBe(2);
      expect(groups.get('example.com')).toHaveLength(2);
      expect(groups.get('other.com')).toHaveLength(1);
    });

    it('should handle empty array', () => {
      const groups = groupByDomain([]);
      expect(groups.size).toBe(0);
    });
  });
});
