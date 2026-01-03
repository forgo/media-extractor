/**
 * HTML parser tests
 *
 * @vitest-environment jsdom
 */

import { describe, it, expect } from 'vitest';
import { parseHtml } from '../../parsers/html';

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
      const imgItem = items.find(item => item.url.includes('thumb.jpg'));
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
      const bgItem = items.find(item => item.url.includes('bg-image.webp'));
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
      const bgItem = items.find(item => item.url.includes('abc.webp'));
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
      const imgItem = items.find(item => item.url.includes('standalone.jpg'));
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
      const imgItem = items.find(item => item.url.includes('thumb.jpg'));
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
  });
});
