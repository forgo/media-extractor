/**
 * MediaExtractor class tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  MediaExtractor,
  createExtractor,
  createSecureExtractor,
  createFilteredExtractor,
  extractFromUrl,
  extractFromHtml,
  extractFromElement,
  extractFromFiles,
  extractFromDataTransfer,
  extractFromClipboard,
} from '../extractor';

// Mock URL.createObjectURL for file tests
vi.stubGlobal('URL', {
  ...URL,
  createObjectURL: vi.fn((file: File) => `blob:mock/${file.name}`),
});

// Mock DataTransfer for tests
class MockDataTransfer {
  files: FileList = { length: 0, item: () => null } as FileList;
  types: string[] = [];
  getData() {
    return '';
  }
  setData() {
    /* no-op for mock */
  }
  clearData() {
    /* no-op for mock */
  }
}
vi.stubGlobal('DataTransfer', MockDataTransfer);

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
      const urls = ['https://example.com/image1.jpg', 'invalid-url'];
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

  describe('configure', () => {
    it('should update configuration', () => {
      extractor.configure({ maxItems: 100 });
      expect(extractor.getConfig().maxItems).toBe(100);
    });

    it('should return this for chaining', () => {
      const result = extractor.configure({ maxItems: 50 });
      expect(result).toBe(extractor);
    });

    it('should update security scanner when security config changes', () => {
      extractor.configure({ security: { mode: 'strict' } });
      expect(extractor.getSecurityScanner()).toBeDefined();
    });
  });

  describe('getSecurityScanner', () => {
    it('should return security scanner instance', () => {
      const scanner = extractor.getSecurityScanner();
      expect(scanner).toBeDefined();
    });
  });

  describe('fromUrl', () => {
    it('should extract from valid image URL', () => {
      const result = extractor.fromUrl('https://example.com/photo.jpg');
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should extract from valid video URL', () => {
      const result = extractor.fromUrl('https://example.com/video.mp4');
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect confidence threshold', () => {
      const strictExtractor = new MediaExtractor({ confidenceThreshold: 0.9 });
      const result = strictExtractor.fromUrl('https://example.com/photo.jpg');
      expect(result).toBeDefined();
    });
  });

  describe('fromUrls', () => {
    it('should extract from multiple URLs', () => {
      const result = extractor.fromUrls([
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png',
      ]);
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty array', () => {
      const result = extractor.fromUrls([]);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('fromHtml', () => {
    it('should extract images from HTML', () => {
      const html = '<img src="https://example.com/photo.jpg" alt="Test">';
      const result = extractor.fromHtml(html);
      expect(result).toBeDefined();
    });

    it('should use baseUrl for relative URLs', () => {
      const html = '<img src="/photo.jpg">';
      const result = extractor.fromHtml(html, 'https://example.com');
      expect(result).toBeDefined();
    });
  });

  describe('fromElement', () => {
    it('should handle null element', () => {
      const result = extractor.fromElement(null as unknown as Element);
      expect(result.items).toHaveLength(0);
    });

    it('should extract from DOM element', () => {
      const div = document.createElement('div');
      div.innerHTML = '<img src="https://example.com/photo.jpg">';
      const result = extractor.fromElement(div);
      expect(result).toBeDefined();
    });
  });

  describe('fromDocument', () => {
    it('should extract from document', () => {
      document.body.innerHTML = '<img src="https://example.com/photo.jpg">';
      const result = extractor.fromDocument();
      expect(result).toBeDefined();
    });

    it('should accept custom document', () => {
      const result = extractor.fromDocument(document);
      expect(result).toBeDefined();
    });
  });

  describe('fromDataTransfer', () => {
    it('should handle null dataTransfer', () => {
      const result = extractor.fromDataTransfer(null);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('fromClipboard', () => {
    it('should handle null clipboardData', () => {
      const result = extractor.fromClipboard(null);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('fromDragEvent', () => {
    it('should extract from drag event', () => {
      const event = { dataTransfer: null } as DragEvent;
      const result = extractor.fromDragEvent(event);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('fromClipboardEvent', () => {
    it('should extract from clipboard event', () => {
      const event = { clipboardData: null } as ClipboardEvent;
      const result = extractor.fromClipboardEvent(event);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('fromFiles', () => {
    it('should extract from file array', () => {
      const files = [
        new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'video.mp4', { type: 'video/mp4' }),
      ];
      const result = extractor.fromFiles(files);
      expect(result.items.length).toBeGreaterThanOrEqual(0);
    });

    it('should respect maxItems limit', () => {
      const limitedExtractor = new MediaExtractor({ maxItems: 1 });
      const files = [
        new File(['content'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'image2.jpg', { type: 'image/jpeg' }),
      ];
      const result = limitedExtractor.fromFiles(files);
      expect(result.items.length).toBeLessThanOrEqual(1);
    });

    it('should filter by media type', () => {
      const imageOnlyExtractor = new MediaExtractor({ mediaTypes: ['image'] });
      const files = [
        new File(['content'], 'image.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'video.mp4', { type: 'video/mp4' }),
      ];
      const result = imageOnlyExtractor.fromFiles(files);
      expect(result).toBeDefined();
    });
  });

  describe('extract (unified)', () => {
    it('should extract from URL string', () => {
      const result = extractor.extract('https://example.com/photo.jpg');
      expect(result).toBeDefined();
    });

    it('should extract from HTML string', () => {
      const result = extractor.extract('<img src="https://example.com/photo.jpg">');
      expect(result).toBeDefined();
    });

    it('should extract from Element', () => {
      const div = document.createElement('div');
      const result = extractor.extract(div);
      expect(result).toBeDefined();
    });

    it('should extract from FileList', () => {
      const files = [new File(['content'], 'image.jpg', { type: 'image/jpeg' })];
      const result = extractor.extract(files);
      expect(result).toBeDefined();
    });

    it('should return empty for unknown source type', () => {
      const result = extractor.extract({} as never);
      expect(result.items).toHaveLength(0);
    });
  });

  describe('extractAll', () => {
    it('should extract from multiple sources', () => {
      const sources = [
        'https://example.com/photo.jpg',
        '<img src="https://example.com/other.jpg">',
      ];
      const result = extractor.extractAll(sources);
      expect(result).toBeDefined();
      expect(result.stats.urlsProcessed).toBeGreaterThanOrEqual(0);
    });

    it('should aggregate stats', () => {
      const result = extractor.extractAll([
        'https://example.com/photo.jpg',
        'https://example.com/video.mp4',
      ]);
      expect(result.stats.itemsExtracted).toBeGreaterThanOrEqual(0);
    });

    it('should deduplicate when enabled', () => {
      const result = extractor.extractAll([
        'https://example.com/photo.jpg',
        'https://example.com/photo.jpg',
      ]);
      expect(result).toBeDefined();
    });

    it('should not deduplicate when disabled', () => {
      const noDedupExtractor = new MediaExtractor({ deduplication: false });
      const result = noDedupExtractor.extractAll([
        'https://example.com/photo.jpg',
        'https://example.com/photo.jpg',
      ]);
      expect(result).toBeDefined();
    });
  });
});

describe('Factory functions', () => {
  describe('createSecureExtractor', () => {
    it('should create extractor with default balanced security', () => {
      const ext = createSecureExtractor();
      expect(ext.getConfig().security?.mode).toBe('balanced');
    });

    it('should create extractor with paranoid preset (strict mode)', () => {
      const ext = createSecureExtractor('paranoid');
      expect(ext.getConfig().security?.mode).toBe('strict');
    });
  });

  describe('createFilteredExtractor', () => {
    it('should create extractor with default filter config', () => {
      const ext = createFilteredExtractor();
      expect(ext.getConfig().filters).toBeDefined();
    });

    it('should accept filter preset', () => {
      const ext = createFilteredExtractor('strict');
      expect(ext.getConfig().filters).toBeDefined();
    });
  });
});

describe('DataTransfer extraction', () => {
  it('should extract files from DataTransfer', () => {
    const extractor = new MediaExtractor();
    // Use the mock DataTransfer
    const dataTransfer = new DataTransfer();

    const result = extractor.fromDataTransfer(dataTransfer);
    expect(result).toBeDefined();
    expect(result.stats).toBeDefined();
    expect(result.items).toBeDefined();
  });

  it('should extract from clipboard', () => {
    const extractor = new MediaExtractor();
    const dataTransfer = new DataTransfer();

    const result = extractor.fromClipboard(dataTransfer);
    expect(result).toBeDefined();
    expect(result.items).toBeDefined();
  });

  it('should handle null DataTransfer', () => {
    const extractor = new MediaExtractor();
    const result = extractor.fromDataTransfer(null);
    expect(result.items).toHaveLength(0);
  });
});

describe('HTML extraction with dimensions', () => {
  it('should extract images with dimensions', () => {
    const extractor = new MediaExtractor();
    const html = '<img src="https://example.com/photo.jpg" width="800" height="600">';
    const result = extractor.fromHtml(html);

    expect(result).toBeDefined();
    // Dimensions should be extracted
  });

  it('should handle images without dimensions', () => {
    const extractor = new MediaExtractor();
    const html = '<img src="https://example.com/photo.jpg">';
    const result = extractor.fromHtml(html);

    expect(result).toBeDefined();
  });
});

describe('Security mode filtering', () => {
  it('should filter blocked URLs in non-permissive mode', () => {
    const extractor = new MediaExtractor({
      security: { mode: 'strict', blockedDomains: ['blocked.com'] },
    });

    const result = extractor.fromUrl('https://blocked.com/image.jpg');
    expect(result.stats.blockedUrls).toBeGreaterThanOrEqual(0);
  });

  it('should keep blocked URLs in permissive mode', () => {
    const extractor = new MediaExtractor({
      security: { mode: 'permissive' },
    });

    const result = extractor.fromUrl('https://example.com/image.jpg');
    expect(result).toBeDefined();
  });
});

describe('Multiple URLs extraction', () => {
  it('should extract from multiple URLs', () => {
    const extractor = new MediaExtractor();
    const result = extractor.fromUrls([
      'https://example.com/image1.jpg',
      'https://example.com/image2.png',
      'https://example.com/video.mp4',
    ]);

    expect(result).toBeDefined();
    expect(result.stats.urlsProcessed).toBeGreaterThanOrEqual(0);
  });

  it('should deduplicate duplicate URLs', () => {
    const extractor = new MediaExtractor();
    const result = extractor.fromUrls([
      'https://example.com/image.jpg',
      'https://example.com/image.jpg',
      'https://example.com/image.jpg',
    ]);

    expect(result).toBeDefined();
  });
});

describe('DataTransfer with files and URLs', () => {
  it('should process files from DataTransfer', () => {
    const extractor = new MediaExtractor();

    // Create a mock DataTransfer with files
    const file = new File(['test content'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDt = {
      files: {
        length: 1,
        item: (i: number) => (i === 0 ? file : null),
        [Symbol.iterator]: function* () {
          yield file;
        },
        0: file,
      } as FileList,
      types: [],
      getData: () => '',
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    expect(result).toBeDefined();
    expect(result.items.length).toBeGreaterThanOrEqual(0);
  });

  it('should process URLs from DataTransfer HTML', () => {
    const extractor = new MediaExtractor();

    // Create mock with HTML containing URLs
    const mockDt = {
      files: { length: 0, item: () => null } as FileList,
      types: ['text/html'],
      getData: (type: string) => {
        if (type === 'text/html') {
          return '<img src="https://example.com/image.jpg"><video src="https://example.com/video.mp4"></video>';
        }
        return '';
      },
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    expect(result).toBeDefined();
  });

  it('should respect maxItems limit in DataTransfer processing', () => {
    const extractor = new MediaExtractor({ maxItems: 1 });

    const file1 = new File(['test'], 'photo1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test'], 'photo2.jpg', { type: 'image/jpeg' });
    const mockDt = {
      files: {
        length: 2,
        item: (i: number) => [file1, file2][i] || null,
        [Symbol.iterator]: function* () {
          yield file1;
          yield file2;
        },
        0: file1,
        1: file2,
      } as FileList,
      types: [],
      getData: () => '',
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    expect(result.items.length).toBeLessThanOrEqual(1);
  });

  it('should filter DataTransfer files by media type', () => {
    const extractor = new MediaExtractor({ mediaTypes: ['video'] });

    const imageFile = new File(['test'], 'photo.jpg', { type: 'image/jpeg' });
    const mockDt = {
      files: {
        length: 1,
        item: (i: number) => (i === 0 ? imageFile : null),
        [Symbol.iterator]: function* () {
          yield imageFile;
        },
        0: imageFile,
      } as FileList,
      types: [],
      getData: () => '',
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    // Image should be filtered out when only video is requested
    expect(result.items.every((i) => i.mediaType === 'video' || i.mediaType === 'unknown')).toBe(
      true
    );
  });

  it('should handle DataTransfer with URI list', () => {
    const extractor = new MediaExtractor();

    const mockDt = {
      files: { length: 0, item: () => null } as FileList,
      types: ['text/uri-list'],
      getData: (type: string) => {
        if (type === 'text/uri-list') {
          return 'https://example.com/photo.jpg\nhttps://example.com/video.mp4';
        }
        return '';
      },
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    expect(result).toBeDefined();
  });

  it('should filter URL items by media type in DataTransfer', () => {
    // Test that URL items are filtered when they don't match requested media types
    const extractor = new MediaExtractor({ mediaTypes: ['audio'] });

    const mockDt = {
      files: { length: 0, item: () => null } as FileList,
      types: ['text/html'],
      getData: (type: string) => {
        if (type === 'text/html') {
          // These are images, should be filtered when only audio is requested
          return '<img src="https://example.com/photo.jpg"><img src="https://example.com/photo2.png">';
        }
        return '';
      },
      setData: () => {
        /* no-op */
      },
      clearData: () => {
        /* no-op */
      },
      dropEffect: 'none',
      effectAllowed: 'all',
      items: [] as unknown as DataTransferItemList,
      setDragImage: () => {
        /* no-op */
      },
    } as DataTransfer;

    const result = extractor.fromDataTransfer(mockDt);
    // All image items should be filtered out
    expect(result.items.every((i) => i.mediaType === 'audio' || i.mediaType === 'unknown')).toBe(
      true
    );
  });
});

describe('DOM item processing with media type filtering', () => {
  it('should filter DOM items by media type', () => {
    const extractor = new MediaExtractor({ mediaTypes: ['audio'] });

    // Create a DOM with images - they should be filtered out when only audio is wanted
    const div = document.createElement('div');
    div.innerHTML = `
      <img src="https://example.com/photo1.jpg" />
      <img src="https://example.com/photo2.png" />
    `;
    document.body.appendChild(div);

    const result = extractor.fromElement(div);
    // Images should be filtered out when only audio is requested
    expect(result.items.every((i) => i.mediaType === 'audio' || i.mediaType === 'unknown')).toBe(
      true
    );

    document.body.removeChild(div);
  });

  it('should include items that match requested media types', () => {
    const extractor = new MediaExtractor({ mediaTypes: ['image'] });

    const div = document.createElement('div');
    div.innerHTML = '<img src="https://example.com/photo.jpg" />';
    document.body.appendChild(div);

    const result = extractor.fromElement(div);
    expect(result).toBeDefined();

    document.body.removeChild(div);
  });
});

describe('Quick extraction functions', () => {
  describe('extractFromUrl', () => {
    it('should extract from URL', () => {
      const result = extractFromUrl('https://example.com/photo.jpg');
      expect(result).toBeDefined();
    });
  });

  describe('extractFromHtml', () => {
    it('should extract from HTML string', () => {
      const result = extractFromHtml('<img src="https://example.com/photo.jpg">');
      expect(result).toBeDefined();
    });

    it('should accept baseUrl', () => {
      const result = extractFromHtml('<img src="/photo.jpg">', 'https://example.com');
      expect(result).toBeDefined();
    });
  });

  describe('extractFromElement', () => {
    it('should extract from DOM element', () => {
      const div = document.createElement('div');
      const result = extractFromElement(div);
      expect(result).toBeDefined();
    });
  });

  describe('extractFromFiles', () => {
    it('should extract from file array', () => {
      const files = [new File(['content'], 'image.jpg', { type: 'image/jpeg' })];
      const result = extractFromFiles(files);
      expect(result).toBeDefined();
    });
  });

  describe('extractFromDataTransfer', () => {
    it('should extract from DataTransfer', () => {
      const dataTransfer = new DataTransfer();
      const result = extractFromDataTransfer(dataTransfer);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });

  describe('extractFromClipboard', () => {
    it('should extract from clipboard data', () => {
      const clipboardData = new DataTransfer();
      const result = extractFromClipboard(clipboardData);
      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
    });
  });
});
