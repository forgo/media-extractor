/**
 * MediaExtractor class tests
 *
 * Note: Some tests are limited because DOM APIs (DOMParser, etc.)
 * are not available in Node environment. Full testing requires jsdom or browser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MediaExtractor, createExtractor } from '../extractor';

describe('MediaExtractor', () => {
  let extractor: MediaExtractor;

  beforeEach(() => {
    extractor = new MediaExtractor();
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const config = extractor.getConfig();
      expect(config.mediaTypes).toBeDefined();
      expect(config.confidenceThreshold).toBeDefined();
    });

    it('should accept custom config', () => {
      const customExtractor = new MediaExtractor({
        mediaTypes: ['image', 'video'],
        maxItems: 50,
      });
      const config = customExtractor.getConfig();
      expect(config.mediaTypes).toEqual(['image', 'video']);
      expect(config.maxItems).toBe(50);
    });
  });

  describe('fromUrl', () => {
    it('should return empty for invalid URLs', () => {
      const result = extractor.fromUrl('not-a-url');
      expect(result.items).toHaveLength(0);
      expect(result.stats.invalidUrls).toBe(1);
    });

    it('should return empty for empty string', () => {
      const result = extractor.fromUrl('');
      expect(result.items).toHaveLength(0);
    });

    it('should include extraction stats', () => {
      const result = extractor.fromUrl('https://example.com/photo.jpg');
      expect(result.stats).toBeDefined();
      expect(result.stats.extractionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('fromUrls', () => {
    it('should return result object with stats', () => {
      const urls = [
        'https://example.com/image1.jpg',
        'invalid-url',
      ];
      const result = extractor.fromUrls(urls);
      expect(result.items).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });

  describe('fromHtml', () => {
    it('should handle empty HTML', () => {
      const result = extractor.fromHtml('');
      expect(result.items).toHaveLength(0);
    });

    // DOM-based tests would require jsdom environment
  });

  describe('fromFiles', () => {
    it('should handle File objects', () => {
      const file = new File([''], 'image.jpg', { type: 'image/jpeg' });
      const result = extractor.fromFiles([file]);
      expect(result.items).toBeDefined();
      expect(result.stats).toBeDefined();
    });
  });

  describe('configuration', () => {
    it('should filter by media types', () => {
      const imageOnlyExtractor = new MediaExtractor({ mediaTypes: ['image'] });
      const config = imageOnlyExtractor.getConfig();
      expect(config.mediaTypes).toContain('image');
      expect(config.mediaTypes).not.toContain('video');
    });

    it('should apply security settings', () => {
      const strictExtractor = new MediaExtractor({
        security: {
          mode: 'strict',
          blockedDomains: ['blocked.com'],
        },
      });
      const config = strictExtractor.getConfig();
      expect(config.security?.mode).toBe('strict');
    });
  });

  describe('createExtractor factory', () => {
    it('should create extractor with config', () => {
      const ext = createExtractor({ mediaTypes: ['video'] });
      expect(ext.getConfig().mediaTypes).toEqual(['video']);
    });
  });

  describe('statistics', () => {
    it('should track extraction time', () => {
      const result = extractor.fromUrl('https://example.com/image.jpg');
      expect(result.stats.extractionTimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('generic metadata', () => {
    it('should support custom metadata type', () => {
      interface CustomMeta {
        tags: string[];
        rating: number;
      }

      const typedExtractor = new MediaExtractor<CustomMeta>();
      expect(typedExtractor).toBeDefined();
    });
  });
});
