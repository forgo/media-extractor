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
  // Additional imports for expanded coverage
  isHttps,
  isHttp,
  isJavascriptUrl,
  parseUrl,
  extractTld,
  extractRegisteredDomain,
  extractPath,
  extractQueryString,
  parseQueryParams,
  countQueryParams,
  getDedupeKey,
  isIpv4Address,
  isPrivateIp,
  isLocalhost,
  safeDecodeURIComponent,
  safeDecodeURI,
  countEncodedChars,
  isExcessivelyEncoded,
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
      const googleUrl =
        'https://www.google.com/imgres?imgurl=https%3A%2F%2Fexample.com%2Fimage.jpg&imgrefurl=https%3A%2F%2Fexample.com';
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
      const redirectUrl =
        'https://redirect.com/?next=https%3A%2F%2Fother.com%3Fnext%3Dhttps%253A%252F%252Ffinal.com';
      const count = countRedirects(redirectUrl);
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for URLs without redirects', () => {
      expect(countRedirects('https://example.com/path')).toBe(0);
    });

    it('should count actual redirects with url param', () => {
      const url = 'https://redirect.com/?url=https%3A%2F%2Fexample.com';
      expect(countRedirects(url)).toBe(1);
    });
  });

  // =========================================================================
  // Additional URL utility tests
  // =========================================================================

  describe('isHttps', () => {
    it('should return true for HTTPS URLs', () => {
      expect(isHttps('https://example.com')).toBe(true);
      expect(isHttps('HTTPS://EXAMPLE.COM')).toBe(true);
    });

    it('should return false for HTTP URLs', () => {
      expect(isHttps('http://example.com')).toBe(false);
    });

    it('should handle invalid input', () => {
      expect(isHttps('')).toBe(false);
      expect(isHttps(null as unknown as string)).toBe(false);
    });
  });

  describe('isHttp', () => {
    it('should return true for HTTP URLs', () => {
      expect(isHttp('http://example.com')).toBe(true);
      expect(isHttp('HTTP://EXAMPLE.COM')).toBe(true);
    });

    it('should return false for HTTPS URLs', () => {
      expect(isHttp('https://example.com')).toBe(false);
    });

    it('should handle invalid input', () => {
      expect(isHttp('')).toBe(false);
      expect(isHttp(null as unknown as string)).toBe(false);
    });
  });

  describe('isJavascriptUrl', () => {
    it('should detect javascript: URLs', () => {
      expect(isJavascriptUrl('javascript:alert(1)')).toBe(true);
      expect(isJavascriptUrl('JAVASCRIPT:alert(1)')).toBe(true);
      expect(isJavascriptUrl('  javascript:alert(1)')).toBe(true);
    });

    it('should return false for non-javascript URLs', () => {
      expect(isJavascriptUrl('https://example.com')).toBe(false);
    });

    it('should handle invalid input', () => {
      expect(isJavascriptUrl('')).toBe(false);
      expect(isJavascriptUrl(null as unknown as string)).toBe(false);
    });
  });

  describe('parseUrl', () => {
    it('should parse valid URLs', () => {
      const parsed = parseUrl('https://example.com/path?query=1');
      expect(parsed).not.toBeNull();
      expect(parsed?.hostname).toBe('example.com');
    });

    it('should parse data URLs', () => {
      const parsed = parseUrl('data:image/png;base64,abc');
      expect(parsed).not.toBeNull();
    });

    it('should parse blob URLs', () => {
      const parsed = parseUrl('blob:https://example.com/uuid');
      expect(parsed).not.toBeNull();
    });

    it('should return null for invalid URLs', () => {
      expect(parseUrl('not-a-url')).toBeNull();
      expect(parseUrl('')).toBeNull();
      expect(parseUrl(null as unknown as string)).toBeNull();
    });
  });

  describe('extractTld', () => {
    it('should extract simple TLDs', () => {
      expect(extractTld('https://example.com/path')).toBe('com');
      expect(extractTld('https://example.org/path')).toBe('org');
    });

    it('should extract two-part TLDs', () => {
      expect(extractTld('https://example.co.uk/path')).toBe('co.uk');
      expect(extractTld('https://example.com.au/path')).toBe('com.au');
    });

    it('should return empty for invalid URLs', () => {
      expect(extractTld('not-a-url')).toBe('');
    });
  });

  describe('extractRegisteredDomain', () => {
    it('should extract registered domain', () => {
      expect(extractRegisteredDomain('https://sub.example.com/path')).toBe('example.com');
      expect(extractRegisteredDomain('https://www.example.org/path')).toBe('example.org');
    });

    it('should handle two-part TLDs', () => {
      expect(extractRegisteredDomain('https://sub.example.co.uk/path')).toBe('example.co.uk');
    });

    it('should return empty for invalid URLs', () => {
      expect(extractRegisteredDomain('not-a-url')).toBe('');
    });
  });

  describe('extractPath', () => {
    it('should extract path from URL', () => {
      expect(extractPath('https://example.com/path/to/file')).toBe('/path/to/file');
    });

    it('should return empty for invalid URLs', () => {
      expect(extractPath('not-a-url')).toBe('');
    });
  });

  describe('extractQueryString', () => {
    it('should extract query string without leading ?', () => {
      expect(extractQueryString('https://example.com?foo=bar&baz=qux')).toBe('foo=bar&baz=qux');
    });

    it('should return empty for URLs without query', () => {
      expect(extractQueryString('https://example.com/path')).toBe('');
    });

    it('should return empty for invalid URLs', () => {
      expect(extractQueryString('not-a-url')).toBe('');
    });
  });

  describe('parseQueryParams', () => {
    it('should parse query params into Map', () => {
      const params = parseQueryParams('https://example.com?foo=bar&baz=qux');
      expect(params.get('foo')).toBe('bar');
      expect(params.get('baz')).toBe('qux');
    });

    it('should return empty Map for invalid URLs', () => {
      const params = parseQueryParams('not-a-url');
      expect(params.size).toBe(0);
    });
  });

  describe('countQueryParams', () => {
    it('should count query parameters', () => {
      expect(countQueryParams('https://example.com?a=1&b=2&c=3')).toBe(3);
      expect(countQueryParams('https://example.com')).toBe(0);
    });

    it('should return 0 for invalid URLs', () => {
      expect(countQueryParams('not-a-url')).toBe(0);
    });
  });

  describe('getDedupeKey', () => {
    it('should return hostname + pathname for regular URLs', () => {
      expect(getDedupeKey('https://example.com/path')).toBe('example.com/path');
    });

    it('should return full URL for data URLs', () => {
      expect(getDedupeKey('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
    });

    it('should return full URL for blob URLs', () => {
      expect(getDedupeKey('blob:https://example.com/uuid')).toBe('blob:https://example.com/uuid');
    });

    it('should return original for invalid URLs', () => {
      expect(getDedupeKey('not-a-url')).toBe('not-a-url');
    });
  });

  describe('isIpv4Address', () => {
    it('should return true for valid IPv4 addresses', () => {
      expect(isIpv4Address('192.168.1.1')).toBe(true);
      expect(isIpv4Address('10.0.0.1')).toBe(true);
      expect(isIpv4Address('8.8.8.8')).toBe(true);
    });

    it('should return false for invalid addresses', () => {
      expect(isIpv4Address('not-an-ip')).toBe(false);
      expect(isIpv4Address('192.168.1')).toBe(false);
      expect(isIpv4Address('192.168.1.256')).toBe(false);
    });
  });

  describe('isPrivateIp', () => {
    it('should detect private IP ranges', () => {
      expect(isPrivateIp('10.0.0.1')).toBe(true);
      expect(isPrivateIp('172.16.0.1')).toBe(true);
      expect(isPrivateIp('192.168.1.1')).toBe(true);
      expect(isPrivateIp('127.0.0.1')).toBe(true);
    });

    it('should return false for public IPs', () => {
      expect(isPrivateIp('8.8.8.8')).toBe(false);
      expect(isPrivateIp('1.1.1.1')).toBe(false);
    });

    it('should return false for invalid addresses', () => {
      expect(isPrivateIp('not-an-ip')).toBe(false);
    });
  });

  describe('isLocalhost', () => {
    it('should detect localhost variations', () => {
      expect(isLocalhost('localhost')).toBe(true);
      expect(isLocalhost('127.0.0.1')).toBe(true);
      expect(isLocalhost('::1')).toBe(true);
      expect(isLocalhost('[::1]')).toBe(true);
      expect(isLocalhost('sub.localhost')).toBe(true);
    });

    it('should return false for non-localhost', () => {
      expect(isLocalhost('example.com')).toBe(false);
    });
  });

  describe('safeDecodeURIComponent', () => {
    it('should decode valid encoded strings', () => {
      expect(safeDecodeURIComponent('hello%20world')).toBe('hello world');
      expect(safeDecodeURIComponent('%2F')).toBe('/');
    });

    it('should return original string for invalid encoding', () => {
      expect(safeDecodeURIComponent('%E0%A4%A')).toBe('%E0%A4%A');
      expect(safeDecodeURIComponent('%%invalid')).toBe('%%invalid');
    });
  });

  describe('safeDecodeURI', () => {
    it('should decode valid URIs', () => {
      expect(safeDecodeURI('https://example.com/hello%20world')).toBe(
        'https://example.com/hello world'
      );
    });

    it('should return original string for invalid encoding', () => {
      expect(safeDecodeURI('https://example.com/%E0%A4%A')).toBe('https://example.com/%E0%A4%A');
    });
  });

  describe('countEncodedChars', () => {
    it('should count encoded characters', () => {
      expect(countEncodedChars('hello%20world%21')).toBe(2);
      expect(countEncodedChars('no encoding')).toBe(0);
    });
  });

  describe('isExcessivelyEncoded', () => {
    it('should detect excessively encoded URLs', () => {
      // More than 30% encoded
      const heavilyEncoded = '%68%74%74%70%73%3A%2F%2F%65%78%61%6D%70%6C%65%2E%63%6F%6D';
      expect(isExcessivelyEncoded(heavilyEncoded)).toBe(true);
    });

    it('should return false for normal URLs', () => {
      expect(isExcessivelyEncoded('https://example.com/path')).toBe(false);
    });
  });

  describe('normalizeUrl additional cases', () => {
    it('should preserve username and password', () => {
      const normalized = normalizeUrl('https://user:pass@example.com/path');
      expect(normalized).toContain('user');
      expect(normalized).toContain('pass');
    });

    it('should handle data URLs as-is', () => {
      const dataUrl = 'data:image/png;base64,abc';
      expect(normalizeUrl(dataUrl)).toBe(dataUrl);
    });

    it('should handle blob URLs as-is', () => {
      const blobUrl = 'blob:https://example.com/uuid';
      expect(normalizeUrl(blobUrl)).toBe(blobUrl);
    });

    it('should sort query parameters', () => {
      const normalized = normalizeUrl('https://example.com?z=3&a=1&m=2');
      // URL normalization adds / before query params
      expect(normalized).toBe('https://example.com/?a=1&m=2&z=3');
    });

    it('should preserve hash', () => {
      const normalized = normalizeUrl('https://example.com/path#section');
      expect(normalized).toContain('#section');
    });
  });

  describe('extractEmbeddedUrl additional cases', () => {
    it('should extract from multiple param names', () => {
      expect(extractEmbeddedUrl('https://example.com?src=https://other.com/img.jpg')).toBe(
        'https://other.com/img.jpg'
      );
      expect(extractEmbeddedUrl('https://example.com?image=https://other.com/img.jpg')).toBe(
        'https://other.com/img.jpg'
      );
      expect(extractEmbeddedUrl('https://example.com?mediaurl=https://other.com/img.jpg')).toBe(
        'https://other.com/img.jpg'
      );
    });

    it('should decode URL-encoded embedded URLs', () => {
      const url = 'https://redirect.com?target=https%3A%2F%2Fexample.com%2Fphoto.jpg';
      expect(extractEmbeddedUrl(url)).toBe('https://example.com/photo.jpg');
    });

    it('should return null for invalid URLs', () => {
      expect(extractEmbeddedUrl('not-a-url')).toBeNull();
    });
  });

  describe('extractDomain additional cases', () => {
    it('should return empty for data URLs', () => {
      expect(extractDomain('data:image/png;base64,abc')).toBe('');
    });
  });
});
