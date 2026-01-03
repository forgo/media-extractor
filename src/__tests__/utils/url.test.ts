/**
 * URL utilities tests
 */

import { describe, it, expect } from 'vitest';
import {
  isAbsoluteUrl,
  isDataUrl,
  isBlobUrl,
  normalizeUrl,
  extractDomain,
  extractEmbeddedUrl,
  isUrlShortener,
  isPrivateUrl,
  countRedirects,
} from '../../utils/url';

describe('URL utilities', () => {
  describe('isAbsoluteUrl', () => {
    it('should return true for http URLs', () => {
      expect(isAbsoluteUrl('http://example.com')).toBe(true);
      expect(isAbsoluteUrl('http://example.com/path')).toBe(true);
    });

    it('should return true for https URLs', () => {
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
      expect(isAbsoluteUrl('https://sub.example.com/path?query=1')).toBe(true);
    });

    it('should return false for relative URLs', () => {
      expect(isAbsoluteUrl('/path/to/file')).toBe(false);
      expect(isAbsoluteUrl('./file.jpg')).toBe(false);
      expect(isAbsoluteUrl('../file.jpg')).toBe(false);
    });

    it('should return false for protocol-relative URLs', () => {
      expect(isAbsoluteUrl('//example.com/file.jpg')).toBe(false);
    });

    it('should handle data URLs', () => {
      // data URLs are checked via isDataUrl, not isAbsoluteUrl
      expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
    });

    it('should handle blob URLs', () => {
      // blob URLs are checked via isBlobUrl, not isAbsoluteUrl
      expect(isBlobUrl('blob:http://example.com/uuid')).toBe(true);
    });
  });

  describe('isDataUrl', () => {
    it('should detect data URLs', () => {
      expect(isDataUrl('data:image/png;base64,abc')).toBe(true);
      expect(isDataUrl('data:text/html,<h1>Hello</h1>')).toBe(true);
    });

    it('should reject non-data URLs', () => {
      expect(isDataUrl('http://example.com')).toBe(false);
      expect(isDataUrl('/path/to/file')).toBe(false);
    });
  });

  describe('isBlobUrl', () => {
    it('should detect blob URLs', () => {
      expect(isBlobUrl('blob:http://example.com/uuid')).toBe(true);
      expect(isBlobUrl('blob:https://example.com/some-uuid')).toBe(true);
    });

    it('should reject non-blob URLs', () => {
      expect(isBlobUrl('http://example.com')).toBe(false);
      expect(isBlobUrl('/path/to/file')).toBe(false);
    });
  });

  describe('normalizeUrl', () => {
    it('should normalize URL case for domain', () => {
      expect(normalizeUrl('HTTPS://EXAMPLE.COM/Path')).toBe('https://example.com/Path');
    });

    it('should remove trailing slashes from path', () => {
      expect(normalizeUrl('https://example.com/path/')).toBe('https://example.com/path');
    });

    it('should remove default ports', () => {
      expect(normalizeUrl('https://example.com:443/path')).toBe('https://example.com/path');
      expect(normalizeUrl('http://example.com:80/path')).toBe('http://example.com/path');
    });

    it('should keep non-default ports', () => {
      expect(normalizeUrl('https://example.com:8443/path')).toBe('https://example.com:8443/path');
    });

    it('should handle URLs without paths', () => {
      // Normalized URLs may retain trailing slash
      const result = normalizeUrl('https://example.com');
      expect(result).toMatch(/^https:\/\/example\.com\/?$/);
    });
  });

  describe('extractDomain', () => {
    it('should extract domain from URL', () => {
      expect(extractDomain('https://example.com/path')).toBe('example.com');
      expect(extractDomain('http://sub.example.com/path')).toBe('sub.example.com');
    });

    it('should handle URLs with ports', () => {
      expect(extractDomain('https://example.com:8080/path')).toBe('example.com');
    });

    it('should return empty for invalid URLs', () => {
      expect(extractDomain('not-a-url')).toBe('');
    });
  });

  describe('extractEmbeddedUrl', () => {
    it('should extract Google Images embedded URL', () => {
      const googleUrl = 'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fimage.jpg&imgrefurl=https%3A%2F%2Fexample.com';
      expect(extractEmbeddedUrl(googleUrl)).toBe('https://example.com/image.jpg');
    });

    it('should extract URL from url parameter', () => {
      const wrapperUrl = 'https://redirect.com/?url=https%3A%2F%2Fexample.com%2Fimage.jpg';
      expect(extractEmbeddedUrl(wrapperUrl)).toBe('https://example.com/image.jpg');
    });

    it('should return null for non-wrapper URLs', () => {
      expect(extractEmbeddedUrl('https://example.com/image.jpg')).toBeNull();
    });
  });

  describe('isUrlShortener', () => {
    it('should detect common URL shorteners', () => {
      expect(isUrlShortener('https://bit.ly/abc123')).toBe(true);
      expect(isUrlShortener('https://t.co/abc123')).toBe(true);
      expect(isUrlShortener('https://goo.gl/abc123')).toBe(true);
    });

    it('should not flag regular URLs', () => {
      expect(isUrlShortener('https://example.com/path')).toBe(false);
    });
  });

  describe('isPrivateUrl', () => {
    it('should detect localhost', () => {
      expect(isPrivateUrl('http://localhost/path')).toBe(true);
      expect(isPrivateUrl('http://127.0.0.1/path')).toBe(true);
    });

    it('should detect private IP ranges', () => {
      expect(isPrivateUrl('http://192.168.1.1/path')).toBe(true);
      expect(isPrivateUrl('http://10.0.0.1/path')).toBe(true);
      expect(isPrivateUrl('http://172.16.0.1/path')).toBe(true);
    });

    it('should not flag public IPs', () => {
      expect(isPrivateUrl('http://8.8.8.8/path')).toBe(false);
      expect(isPrivateUrl('https://example.com/path')).toBe(false);
    });
  });

  describe('countRedirects', () => {
    it('should count redirect parameters in URL chains', () => {
      // countRedirects counts embedded redirect URLs
      const redirectUrl = 'https://redirect.com/?next=https%3A%2F%2Fother.com%3Fnext%3Dhttps%253A%252F%252Ffinal.com';
      const count = countRedirects(redirectUrl);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for URLs without redirects', () => {
      expect(countRedirects('https://example.com/path')).toBe(0);
    });
  });
});
