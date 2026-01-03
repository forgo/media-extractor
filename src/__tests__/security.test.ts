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
        expect(result.threats.some(t => t.type === 'blocked-domain')).toBe(true);
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
        const urls = [
          'https://example.com/image1.jpg',
          'https://example.com/image2.jpg',
        ];
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
  });
});
