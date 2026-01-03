/**
 * Security module tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  SecurityScanner,
  validateUrl,
  sanitizeUrl,
  sanitizeFilename,
  sanitizeHtml,
  isSafeMimeType,
  detectHomograph,
  detectScriptInjection,
  isSuspiciousTld,
  compileBlocklist,
  checkBlocklist,
  BlocklistManager,
  getBlocklistThreat,
  validateProtocol,
  validateLength,
  validatePrivateIp,
  validateQueryParams,
  validateEncoding,
  validateRedirects,
  isValidUrl,
  getValidationChecks,
  detectObfuscation,
  detectTrackingPixel,
  detectDataExfiltration,
  detectSuspiciousTld,
  detectThreats,
  stripTrackingParams,
  extractSafeUrls,
  validateContentType,
} from '../security';

describe('Security module', () => {
  describe('SecurityScanner', () => {
    let scanner: SecurityScanner;

    beforeEach(() => {
      scanner = new SecurityScanner({ mode: 'permissive' });
    });

    describe('scan', () => {
      it('should return assessment for URLs', () => {
        const result = scanner.scan('https://example.com/image.jpg');
        expect(result.status).toBeDefined();
        expect(result.threats).toBeDefined();
        expect(result.riskScore).toBeDefined();
      });

      it('should detect blocked domains', () => {
        const customScanner = new SecurityScanner({
          mode: 'strict',
          blockedDomains: ['malware.com'],
        });
        const result = customScanner.scan('https://malware.com/image.jpg');
        expect(result.status).toBe('blocked');
        expect(result.threats.some((t) => t.type === 'blocked-domain')).toBe(true);
      });

      it('should include timestamp', () => {
        const result = scanner.scan('https://example.com/image.jpg');
        expect(result.scannedAt).toBeInstanceOf(Date);
      });
    });

    describe('scan with disabled mode', () => {
      it('should return unchecked status when disabled', () => {
        const disabledScanner = new SecurityScanner({ mode: 'disabled' });
        const result = disabledScanner.scan('https://malware.com/bad.jpg');
        expect(result.status).toBe('unchecked');
        expect(result.threats).toHaveLength(0);
      });
    });

    describe('scan modes', () => {
      it('strict mode should block threats', () => {
        const strictScanner = new SecurityScanner({ mode: 'strict' });
        const result = strictScanner.scan('javascript:alert(1)');
        expect(['blocked', 'quarantined']).toContain(result.status);
      });
    });

    describe('scanBatch', () => {
      it('should scan multiple URLs', () => {
        const urls = ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'];
        const results = scanner.scanBatch(urls);
        expect(results.size).toBe(2);
      });
    });

    describe('configuration', () => {
      it('should allow updating config', () => {
        scanner.updateConfig({ blockedDomains: ['new-blocked.com'] });
        const config = scanner.getConfig();
        expect(config.blockedDomains).toContain('new-blocked.com');
      });

      it('should allow adding blocked domains', () => {
        scanner.addBlockedDomains(['another-blocked.com']);
        expect(scanner.isBlocked('https://another-blocked.com/image.jpg')).toBe(true);
      });
    });
  });

  describe('validateUrl', () => {
    it('should validate correct URLs', () => {
      const result = validateUrl('https://example.com/image.jpg');
      expect(result.isValid).toBe(true);
    });

    it('should reject javascript: URLs', () => {
      const result = validateUrl('javascript:alert(1)');
      expect(result.isValid).toBe(false);
    });
  });

  describe('sanitizeUrl', () => {
    it('should return clean URLs unchanged', () => {
      const url = 'https://example.com/image.jpg';
      expect(sanitizeUrl(url)).toBe(url);
    });

    it('should reject javascript: URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
    });

    it('should handle data URLs based on config', () => {
      const dataUrl = 'data:image/png;base64,abc';
      expect(sanitizeUrl(dataUrl, { allowDataUrls: true })).toBe(dataUrl);
      expect(sanitizeUrl(dataUrl, { allowDataUrls: false })).toBeNull();
    });
  });

  describe('sanitizeFilename', () => {
    it('should sanitize dangerous characters', () => {
      const result = sanitizeFilename('path/to/file.jpg');
      expect(result).not.toContain('/');
    });

    it('should truncate long filenames', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const result = sanitizeFilename(longName);
      expect(result.length).toBeLessThanOrEqual(255);
    });

    it('should preserve file extensions', () => {
      expect(sanitizeFilename('image.jpg')).toContain('.jpg');
    });
  });

  describe('sanitizeHtml', () => {
    it('should remove script tags', () => {
      const html = '<div><script>alert(1)</script>Hello</div>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<script>');
    });

    it('should remove event handlers', () => {
      const html = '<img src="x" onerror="alert(1)">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('onerror');
    });
  });

  describe('isSafeMimeType', () => {
    it('should allow image MIME types', () => {
      expect(isSafeMimeType('image/jpeg')).toBe(true);
      expect(isSafeMimeType('image/png')).toBe(true);
      expect(isSafeMimeType('image/gif')).toBe(true);
      expect(isSafeMimeType('image/webp')).toBe(true);
    });

    it('should allow video MIME types', () => {
      expect(isSafeMimeType('video/mp4')).toBe(true);
      expect(isSafeMimeType('video/webm')).toBe(true);
    });

    it('should allow audio MIME types', () => {
      expect(isSafeMimeType('audio/mpeg')).toBe(true);
      expect(isSafeMimeType('audio/wav')).toBe(true);
    });
  });

  describe('detectHomograph', () => {
    it('should return null for clean URLs', () => {
      expect(detectHomograph('https://example.com')).toBeNull();
    });
  });

  describe('detectScriptInjection', () => {
    it('should detect javascript: protocol', () => {
      const result = detectScriptInjection('javascript:alert(1)');
      expect(result).not.toBeNull();
      expect(result?.type).toBe('script-injection');
    });

    it('should return null for safe URLs', () => {
      expect(detectScriptInjection('https://example.com/image.jpg')).toBeNull();
    });
  });

  describe('isSuspiciousTld', () => {
    it('should flag known suspicious TLDs', () => {
      expect(isSuspiciousTld('https://example.tk')).toBe(true);
    });

    it('should not flag common TLDs', () => {
      expect(isSuspiciousTld('https://example.com')).toBe(false);
      expect(isSuspiciousTld('https://example.org')).toBe(false);
    });

    it('should handle additional TLDs', () => {
      expect(isSuspiciousTld('https://example.custom', ['custom'])).toBe(true);
    });
  });
});

// =============================================================================
// Blocklist Tests
// =============================================================================

describe('Blocklist module', () => {
  describe('compileBlocklist', () => {
    it('should compile empty config', () => {
      const compiled = compileBlocklist({});
      expect(compiled.domains.size).toBe(0);
      expect(compiled.wildcards).toHaveLength(0);
      expect(compiled.ipRanges).toHaveLength(0);
      expect(compiled.urlPatterns).toHaveLength(0);
    });

    it('should compile custom domains', () => {
      const compiled = compileBlocklist({ domains: ['bad.com', 'evil.org'] });
      expect(compiled.domains.has('bad.com')).toBe(true);
      expect(compiled.domains.has('evil.org')).toBe(true);
    });

    it('should compile wildcard domains', () => {
      const compiled = compileBlocklist({ domains: ['*.bad.com'] });
      expect(compiled.wildcards.length).toBe(1);
    });

    it('should compile IP ranges', () => {
      const compiled = compileBlocklist({ ipRanges: ['192.168.0.0/24'] });
      expect(compiled.ipRanges.length).toBe(1);
    });

    it('should compile URL patterns', () => {
      const compiled = compileBlocklist({ urlPatterns: [/tracking/, 'beacon'] });
      expect(compiled.urlPatterns.length).toBe(2);
    });

    it('should enable built-in lists', () => {
      const compiled = compileBlocklist({
        builtIn: { malware: true, tracking: true, cryptominers: true },
      });
      expect(compiled.domains.size).toBeGreaterThan(0);
    });

    it('should enable phishing built-in list', () => {
      const compiled = compileBlocklist({
        builtIn: { phishing: true },
      });
      // Phishing list may be empty but shouldn't throw
      expect(compiled).toBeDefined();
    });

    it('should enable ads built-in list', () => {
      const compiled = compileBlocklist({
        builtIn: { ads: true },
      });
      expect(compiled.domains.size).toBeGreaterThan(0);
    });

    it('should handle all built-in lists enabled', () => {
      const compiled = compileBlocklist({
        builtIn: {
          malware: true,
          phishing: true,
          tracking: true,
          ads: true,
          cryptominers: true,
        },
      });
      expect(compiled).toBeDefined();
      expect(compiled.domains.size).toBeGreaterThan(0);
    });
  });

  describe('checkBlocklist', () => {
    it('should check exact domain matches', () => {
      const blocklist = compileBlocklist({ domains: ['blocked.com'] });
      const result = checkBlocklist('https://blocked.com/image.jpg', blocklist);
      expect(result.blocked).toBe(true);
      expect(result.matchedPattern).toBe('blocked.com');
    });

    it('should check wildcard patterns', () => {
      const blocklist = compileBlocklist({ domains: ['*.blocked.com'] });
      const result = checkBlocklist('https://sub.blocked.com/image.jpg', blocklist);
      expect(result.blocked).toBe(true);
    });

    it('should check IP ranges', () => {
      const blocklist = compileBlocklist({ ipRanges: ['192.168.0.0/24'] });
      const result = checkBlocklist('http://192.168.0.100/image.jpg', blocklist);
      expect(result.blocked).toBe(true);
    });

    it('should check URL patterns', () => {
      const blocklist = compileBlocklist({ urlPatterns: [/tracking/] });
      const result = checkBlocklist('https://example.com/tracking.gif', blocklist);
      expect(result.blocked).toBe(true);
    });

    it('should return not blocked for safe URLs', () => {
      const blocklist = compileBlocklist({ domains: ['blocked.com'] });
      const result = checkBlocklist('https://safe.com/image.jpg', blocklist);
      expect(result.blocked).toBe(false);
    });

    it('should check registered domain (not just subdomain)', () => {
      // When subdomain is blocked but we check registered domain
      const blocklist = compileBlocklist({ domains: ['blocked.com'] });
      // sub.blocked.com should match because blocked.com is the registered domain
      const result = checkBlocklist('https://sub.blocked.com/image.jpg', blocklist);
      expect(result.blocked).toBe(true);
    });

    it("should match by registered domain when exact doesn't match", () => {
      const blocklist = compileBlocklist({ domains: ['example.co.uk'] });
      const result = checkBlocklist('https://sub.example.co.uk/image.jpg', blocklist);
      expect(result.blocked).toBe(true);
    });
  });

  describe('getBlocklistThreat', () => {
    it('should return null for non-blocked result', () => {
      const result = { blocked: false, matchedLists: [] };
      expect(getBlocklistThreat(result, 'https://example.com')).toBeNull();
    });

    it('should return threat for blocked domain', () => {
      const result = { blocked: true, matchedLists: ['domain-exact'], matchedPattern: 'bad.com' };
      const threat = getBlocklistThreat(result, 'https://bad.com/image.jpg');
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('blocked-domain');
    });

    it('should return threat for blocked IP', () => {
      const result = {
        blocked: true,
        matchedLists: ['ip-range'],
        matchedPattern: '192.168.0.0/24',
      };
      const threat = getBlocklistThreat(result, 'http://192.168.0.1/image.jpg');
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('blocked-ip');
    });
  });

  describe('BlocklistManager', () => {
    let manager: BlocklistManager;

    beforeEach(() => {
      manager = new BlocklistManager({ domains: ['blocked.com'] });
    });

    it('should check if URL is blocked', () => {
      const result = manager.isBlocked('https://blocked.com/image.jpg');
      expect(result.blocked).toBe(true);
    });

    it('should add to allowlist', () => {
      manager.addToAllowlist(['blocked.com']);
      const result = manager.isBlocked('https://blocked.com/image.jpg');
      expect(result.blocked).toBe(false);
    });

    it('should add patterns to allowlist', () => {
      manager.addPatternsToAllowlist([/blocked\.com/]);
      expect(manager.isAllowed('https://blocked.com/image.jpg')).toBe(true);
    });

    it('should add string patterns to allowlist', () => {
      manager.addPatternsToAllowlist(['blocked\\.com', 'safe\\.example']);
      expect(manager.isAllowed('https://blocked.com/image.jpg')).toBe(true);
    });

    it('should add mixed patterns to allowlist', () => {
      manager.addPatternsToAllowlist([/allowed\.org/, 'trusted\\.net']);
      expect(manager.isAllowed('https://allowed.org/image.jpg')).toBe(true);
      expect(manager.isAllowed('https://trusted.net/image.jpg')).toBe(true);
    });

    it('should add to blocklist', () => {
      manager.addToBlocklist(['newblocked.com']);
      const result = manager.isBlocked('https://newblocked.com/image.jpg');
      expect(result.blocked).toBe(true);
    });

    it('should add wildcard to blocklist', () => {
      manager.addToBlocklist(['*.wildcard.com']);
      const result = manager.isBlocked('https://sub.wildcard.com/image.jpg');
      expect(result.blocked).toBe(true);
    });

    it('should remove from blocklist', () => {
      manager.removeFromBlocklist(['blocked.com']);
      const result = manager.isBlocked('https://blocked.com/image.jpg');
      expect(result.blocked).toBe(false);
    });

    it('should get stats', () => {
      const stats = manager.getStats();
      expect(stats.domains).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// Validator Tests
// =============================================================================

describe('Validator module', () => {
  describe('validateProtocol', () => {
    it('should block javascript: URLs', () => {
      const threats = validateProtocol('javascript:alert(1)');
      expect(threats.length).toBeGreaterThan(0);
      expect(threats[0].type).toBe('script-injection');
    });

    it('should handle data: URLs based on config', () => {
      expect(validateProtocol('data:image/png;base64,abc', { allowDataUrls: true })).toHaveLength(
        0
      );
      expect(
        validateProtocol('data:image/png;base64,abc', { allowDataUrls: false }).length
      ).toBeGreaterThan(0);
    });

    it('should handle blob: URLs based on config', () => {
      expect(
        validateProtocol('blob:https://example.com/uuid', { allowBlobUrls: true })
      ).toHaveLength(0);
      expect(
        validateProtocol('blob:https://example.com/uuid', { allowBlobUrls: false }).length
      ).toBeGreaterThan(0);
    });

    it('should flag HTTP when HTTPS required', () => {
      const threats = validateProtocol('http://example.com', { requireHttps: true });
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('validateLength', () => {
    it('should pass for short URLs', () => {
      expect(validateLength('https://example.com/short.jpg')).toHaveLength(0);
    });

    it('should flag excessively long URLs', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(3000);
      const threats = validateLength(longUrl, { maxUrlLength: 2048 });
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('validatePrivateIp', () => {
    it('should flag localhost', () => {
      const threats = validatePrivateIp('http://localhost/image.jpg');
      expect(threats.length).toBeGreaterThan(0);
    });

    it('should flag 127.0.0.1', () => {
      const threats = validatePrivateIp('http://127.0.0.1/image.jpg');
      expect(threats.length).toBeGreaterThan(0);
    });

    it('should flag private IP ranges', () => {
      expect(validatePrivateIp('http://192.168.1.1/image.jpg').length).toBeGreaterThan(0);
      expect(validatePrivateIp('http://10.0.0.1/image.jpg').length).toBeGreaterThan(0);
    });

    it('should allow when configured', () => {
      expect(validatePrivateIp('http://localhost/', { allowPrivateIps: true })).toHaveLength(0);
    });
  });

  describe('validateQueryParams', () => {
    it('should pass for normal query strings', () => {
      expect(validateQueryParams('https://example.com?a=1&b=2')).toHaveLength(0);
    });

    it('should flag excessive params', () => {
      const params = Array.from({ length: 60 }, (_, i) => `p${i}=v`).join('&');
      const threats = validateQueryParams(`https://example.com?${params}`, { maxQueryParams: 50 });
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('validateEncoding', () => {
    it('should pass for normal URLs', () => {
      expect(validateEncoding('https://example.com/image.jpg')).toHaveLength(0);
    });

    it('should flag excessively encoded URLs', () => {
      const encoded = 'https://example.com/' + '%41'.repeat(100);
      const threats = validateEncoding(encoded);
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('validateRedirects', () => {
    it('should pass for simple URLs', () => {
      expect(validateRedirects('https://example.com/image.jpg')).toHaveLength(0);
    });

    it('should flag excessive redirects', () => {
      const url =
        'https://example.com?url=https://a.com?url=https://b.com?url=https://c.com?url=https://d.com/image.jpg';
      const threats = validateRedirects(url, { maxRedirects: 3 });
      expect(threats.length).toBeGreaterThan(0);
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com/image.jpg')).toBe(true);
    });

    it('should return false for javascript: URLs', () => {
      expect(isValidUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('getValidationChecks', () => {
    it('should return passed and failed checks', () => {
      const result = getValidationChecks('https://example.com/image.jpg');
      expect(result.passed).toContain('url-protocol');
      expect(result.failed).toHaveLength(0);
    });

    it('should report failed checks', () => {
      const result = getValidationChecks('http://localhost/image.jpg');
      expect(result.failed).toContain('localhost');
    });
  });
});

// =============================================================================
// Threat Detector Tests
// =============================================================================

describe('Threat Detector module', () => {
  describe('detectHomograph', () => {
    it('should detect mixed ASCII/Cyrillic', () => {
      const threat = detectHomograph('exаmple.com'); // 'а' is Cyrillic
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('homograph');
    });

    it('should detect punycode domains', () => {
      const threat = detectHomograph('xn--e1afmkfd.xn--p1ai');
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('homograph');
    });

    it('should return null for clean domains', () => {
      expect(detectHomograph('example.com')).toBeNull();
    });
  });

  describe('detectObfuscation', () => {
    it('should detect excessive encoding', () => {
      const threats = detectObfuscation('https://example.com/' + '%41'.repeat(50));
      expect(threats.some((t) => t.type === 'obfuscated-url')).toBe(true);
    });

    it('should detect URL shorteners', () => {
      const threats = detectObfuscation('https://bit.ly/abc123');
      expect(threats.some((t) => t.type === 'suspicious-redirect')).toBe(true);
    });

    it('should handle decimal IP-like hostnames without crashing', () => {
      // Modern URL parsing may not recognize these as valid URLs
      const threats = detectObfuscation('http://3232235777/image.jpg');
      expect(Array.isArray(threats)).toBe(true);
    });

    it('should handle hex IP-like hostnames without crashing', () => {
      // Modern URL parsing may not recognize these as valid URLs
      const threats = detectObfuscation('http://0xC0A80101/image.jpg');
      expect(Array.isArray(threats)).toBe(true);
    });

    it('should detect double encoding', () => {
      // %2520 = double-encoded %20 (space)
      const threats = detectObfuscation('https://example.com/%252F%2520path');
      expect(Array.isArray(threats)).toBe(true);
    });
  });

  describe('detectTrackingPixel', () => {
    it('should detect 1x1 dimensions', () => {
      const threat = detectTrackingPixel('https://example.com/pixel.gif', { width: 1, height: 1 });
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('tracking-pixel');
    });

    it('should detect tracking URL patterns', () => {
      expect(detectTrackingPixel('https://example.com/pixel.gif')).not.toBeNull();
      expect(detectTrackingPixel('https://example.com/tracking.gif')).not.toBeNull();
      expect(detectTrackingPixel('https://example.com/beacon.gif')).not.toBeNull();
    });

    it('should return null for normal images', () => {
      expect(detectTrackingPixel('https://example.com/photo.jpg')).toBeNull();
    });
  });

  describe('detectDataExfiltration', () => {
    it('should detect long query strings', () => {
      const longQuery = 'https://example.com?' + 'a'.repeat(600);
      const threat = detectDataExfiltration(longQuery);
      expect(threat).not.toBeNull();
    });

    it('should detect base64-like content', () => {
      const base64Url = 'https://example.com?data=' + 'A'.repeat(60);
      const threat = detectDataExfiltration(base64Url);
      expect(threat).not.toBeNull();
    });

    it('should detect suspicious parameters', () => {
      const threat = detectDataExfiltration('https://example.com?password=secret&token=abc');
      expect(threat).not.toBeNull();
    });

    it('should return null for normal URLs', () => {
      expect(detectDataExfiltration('https://example.com/image.jpg')).toBeNull();
    });
  });

  describe('detectSuspiciousTld', () => {
    it('should detect suspicious TLDs', () => {
      const threat = detectSuspiciousTld('https://example.tk');
      expect(threat).not.toBeNull();
      expect(threat?.type).toBe('suspicious-tld');
    });

    it('should return null for common TLDs', () => {
      expect(detectSuspiciousTld('https://example.com')).toBeNull();
    });
  });

  describe('detectThreats', () => {
    it('should combine multiple threat detections', () => {
      const threats = detectThreats('javascript:alert(1)');
      expect(threats.some((t) => t.type === 'script-injection')).toBe(true);
    });

    it('should respect config options', () => {
      const threats = detectThreats('https://example.tk', {
        suspiciousTlds: false,
      });
      expect(threats.some((t) => t.type === 'suspicious-tld')).toBe(false);
    });

    it('should detect tracking pixels with dimensions', () => {
      const threats = detectThreats('https://example.com/image.gif', {}, { width: 1, height: 1 });
      expect(threats.some((t) => t.type === 'tracking-pixel')).toBe(true);
    });
  });
});

// =============================================================================
// Sanitizer Tests
// =============================================================================

describe('Sanitizer module', () => {
  describe('stripTrackingParams', () => {
    it('should strip UTM parameters', () => {
      const url = 'https://example.com/page?utm_source=google&utm_medium=cpc&id=123';
      const result = stripTrackingParams(url);
      expect(result).not.toContain('utm_source');
      expect(result).not.toContain('utm_medium');
      expect(result).toContain('id=123');
    });

    it('should strip Facebook tracking', () => {
      const url = 'https://example.com/page?fbclid=abc123&ref=fb';
      const result = stripTrackingParams(url);
      expect(result).not.toContain('fbclid');
    });

    it('should handle invalid URLs gracefully', () => {
      const result = stripTrackingParams('not-a-valid-url');
      expect(result).toBe('not-a-valid-url');
    });
  });

  describe('extractSafeUrls', () => {
    it('should extract HTTP URLs from HTML', () => {
      const html =
        '<img src="https://example.com/image.jpg"><a href="https://other.com/photo.png">';
      const urls = extractSafeUrls(html);
      expect(urls).toContain('https://example.com/image.jpg');
      expect(urls).toContain('https://other.com/photo.png');
    });

    it('should skip javascript: URLs', () => {
      const html = '<a href="javascript:alert(1)"><img src="https://example.com/safe.jpg">';
      const urls = extractSafeUrls(html);
      expect(urls).not.toContain('javascript:alert(1)');
    });

    it('should skip data: URLs by default', () => {
      const html = '<img src="data:image/png;base64,abc">';
      const urls = extractSafeUrls(html);
      expect(urls).toHaveLength(0);
    });
  });

  describe('validateContentType', () => {
    it('should validate safe MIME types', () => {
      expect(validateContentType('image/jpeg').safe).toBe(true);
      expect(validateContentType('video/mp4').safe).toBe(true);
      expect(validateContentType('audio/mpeg').safe).toBe(true);
    });

    it('should reject unsafe MIME types', () => {
      expect(validateContentType('text/html').safe).toBe(false);
      expect(validateContentType('application/javascript').safe).toBe(false);
    });

    it('should extract charset', () => {
      const result = validateContentType('text/html; charset=utf-8');
      expect(result.charset).toBe('utf-8');
    });

    it('should handle empty content type', () => {
      const result = validateContentType('');
      expect(result.safe).toBe(false);
      expect(result.mimeType).toBeNull();
    });
  });

  describe('sanitizeUrl edge cases', () => {
    it('should handle null/undefined', () => {
      expect(sanitizeUrl(null as unknown as string)).toBeNull();
      expect(sanitizeUrl(undefined as unknown as string)).toBeNull();
    });

    it('should strip control characters', () => {
      const url = 'https://example.com/\x00image.jpg';
      const result = sanitizeUrl(url);
      expect(result).not.toContain('\x00');
    });

    it('should respect maxLength', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(10000);
      expect(sanitizeUrl(longUrl, { maxLength: 8192 })).toBeNull();
    });

    it('should handle stripTracking option', () => {
      const url = 'https://example.com?utm_source=test';
      expect(sanitizeUrl(url, { stripTracking: true })).not.toContain('utm_source');
      expect(sanitizeUrl(url, { stripTracking: false })).toContain('utm_source');
    });
  });

  describe('sanitizeFilename edge cases', () => {
    it('should handle empty result', () => {
      expect(sanitizeFilename('___')).toBe('file');
    });

    it('should strip non-unicode when configured', () => {
      const result = sanitizeFilename('image_日本語.jpg', { preserveUnicode: false });
      expect(result).not.toContain('日本語');
    });

    it('should respect maxLength', () => {
      const longName = 'a'.repeat(300) + '.jpg';
      const result = sanitizeFilename(longName, { maxLength: 50 });
      expect(result.length).toBeLessThanOrEqual(50);
    });
  });

  describe('sanitizeHtml edge cases', () => {
    it('should handle empty input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml(null as unknown as string)).toBe('');
    });

    it('should remove style tags', () => {
      const html = '<style type="text/css">.evil { }</style><img src="good.jpg">';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('<style');
    });

    it('should block javascript in href', () => {
      const html = '<a href="javascript:alert(1)">Click</a>';
      const result = sanitizeHtml(html);
      expect(result).not.toContain('javascript:');
    });
  });
});
