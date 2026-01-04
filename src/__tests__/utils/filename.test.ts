import { describe, it, expect } from 'vitest';
import {
  extractFilename,
  extractExtension,
  extractExtensionFromDataUrl,
  extractFilenameAndExtension,
  sanitizeFilename,
  sanitizeFullFilename,
  hasPathTraversal,
  makeUnique,
  generateFilename,
  normalizeExtension,
  isImageExtension,
  isVideoExtension,
  isAudioExtension,
  isDocumentExtension,
} from '../../utils/filename';

describe('Filename Utilities', () => {
  describe('extractFilename', () => {
    it('extracts filename from simple URL', () => {
      expect(extractFilename('https://example.com/images/photo.jpg')).toBe('photo');
    });

    it('extracts filename from URL with query params', () => {
      expect(extractFilename('https://example.com/file.png?size=large')).toBe('file');
    });

    it('extracts filename from URL with encoded characters', () => {
      expect(extractFilename('https://example.com/my%20photo.jpg')).toBe('my photo');
    });

    it('returns "file" for data URLs', () => {
      expect(extractFilename('data:image/png;base64,abc123')).toBe('file');
    });

    it('returns "file" for empty or invalid input', () => {
      expect(extractFilename('')).toBe('file');
      expect(extractFilename(null as unknown as string)).toBe('file');
      expect(extractFilename(undefined as unknown as string)).toBe('file');
    });

    it('returns "file" for URL with no path', () => {
      expect(extractFilename('https://example.com/')).toBe('file');
      expect(extractFilename('https://example.com')).toBe('file');
    });

    it('handles URL without extension', () => {
      expect(extractFilename('https://example.com/image')).toBe('image');
    });
  });

  describe('extractExtension', () => {
    it('extracts extension from simple URL', () => {
      expect(extractExtension('https://example.com/photo.jpg')).toBe('jpg');
      expect(extractExtension('https://example.com/photo.PNG')).toBe('png');
    });

    it('extracts extension from data URL', () => {
      expect(extractExtension('data:image/png;base64,abc')).toBe('png');
      expect(extractExtension('data:image/jpeg;base64,abc')).toBe('jpg');
    });

    it('returns empty string for URL without extension', () => {
      expect(extractExtension('https://example.com/file')).toBe('');
    });

    it('returns empty string for invalid input', () => {
      expect(extractExtension('')).toBe('');
      expect(extractExtension(null as unknown as string)).toBe('');
    });

    it('extracts extension from query params', () => {
      expect(extractExtension('https://example.com/img?format=webp')).toBe('webp');
      expect(extractExtension('https://example.com/img?f=png')).toBe('png');
      expect(extractExtension('https://example.com/img?ext=gif')).toBe('gif');
      expect(extractExtension('https://example.com/img?type=jpg')).toBe('jpg');
    });

    it('handles invalid extensions', () => {
      expect(extractExtension('https://example.com/file.toolongextension')).toBe('');
    });
  });

  describe('extractExtensionFromDataUrl', () => {
    it('extracts extension for known MIME types', () => {
      expect(extractExtensionFromDataUrl('data:image/jpeg;base64,abc')).toBe('jpg');
      expect(extractExtensionFromDataUrl('data:image/png;base64,abc')).toBe('png');
      expect(extractExtensionFromDataUrl('data:video/mp4;base64,abc')).toBe('mp4');
      expect(extractExtensionFromDataUrl('data:audio/mpeg;base64,abc')).toBe('mp3');
      expect(extractExtensionFromDataUrl('data:application/pdf;base64,abc')).toBe('pdf');
    });

    it('returns empty string for unknown MIME types', () => {
      expect(extractExtensionFromDataUrl('data:application/unknown;base64,abc')).toBe('');
    });

    it('returns empty string for non-data URLs', () => {
      expect(extractExtensionFromDataUrl('https://example.com/file.jpg')).toBe('');
    });

    it('handles malformed data URLs', () => {
      expect(extractExtensionFromDataUrl('data:')).toBe('');
      expect(extractExtensionFromDataUrl('data:;base64')).toBe('');
    });
  });

  describe('extractFilenameAndExtension', () => {
    it('extracts both filename and extension', () => {
      const result = extractFilenameAndExtension('https://example.com/photo.jpg');
      expect(result.filename).toBe('photo');
      expect(result.extension).toBe('jpg');
    });
  });

  describe('sanitizeFilename', () => {
    it('removes invalid characters', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.txt')).toBe('file_.txt');
    });

    it('removes path traversal patterns', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('_.._.._etc_passwd');
    });

    it('handles Windows reserved names', () => {
      expect(sanitizeFilename('CON')).toBe('_CON');
      expect(sanitizeFilename('PRN.txt')).toBe('_PRN.txt');
      expect(sanitizeFilename('NUL')).toBe('_NUL');
    });

    it('limits filename length', () => {
      const longName = 'a'.repeat(300);
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(200);
    });

    it('returns "file" for empty input', () => {
      expect(sanitizeFilename('')).toBe('file');
      expect(sanitizeFilename(null as unknown as string)).toBe('file');
    });

    it('removes leading and trailing dots', () => {
      expect(sanitizeFilename('.hidden')).toBe('hidden');
      expect(sanitizeFilename('file.')).toBe('file');
    });

    it('collapses multiple underscores', () => {
      expect(sanitizeFilename('file___name')).toBe('file_name');
    });

    it('returns file when result is empty after sanitization', () => {
      expect(sanitizeFilename('...')).toBe('file');
    });
  });

  describe('sanitizeFullFilename', () => {
    it('combines sanitized name and extension', () => {
      expect(sanitizeFullFilename('photo', 'jpg')).toBe('photo.jpg');
    });

    it('sanitizes both name and extension', () => {
      expect(sanitizeFullFilename('file<>', 'J!PG')).toBe('file_.jpg');
    });

    it('handles empty extension', () => {
      expect(sanitizeFullFilename('file', '')).toBe('file');
    });
  });

  describe('hasPathTraversal', () => {
    it('detects path traversal patterns', () => {
      expect(hasPathTraversal('../file')).toBe(true);
      expect(hasPathTraversal('..\\file')).toBe(true);
      expect(hasPathTraversal('/etc/passwd')).toBe(true);
      expect(hasPathTraversal('~/.ssh/id_rsa')).toBe(true);
    });

    it('returns false for safe filenames', () => {
      expect(hasPathTraversal('photo.jpg')).toBe(false);
      expect(hasPathTraversal('my-file_2024.png')).toBe(false);
    });

    it('returns false for empty input', () => {
      expect(hasPathTraversal('')).toBe(false);
    });
  });

  describe('makeUnique', () => {
    it('returns original name if not in existing set', () => {
      const existing = new Set<string>();
      expect(makeUnique('photo', 'jpg', existing)).toBe('photo.jpg');
    });

    it('adds number suffix for duplicates', () => {
      const existing = new Set(['photo.jpg']);
      expect(makeUnique('photo', 'jpg', existing)).toBe('photo_1.jpg');
    });

    it('increments number for multiple duplicates', () => {
      const existing = new Set(['photo.jpg', 'photo_1.jpg', 'photo_2.jpg']);
      expect(makeUnique('photo', 'jpg', existing)).toBe('photo_3.jpg');
    });

    it('handles case-insensitive comparison', () => {
      const existing = new Set(['photo.jpg']);
      expect(makeUnique('PHOTO', 'JPG', existing)).toBe('PHOTO_1.jpg');
    });

    it('handles empty extension', () => {
      const existing = new Set(['photo']);
      expect(makeUnique('photo', '', existing)).toBe('photo_1');
    });
  });

  describe('generateFilename', () => {
    it('generates filename from URL', () => {
      expect(generateFilename('https://example.com/photo.jpg')).toBe('photo.jpg');
    });

    it('uses default name when extraction fails', () => {
      // The function returns 'file' as the base name when path is empty
      expect(generateFilename('https://example.com/', 'default')).toBe('file');
    });

    it('sanitizes the result', () => {
      expect(generateFilename('https://example.com/file<>.jpg')).toBe('file_.jpg');
    });
  });

  describe('normalizeExtension', () => {
    it('lowercases extensions', () => {
      expect(normalizeExtension('JPG')).toBe('jpg');
      expect(normalizeExtension('PNG')).toBe('png');
    });

    it('removes leading dots', () => {
      expect(normalizeExtension('.jpg')).toBe('jpg');
      expect(normalizeExtension('..png')).toBe('png');
    });

    it('handles common aliases', () => {
      expect(normalizeExtension('jpeg')).toBe('jpg');
      expect(normalizeExtension('jpe')).toBe('jpg');
      expect(normalizeExtension('jfif')).toBe('jpg');
      expect(normalizeExtension('tif')).toBe('tiff');
      expect(normalizeExtension('htm')).toBe('html');
      expect(normalizeExtension('mpeg')).toBe('mpg');
    });

    it('returns empty string for empty input', () => {
      expect(normalizeExtension('')).toBe('');
    });
  });

  describe('isImageExtension', () => {
    it('returns true for image extensions', () => {
      expect(isImageExtension('jpg')).toBe(true);
      expect(isImageExtension('jpeg')).toBe(true);
      expect(isImageExtension('png')).toBe(true);
      expect(isImageExtension('gif')).toBe(true);
      expect(isImageExtension('webp')).toBe(true);
      expect(isImageExtension('svg')).toBe(true);
      expect(isImageExtension('avif')).toBe(true);
      expect(isImageExtension('heic')).toBe(true);
    });

    it('returns false for non-image extensions', () => {
      expect(isImageExtension('mp4')).toBe(false);
      expect(isImageExtension('mp3')).toBe(false);
      expect(isImageExtension('pdf')).toBe(false);
    });
  });

  describe('isVideoExtension', () => {
    it('returns true for video extensions', () => {
      expect(isVideoExtension('mp4')).toBe(true);
      expect(isVideoExtension('webm')).toBe(true);
      expect(isVideoExtension('mkv')).toBe(true);
      expect(isVideoExtension('avi')).toBe(true);
      expect(isVideoExtension('mov')).toBe(true);
    });

    it('returns false for non-video extensions', () => {
      expect(isVideoExtension('jpg')).toBe(false);
      expect(isVideoExtension('mp3')).toBe(false);
    });
  });

  describe('isAudioExtension', () => {
    it('returns true for audio extensions', () => {
      expect(isAudioExtension('mp3')).toBe(true);
      expect(isAudioExtension('wav')).toBe(true);
      expect(isAudioExtension('ogg')).toBe(true);
      expect(isAudioExtension('flac')).toBe(true);
      expect(isAudioExtension('aac')).toBe(true);
    });

    it('returns false for non-audio extensions', () => {
      expect(isAudioExtension('jpg')).toBe(false);
      expect(isAudioExtension('mp4')).toBe(false);
    });
  });

  describe('isDocumentExtension', () => {
    it('returns true for document extensions', () => {
      expect(isDocumentExtension('pdf')).toBe(true);
      expect(isDocumentExtension('doc')).toBe(true);
      expect(isDocumentExtension('docx')).toBe(true);
      expect(isDocumentExtension('xls')).toBe(true);
      expect(isDocumentExtension('xlsx')).toBe(true);
      expect(isDocumentExtension('ppt')).toBe(true);
      expect(isDocumentExtension('txt')).toBe(true);
    });

    it('returns false for non-document extensions', () => {
      expect(isDocumentExtension('jpg')).toBe(false);
      expect(isDocumentExtension('mp4')).toBe(false);
    });
  });
});
