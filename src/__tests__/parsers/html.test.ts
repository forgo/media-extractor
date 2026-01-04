/**
 * HTML parser tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { parseHtml, parseSrcset, extractBackgroundImageUrl } from '../../parsers/html';

describe('parseHtml', () => {
  describe('linkUrl extraction', () => {
    it('should extract linkUrl when img is wrapped in anchor', () => {
      const html = `
        <a href="https://example.com/full-image.jpg">
          <img src="https://example.com/thumb.jpg" />
        </a>
      `;
      const items = parseHtml(html);

      expect(items.length).toBeGreaterThan(0);
      const imgItem = items.find((item) => item.url.includes('thumb.jpg'));
      expect(imgItem).toBeDefined();
      expect(imgItem?.linkUrl).toBe('https://example.com/full-image.jpg');
    });

    it('should extract linkUrl when background image div is wrapped in anchor', () => {
      const html = `
        <a href="https://example.com/gallery/page1">
          <div style="background: url(https://example.com/bg-image.webp) no-repeat"></div>
        </a>
      `;
      const items = parseHtml(html, { extractBackgroundImages: true });

      expect(items.length).toBeGreaterThan(0);
      const bgItem = items.find((item) => item.url.includes('bg-image.webp'));
      expect(bgItem).toBeDefined();
      expect(bgItem?.linkUrl).toBe('https://example.com/gallery/page1');
    });

    it('should handle nested elements with background images in anchor', () => {
      const html = `
        <a href="https://e-hentai.org/lofi/s/06e96a4ec6/2968172-785">
          <div title="Page 785" style="width:200px;height:300px;background:transparent url(https://website.com/abc.webp) -800px 0 no-repeat"></div>
        </a>
      `;
      const items = parseHtml(html, { extractBackgroundImages: true });

      expect(items.length).toBeGreaterThan(0);
      const bgItem = items.find((item) => item.url.includes('abc.webp'));
      expect(bgItem).toBeDefined();
      expect(bgItem?.linkUrl).toBe('https://e-hentai.org/lofi/s/06e96a4ec6/2968172-785');
    });

    it('should not set linkUrl when img is not wrapped in anchor', () => {
      const html = `
        <div>
          <img src="https://example.com/standalone.jpg" />
        </div>
      `;
      const items = parseHtml(html);

      expect(items.length).toBeGreaterThan(0);
      const imgItem = items.find((item) => item.url.includes('standalone.jpg'));
      expect(imgItem).toBeDefined();
      expect(imgItem?.linkUrl).toBeUndefined();
    });

    it('should resolve relative linkUrl with baseUrl', () => {
      const html = `
        <a href="/gallery/image.html">
          <img src="https://example.com/thumb.jpg" />
        </a>
      `;
      const items = parseHtml(html, { baseUrl: 'https://example.com' });

      expect(items.length).toBeGreaterThan(0);
      const imgItem = items.find((item) => item.url.includes('thumb.jpg'));
      expect(imgItem).toBeDefined();
      expect(imgItem?.linkUrl).toBe('https://example.com/gallery/image.html');
    });
  });

  describe('basic extraction', () => {
    it('should extract img elements', () => {
      const html = '<img src="https://example.com/image.jpg" />';
      const items = parseHtml(html);

      expect(items.length).toBe(1);
      expect(items[0].url).toBe('https://example.com/image.jpg');
      expect(items[0].mediaType).toBe('image');
    });

    it('should extract background images from inline styles', () => {
      const html = '<div style="background-image: url(https://example.com/bg.png)"></div>';
      const items = parseHtml(html, { extractBackgroundImages: true });

      expect(items.length).toBe(1);
      expect(items[0].url).toBe('https://example.com/bg.png');
    });

    it('should extract video elements', () => {
      const html = `
        <video src="https://example.com/video.mp4" width="640" height="360">
          <source src="https://example.com/video.webm" type="video/webm" />
        </video>
      `;
      const items = parseHtml(html);

      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.some((i) => i.url.includes('video.mp4'))).toBe(true);
      expect(items.some((i) => i.url.includes('video.webm'))).toBe(true);
    });

    it('should extract video poster as image', () => {
      const html =
        '<video poster="https://example.com/poster.jpg" src="https://example.com/video.mp4"></video>';
      const items = parseHtml(html);

      const poster = items.find((i) => i.url.includes('poster.jpg'));
      expect(poster).toBeDefined();
      expect(poster?.mediaType).toBe('image');
      expect(poster?.hint).toBe('secondary');
    });

    it('should extract audio elements', () => {
      const html = `
        <audio src="https://example.com/audio.mp3">
          <source src="https://example.com/audio.ogg" type="audio/ogg" />
        </audio>
      `;
      const items = parseHtml(html);

      expect(items.length).toBeGreaterThanOrEqual(2);
      expect(items.some((i) => i.url.includes('audio.mp3'))).toBe(true);
      expect(items.some((i) => i.url.includes('audio.ogg'))).toBe(true);
    });

    it('should extract links to media files', () => {
      const html = '<a href="https://example.com/document.pdf" title="Download PDF">Download</a>';
      const items = parseHtml(html);

      const pdf = items.find((i) => i.url.includes('document.pdf'));
      expect(pdf).toBeDefined();
      expect(pdf?.mediaType).toBe('document');
      expect(pdf?.title).toBe('Download PDF');
    });

    it('should extract srcset URLs', () => {
      const html =
        '<img src="https://example.com/small.jpg" srcset="https://example.com/medium.jpg 2x, https://example.com/large.jpg 3x" />';
      const items = parseHtml(html, { extractSrcset: true });

      expect(items.length).toBeGreaterThanOrEqual(3);
      expect(items.some((i) => i.url.includes('medium.jpg'))).toBe(true);
      expect(items.some((i) => i.url.includes('large.jpg'))).toBe(true);
    });

    it('should extract picture source elements', () => {
      const html = `
        <picture>
          <source srcset="https://example.com/image.webp" type="image/webp" />
          <img src="https://example.com/image.jpg" />
        </picture>
      `;
      const items = parseHtml(html);

      expect(items.some((i) => i.url.includes('image.webp'))).toBe(true);
      expect(items.some((i) => i.url.includes('image.jpg'))).toBe(true);
    });

    it('should extract inline SVG as data URL', () => {
      const html = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40"/></svg>';
      const items = parseHtml(html);

      const svg = items.find((i) => i.url.startsWith('data:image/svg+xml'));
      expect(svg).toBeDefined();
      expect(svg?.mediaType).toBe('image');
      expect(svg?.format).toBe('svg');
    });

    it('should respect ignoreSelectors', () => {
      const html = `
        <img src="https://example.com/keep.jpg" />
        <img src="https://example.com/ignore.jpg" class="ad-banner" />
      `;
      const items = parseHtml(html, { ignoreSelectors: ['.ad-banner'] });

      expect(items.some((i) => i.url.includes('keep.jpg'))).toBe(true);
      expect(items.some((i) => i.url.includes('ignore.jpg'))).toBe(false);
    });

    it('should deduplicate URLs', () => {
      const html = `
        <img src="https://example.com/same.jpg" />
        <img src="https://example.com/same.jpg" />
        <img src="https://example.com/same.jpg" />
      `;
      const items = parseHtml(html);

      expect(items.filter((i) => i.url.includes('same.jpg'))).toHaveLength(1);
    });

    it('should filter by media types', () => {
      const html = `
        <img src="https://example.com/image.jpg" />
        <video src="https://example.com/video.mp4"></video>
        <audio src="https://example.com/audio.mp3"></audio>
      `;
      const items = parseHtml(html, { mediaTypes: ['video'] });

      expect(items.every((i) => i.mediaType === 'video')).toBe(true);
    });

    it('should use custom selectors', () => {
      const html = '<div class="gallery-item" data-src="https://example.com/gallery.jpg"></div>';
      const items = parseHtml(html, { selectors: ['.gallery-item'] });

      const galleryItem = items.find((i) => i.url.includes('gallery.jpg'));
      expect(galleryItem).toBeDefined();
    });

    it('should resolve relative URLs with baseUrl', () => {
      const html = '<img src="/images/photo.jpg" />';
      const items = parseHtml(html, { baseUrl: 'https://example.com' });

      expect(items[0]?.url).toBe('https://example.com/images/photo.jpg');
    });

    it('should handle empty HTML', () => {
      const items = parseHtml('');
      expect(items).toHaveLength(0);
    });

    it('should detect UI element hints from size', () => {
      const html = `
        <img src="https://example.com/first.jpg" />
        <img src="https://example.com/icon.png" width="16" height="16" />
      `;
      const items = parseHtml(html);

      const icon = items.find((i) => i.url.includes('icon.png'));
      expect(icon?.hint).toBe('ui-element');
    });

    it('should detect UI element hints from class names', () => {
      const html = `
        <img src="https://example.com/first.jpg" />
        <img src="https://example.com/logo.png" class="site-logo" />
      `;
      const items = parseHtml(html);

      const logo = items.find((i) => i.url.includes('logo.png'));
      expect(logo?.hint).toBe('ui-element');
    });

    it('should mark first image as primary', () => {
      const html = `
        <img src="https://example.com/first.jpg" />
        <img src="https://example.com/second.jpg" />
      `;
      const items = parseHtml(html);

      const first = items.find((i) => i.url.includes('first.jpg'));
      const second = items.find((i) => i.url.includes('second.jpg'));
      expect(first?.hint).toBe('primary');
      expect(second?.hint).toBe('unknown');
    });

    it('should include image alt and title attributes', () => {
      const html =
        '<img src="https://example.com/photo.jpg" alt="A beautiful photo" title="Photo Title" />';
      const items = parseHtml(html);

      expect(items[0]?.alt).toBe('A beautiful photo');
      expect(items[0]?.title).toBe('Photo Title');
    });

    it('should skip relative URLs without baseUrl', () => {
      const html = '<img src="/relative/path.jpg" />';
      const items = parseHtml(html);

      // Without baseUrl, relative URLs can't be resolved
      expect(items.some((i) => i.url.includes('relative'))).toBe(false);
    });
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('parseSrcset', () => {
  it('should parse simple srcset', () => {
    const urls = parseSrcset('https://example.com/small.jpg 1x, https://example.com/large.jpg 2x');
    expect(urls).toHaveLength(2);
    expect(urls).toContain('https://example.com/small.jpg');
    expect(urls).toContain('https://example.com/large.jpg');
  });

  it('should parse srcset with width descriptors', () => {
    const urls = parseSrcset(
      'https://example.com/small.jpg 320w, https://example.com/medium.jpg 640w'
    );
    expect(urls).toHaveLength(2);
  });

  it('should handle srcset without descriptors', () => {
    const urls = parseSrcset('https://example.com/image.jpg');
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com/image.jpg');
  });

  it('should resolve relative URLs with baseUrl', () => {
    const urls = parseSrcset('/images/photo.jpg 1x', 'https://example.com');
    expect(urls[0]).toBe('https://example.com/images/photo.jpg');
  });

  it('should return empty array for empty srcset', () => {
    expect(parseSrcset('')).toHaveLength(0);
  });

  it('should handle whitespace', () => {
    const urls = parseSrcset('  https://example.com/a.jpg 1x  ,   https://example.com/b.jpg 2x  ');
    expect(urls).toHaveLength(2);
  });
});

describe('extractBackgroundImageUrl', () => {
  it('should extract URL from background-image', () => {
    const url = extractBackgroundImageUrl('background-image: url(https://example.com/bg.jpg)');
    expect(url).toBe('https://example.com/bg.jpg');
  });

  it('should handle quoted URLs', () => {
    const url1 = extractBackgroundImageUrl("background: url('https://example.com/bg.jpg')");
    const url2 = extractBackgroundImageUrl('background: url("https://example.com/bg.jpg")');
    expect(url1).toBe('https://example.com/bg.jpg');
    expect(url2).toBe('https://example.com/bg.jpg');
  });

  it('should handle complex background shorthand', () => {
    const url = extractBackgroundImageUrl(
      'background: transparent url(https://example.com/bg.jpg) center no-repeat'
    );
    expect(url).toBe('https://example.com/bg.jpg');
  });

  it('should resolve relative URLs', () => {
    const url = extractBackgroundImageUrl('background: url(/images/bg.jpg)', 'https://example.com');
    expect(url).toBe('https://example.com/images/bg.jpg');
  });

  it('should return null for empty style', () => {
    expect(extractBackgroundImageUrl('')).toBeNull();
  });

  it('should return null when no URL found', () => {
    expect(extractBackgroundImageUrl('color: red')).toBeNull();
  });

  it('should handle spaces around url()', () => {
    const url = extractBackgroundImageUrl('background: url( https://example.com/bg.jpg )');
    expect(url).toBe('https://example.com/bg.jpg');
  });
});
