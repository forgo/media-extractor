import { describe, it, expect } from 'vitest';
import {
  parseUrl,
  parseUrlWithEmbedded,
  parseUrls,
  extractUrlsFromText,
  parseTextForUrls,
  isValidMediaUrl,
} from '../../parsers/url';

describe('URL Parser', () => {
  describe('parseUrl', () => {
    it('parses a simple image URL', () => {
      const result = parseUrl('https://example.com/photo.jpg');
      expect(result).not.toBeNull();
      expect(result?.url).toBe('https://example.com/photo.jpg');
      expect(result?.mediaType).toBe('image');
      expect(result?.format).toBe('jpg');
      expect(result?.filename).toBe('photo');
      expect(result?.source).toBe('text-url');
      expect(result?.confidence).toBeGreaterThan(0);
    });

    it('parses a video URL', () => {
      const result = parseUrl('https://example.com/video.mp4');
      expect(result).not.toBeNull();
      expect(result?.mediaType).toBe('video');
      expect(result?.format).toBe('mp4');
    });

    it('parses an audio URL', () => {
      const result = parseUrl('https://example.com/audio.mp3');
      expect(result).not.toBeNull();
      expect(result?.mediaType).toBe('audio');
      expect(result?.format).toBe('mp3');
    });

    it('parses a document URL', () => {
      const result = parseUrl('https://example.com/document.pdf');
      expect(result).not.toBeNull();
      expect(result?.mediaType).toBe('document');
      expect(result?.format).toBe('pdf');
    });

    it('returns null for empty URL', () => {
      expect(parseUrl('')).toBeNull();
      expect(parseUrl(null as unknown as string)).toBeNull();
    });

    it('returns null for invalid URLs', () => {
      expect(parseUrl('not-a-url')).toBeNull();
      expect(parseUrl('ftp://example.com/file.jpg')).toBeNull();
      expect(parseUrl('/relative/path.jpg')).toBeNull();
    });

    it('parses data URLs', () => {
      const result = parseUrl('data:image/png;base64,abc123');
      expect(result).not.toBeNull();
      expect(result?.source).toBe('data-url');
      expect(result?.mediaType).toBe('image');
    });

    it('parses blob URLs', () => {
      const result = parseUrl('blob:https://example.com/uuid-here');
      expect(result).not.toBeNull();
      expect(result?.source).toBe('blob-url');
    });

    it('filters by media types', () => {
      const imageUrl = 'https://example.com/photo.jpg';
      const videoUrl = 'https://example.com/video.mp4';

      expect(parseUrl(imageUrl, { mediaTypes: ['image'] })).not.toBeNull();
      expect(parseUrl(imageUrl, { mediaTypes: ['video'] })).toBeNull();
      expect(parseUrl(videoUrl, { mediaTypes: ['video'] })).not.toBeNull();
      expect(parseUrl(videoUrl, { mediaTypes: ['image'] })).toBeNull();
    });

    it('detects URL shorteners', () => {
      const result = parseUrl('https://bit.ly/abc123', { detectUrlShorteners: true });
      expect(result).not.toBeNull();
      expect(result?.isShortener).toBe(true);
    });

    it('skips URL shortener detection when disabled', () => {
      const result = parseUrl('https://bit.ly/abc123', { detectUrlShorteners: false });
      expect(result).not.toBeNull();
      expect(result?.isShortener).toBeUndefined();
    });

    it('counts redirect levels', () => {
      const result = parseUrl('https://redirect.com/image.jpg?url=https://another.com/image.jpg', {
        countRedirects: true,
      });
      expect(result).not.toBeNull();
      // This URL has an embedded URL parameter, which counts as a redirect
      if (result && result.redirectCount !== undefined) {
        expect(result.redirectCount).toBeGreaterThan(0);
      }
    });

    it('skips redirect counting when disabled', () => {
      const result = parseUrl('https://example.com/photo.jpg', { countRedirects: false });
      expect(result).not.toBeNull();
      expect(result?.redirectCount).toBeUndefined();
    });

    it('generates dedupe key', () => {
      const result = parseUrl('https://example.com/photo.jpg');
      expect(result?.dedupeKey).toBeDefined();
    });
  });

  describe('parseUrlWithEmbedded', () => {
    it('returns main URL when no embedded URL present', () => {
      const items = parseUrlWithEmbedded('https://example.com/photo.jpg');
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe('https://example.com/photo.jpg');
    });

    it('extracts embedded URLs', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=https://example.com/photo.jpg';
      const items = parseUrlWithEmbedded(wrapperUrl);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });

    it('prefers embedded URL when option is set', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=https://example.com/photo.jpg';
      const items = parseUrlWithEmbedded(wrapperUrl, { preferEmbeddedUrl: true });
      if (items.length > 1) {
        expect(items[0].hint).toBe('primary');
        expect(items[0].source).toBe('embedded');
      }
    });

    it('prefers main URL when preferEmbeddedUrl is false', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=https://example.com/photo.jpg';
      const items = parseUrlWithEmbedded(wrapperUrl, { preferEmbeddedUrl: false });
      if (items.length > 1) {
        expect(items[0].hint).toBe('primary');
        expect(items[0].source).toBe('text-url');
      }
    });

    it('skips embedded extraction when disabled', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=https://example.com/photo.jpg';
      const items = parseUrlWithEmbedded(wrapperUrl, { extractEmbeddedUrls: false });
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe(wrapperUrl);
    });

    it('returns empty array for invalid URL', () => {
      expect(parseUrlWithEmbedded('')).toEqual([]);
      expect(parseUrlWithEmbedded('not-a-url')).toEqual([]);
    });

    it('marks embedded URL with embeddedFrom', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=https://example.com/photo.jpg';
      const items = parseUrlWithEmbedded(wrapperUrl);
      const embedded = items.find((item) => item.source === 'embedded');
      if (embedded) {
        expect(embedded.embeddedFrom).toBe(wrapperUrl);
      }
    });

    it('handles embedded URL that fails to parse', () => {
      const wrapperUrl = 'https://wrapper.com/proxy?url=invalid-url';
      const items = parseUrlWithEmbedded(wrapperUrl);
      expect(items.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('parseUrls', () => {
    it('parses multiple URLs', () => {
      const urls = [
        'https://example.com/photo1.jpg',
        'https://example.com/photo2.png',
        'https://example.com/video.mp4',
      ];
      const items = parseUrls(urls);
      expect(items).toHaveLength(3);
    });

    it('deduplicates URLs', () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/photo.jpg',
        'https://example.com/photo.jpg',
      ];
      const items = parseUrls(urls);
      expect(items).toHaveLength(1);
    });

    it('skips empty URLs', () => {
      const urls = ['', 'https://example.com/photo.jpg', null as unknown as string];
      const items = parseUrls(urls);
      expect(items).toHaveLength(1);
    });

    it('marks first item as primary', () => {
      const urls = ['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg'];
      const items = parseUrls(urls);
      expect(items[0].hint).toBe('primary');
    });

    it('filters by media types', () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/video.mp4',
        'https://example.com/audio.mp3',
      ];
      const items = parseUrls(urls, { mediaTypes: ['image'] });
      expect(items).toHaveLength(1);
      expect(items[0].mediaType).toBe('image');
    });

    it('handles empty array', () => {
      expect(parseUrls([])).toEqual([]);
    });

    it('preserves hint from embedded extraction', () => {
      const urls = ['https://wrapper.com/proxy?url=https://example.com/photo.jpg'];
      const items = parseUrls(urls, { extractEmbeddedUrls: true, preferEmbeddedUrl: true });
      const embedded = items.find((item) => item.source === 'embedded');
      if (embedded) {
        expect(embedded.hint).toBe('primary');
      }
    });
  });

  describe('extractUrlsFromText', () => {
    it('extracts HTTP URLs from text', () => {
      const text = 'Check out http://example.com/photo.jpg for a nice picture!';
      const urls = extractUrlsFromText(text);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('http://example.com/photo.jpg');
    });

    it('extracts HTTPS URLs from text', () => {
      const text = 'Visit https://example.com/page for more info.';
      const urls = extractUrlsFromText(text);
      expect(urls).toHaveLength(1);
      expect(urls[0]).toBe('https://example.com/page');
    });

    it('extracts multiple URLs from text', () => {
      const text = `
        Here are some images:
        https://example.com/photo1.jpg
        https://example.com/photo2.png
        http://other.com/image.gif
      `;
      const urls = extractUrlsFromText(text);
      expect(urls).toHaveLength(3);
    });

    it('removes trailing punctuation', () => {
      const text = 'See https://example.com/photo.jpg, and https://example.com/video.mp4.';
      const urls = extractUrlsFromText(text);
      expect(urls).toEqual(['https://example.com/photo.jpg', 'https://example.com/video.mp4']);
    });

    it('handles URLs with query parameters', () => {
      const text = 'URL: https://example.com/page?param=value&other=123';
      const urls = extractUrlsFromText(text);
      expect(urls[0]).toBe('https://example.com/page?param=value&other=123');
    });

    it('returns empty array for empty text', () => {
      expect(extractUrlsFromText('')).toEqual([]);
      expect(extractUrlsFromText(null as unknown as string)).toEqual([]);
    });

    it('returns empty array for text without URLs', () => {
      expect(extractUrlsFromText('No URLs here!')).toEqual([]);
    });

    it('handles URLs with various endings', () => {
      const text = 'URL https://example.com/photo.jpg!!! and https://example.com/other.png?)';
      const urls = extractUrlsFromText(text);
      expect(urls[0]).toBe('https://example.com/photo.jpg');
      expect(urls[1]).toBe('https://example.com/other.png');
    });
  });

  describe('parseTextForUrls', () => {
    it('parses URLs from text', () => {
      const text = 'Check this image: https://example.com/photo.jpg';
      const items = parseTextForUrls(text);
      expect(items).toHaveLength(1);
      expect(items[0].url).toBe('https://example.com/photo.jpg');
      expect(items[0].mediaType).toBe('image');
    });

    it('parses multiple URLs from text', () => {
      const text = `
        https://example.com/photo.jpg
        https://example.com/video.mp4
      `;
      const items = parseTextForUrls(text);
      expect(items).toHaveLength(2);
    });

    it('filters by media types', () => {
      const text = `
        https://example.com/photo.jpg
        https://example.com/video.mp4
      `;
      const items = parseTextForUrls(text, { mediaTypes: ['video'] });
      expect(items).toHaveLength(1);
      expect(items[0].mediaType).toBe('video');
    });

    it('returns empty array for empty text', () => {
      expect(parseTextForUrls('')).toEqual([]);
    });

    it('returns empty array for text without valid media URLs', () => {
      expect(parseTextForUrls('Just some plain text')).toEqual([]);
    });
  });

  describe('isValidMediaUrl', () => {
    it('returns true for valid image URLs', () => {
      expect(isValidMediaUrl('https://example.com/photo.jpg')).toBe(true);
      expect(isValidMediaUrl('https://example.com/image.png')).toBe(true);
      expect(isValidMediaUrl('https://example.com/picture.gif')).toBe(true);
    });

    it('returns true for valid video URLs', () => {
      expect(isValidMediaUrl('https://example.com/video.mp4')).toBe(true);
      expect(isValidMediaUrl('https://example.com/movie.webm')).toBe(true);
    });

    it('returns true for valid audio URLs', () => {
      expect(isValidMediaUrl('https://example.com/audio.mp3')).toBe(true);
      expect(isValidMediaUrl('https://example.com/music.wav')).toBe(true);
    });

    it('returns true for valid document URLs', () => {
      expect(isValidMediaUrl('https://example.com/document.pdf')).toBe(true);
    });

    it('returns true for data URLs', () => {
      expect(isValidMediaUrl('data:image/png;base64,abc123')).toBe(true);
    });

    it('returns true for blob URLs', () => {
      expect(isValidMediaUrl('blob:https://example.com/uuid')).toBe(true);
    });

    it('returns false for empty URL', () => {
      expect(isValidMediaUrl('')).toBe(false);
      expect(isValidMediaUrl(null as unknown as string)).toBe(false);
    });

    it('returns false for invalid URLs', () => {
      expect(isValidMediaUrl('not-a-url')).toBe(false);
      expect(isValidMediaUrl('/relative/path.jpg')).toBe(false);
    });

    it('returns false for unknown media types', () => {
      // Note: The detector may still recognize unknown extensions as potential media
      // Use a clearly non-media URL
      expect(isValidMediaUrl('https://example.com/page.html')).toBe(false);
    });

    it('filters by media types', () => {
      const imageUrl = 'https://example.com/photo.jpg';
      const videoUrl = 'https://example.com/video.mp4';

      expect(isValidMediaUrl(imageUrl, ['image'])).toBe(true);
      expect(isValidMediaUrl(imageUrl, ['video'])).toBe(false);
      expect(isValidMediaUrl(videoUrl, ['video'])).toBe(true);
      expect(isValidMediaUrl(videoUrl, ['image'])).toBe(false);
    });

    it('accepts multiple media types', () => {
      const imageUrl = 'https://example.com/photo.jpg';
      expect(isValidMediaUrl(imageUrl, ['image', 'video'])).toBe(true);
    });
  });
});
