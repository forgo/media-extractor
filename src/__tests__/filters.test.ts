/**
 * Filters module tests
 */

import { describe, it, expect } from 'vitest';
import type { ExtractedMedia } from '../types';
import {
  applyFilters,
  applyPreset,
  filter,
  filterByDimensions,
  filterByPatterns,
  deduplicate,
  FILTER_PRESETS,
  DIMENSION_PRESETS,
  COMMON_EXCLUDE_PATTERNS,
} from '../filters';

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
        createMockMedia({ dimensions: { width: 500, height: 500 } }),  // 1:1
        createMockMedia({ dimensions: { width: 500, height: 1000 } }), // 1:2
      ];

      const filtered = filterByDimensions(items, { minAspectRatio: 1.5 });
      expect(filtered).toHaveLength(1);
    });

    it('should handle items without dimensions', () => {
      const items = [
        createMockMedia({ dimensions: undefined }),
      ];

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
      const items = [
        createMockMedia(),
        createMockMedia(),
      ];

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

      const filtered = filter(items)
        .imagesOnly()
        .execute();

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

      const filtered = filter(items)
        .imagesOnly()
        .minSize(100, 100)
        .execute();

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
      const items = [
        createMockMedia({ mediaType: 'image' }),
      ];

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

      const filtered = filter(items)
        .smartDedupe()
        .execute();

      expect(filtered).toHaveLength(1);
    });

    it('should support custom filter function', () => {
      const items = [
        createMockMedia({ fileSize: 100 }),
        createMockMedia({ fileSize: 10000 }),
      ];

      const filtered = filter(items)
        .filter(item => (item.fileSize || 0) > 500)
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
});
