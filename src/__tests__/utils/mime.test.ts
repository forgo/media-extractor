import { describe, it, expect } from 'vitest';
import {
  getMimeFromExtension,
  getExtensionFromMime,
  getMediaTypeFromMime,
  getMediaTypeFromExtension,
  isImageMime,
  isVideoMime,
  isAudioMime,
  isDocumentMime,
  isSupportedMime,
  getMimeFromDataUrl,
  getMediaTypeFromDataUrl,
  detectMimeFromBytes,
  detectMediaTypeFromBytes,
  getSupportedImageExtensions,
  getSupportedVideoExtensions,
  getSupportedAudioExtensions,
  getSupportedDocumentExtensions,
  getSupportedExtensions,
} from '../../utils/mime';

describe('MIME Utilities', () => {
  describe('getMimeFromExtension', () => {
    it('returns MIME type for image extensions', () => {
      expect(getMimeFromExtension('jpg')).toBe('image/jpeg');
      expect(getMimeFromExtension('jpeg')).toBe('image/jpeg');
      expect(getMimeFromExtension('png')).toBe('image/png');
      expect(getMimeFromExtension('gif')).toBe('image/gif');
      expect(getMimeFromExtension('webp')).toBe('image/webp');
      expect(getMimeFromExtension('svg')).toBe('image/svg+xml');
    });

    it('returns MIME type for video extensions', () => {
      expect(getMimeFromExtension('mp4')).toBe('video/mp4');
      expect(getMimeFromExtension('webm')).toBe('video/webm');
      expect(getMimeFromExtension('mkv')).toBe('video/x-matroska');
      expect(getMimeFromExtension('avi')).toBe('video/x-msvideo');
    });

    it('returns MIME type for audio extensions', () => {
      expect(getMimeFromExtension('mp3')).toBe('audio/mpeg');
      expect(getMimeFromExtension('wav')).toBe('audio/wav');
      expect(getMimeFromExtension('ogg')).toBe('audio/ogg');
      expect(getMimeFromExtension('flac')).toBe('audio/flac');
    });

    it('returns MIME type for document extensions', () => {
      expect(getMimeFromExtension('pdf')).toBe('application/pdf');
      expect(getMimeFromExtension('doc')).toBe('application/msword');
      expect(getMimeFromExtension('docx')).toBe(
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    });

    it('handles leading dot', () => {
      expect(getMimeFromExtension('.jpg')).toBe('image/jpeg');
    });

    it('is case insensitive', () => {
      expect(getMimeFromExtension('JPG')).toBe('image/jpeg');
      expect(getMimeFromExtension('PNG')).toBe('image/png');
    });

    it('returns null for unknown extensions', () => {
      expect(getMimeFromExtension('xyz')).toBeNull();
      expect(getMimeFromExtension('')).toBeNull();
    });
  });

  describe('getExtensionFromMime', () => {
    it('returns extension for image MIME types', () => {
      expect(getExtensionFromMime('image/jpeg')).toBe('jpg');
      expect(getExtensionFromMime('image/png')).toBe('png');
      expect(getExtensionFromMime('image/gif')).toBe('gif');
    });

    it('returns extension for video MIME types', () => {
      expect(getExtensionFromMime('video/mp4')).toBe('mp4');
      expect(getExtensionFromMime('video/webm')).toBe('webm');
    });

    it('returns extension for audio MIME types', () => {
      expect(getExtensionFromMime('audio/mpeg')).toBe('mp3');
      expect(getExtensionFromMime('audio/wav')).toBe('wav');
      expect(getExtensionFromMime('audio/wave')).toBe('wav');
      expect(getExtensionFromMime('audio/x-wav')).toBe('wav');
    });

    it('returns extension for document MIME types', () => {
      expect(getExtensionFromMime('application/pdf')).toBe('pdf');
    });

    it('handles whitespace', () => {
      expect(getExtensionFromMime('  image/jpeg  ')).toBe('jpg');
    });

    it('returns null for unknown MIME types', () => {
      expect(getExtensionFromMime('application/unknown')).toBeNull();
      expect(getExtensionFromMime('')).toBeNull();
    });
  });

  describe('getMediaTypeFromMime', () => {
    it('returns "image" for image MIME types', () => {
      expect(getMediaTypeFromMime('image/jpeg')).toBe('image');
      expect(getMediaTypeFromMime('image/png')).toBe('image');
      expect(getMediaTypeFromMime('image/svg+xml')).toBe('image');
    });

    it('returns "video" for video MIME types', () => {
      expect(getMediaTypeFromMime('video/mp4')).toBe('video');
      expect(getMediaTypeFromMime('video/webm')).toBe('video');
    });

    it('returns "audio" for audio MIME types', () => {
      expect(getMediaTypeFromMime('audio/mpeg')).toBe('audio');
      expect(getMediaTypeFromMime('audio/wav')).toBe('audio');
    });

    it('returns "document" for document MIME types', () => {
      expect(getMediaTypeFromMime('application/pdf')).toBe('document');
      expect(getMediaTypeFromMime('application/msword')).toBe('document');
      expect(
        getMediaTypeFromMime(
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
      ).toBe('document');
      expect(getMediaTypeFromMime('application/vnd.ms-excel')).toBe('document');
      expect(getMediaTypeFromMime('application/vnd.ms-powerpoint')).toBe('document');
      expect(
        getMediaTypeFromMime('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      ).toBe('document');
      expect(
        getMediaTypeFromMime(
          'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        )
      ).toBe('document');
    });

    it('returns "unknown" for unknown MIME types', () => {
      expect(getMediaTypeFromMime('application/octet-stream')).toBe('unknown');
      expect(getMediaTypeFromMime('')).toBe('unknown');
    });
  });

  describe('getMediaTypeFromExtension', () => {
    it('returns correct media type for extensions', () => {
      expect(getMediaTypeFromExtension('jpg')).toBe('image');
      expect(getMediaTypeFromExtension('mp4')).toBe('video');
      expect(getMediaTypeFromExtension('mp3')).toBe('audio');
      expect(getMediaTypeFromExtension('pdf')).toBe('document');
    });

    it('uses fallback detection for unknown extensions with known types', () => {
      expect(getMediaTypeFromExtension('m4v')).toBe('video');
    });

    it('returns "unknown" for unknown extensions', () => {
      expect(getMediaTypeFromExtension('xyz')).toBe('unknown');
    });
  });

  describe('isImageMime', () => {
    it('returns true for image MIME types', () => {
      expect(isImageMime('image/jpeg')).toBe(true);
      expect(isImageMime('image/png')).toBe(true);
      expect(isImageMime('image/gif')).toBe(true);
    });

    it('returns false for non-image MIME types', () => {
      expect(isImageMime('video/mp4')).toBe(false);
      expect(isImageMime('audio/mpeg')).toBe(false);
      expect(isImageMime('')).toBe(false);
    });
  });

  describe('isVideoMime', () => {
    it('returns true for video MIME types', () => {
      expect(isVideoMime('video/mp4')).toBe(true);
      expect(isVideoMime('video/webm')).toBe(true);
    });

    it('returns false for non-video MIME types', () => {
      expect(isVideoMime('image/jpeg')).toBe(false);
      expect(isVideoMime('')).toBe(false);
    });
  });

  describe('isAudioMime', () => {
    it('returns true for audio MIME types', () => {
      expect(isAudioMime('audio/mpeg')).toBe(true);
      expect(isAudioMime('audio/wav')).toBe(true);
    });

    it('returns false for non-audio MIME types', () => {
      expect(isAudioMime('video/mp4')).toBe(false);
      expect(isAudioMime('')).toBe(false);
    });
  });

  describe('isDocumentMime', () => {
    it('returns true for document MIME types', () => {
      expect(isDocumentMime('application/pdf')).toBe(true);
      expect(isDocumentMime('application/msword')).toBe(true);
      expect(
        isDocumentMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
      ).toBe(true);
    });

    it('returns false for non-document MIME types', () => {
      expect(isDocumentMime('image/jpeg')).toBe(false);
      expect(isDocumentMime('')).toBe(false);
    });
  });

  describe('isSupportedMime', () => {
    it('returns true for supported MIME types', () => {
      expect(isSupportedMime('image/jpeg')).toBe(true);
      expect(isSupportedMime('video/mp4')).toBe(true);
      expect(isSupportedMime('audio/mpeg')).toBe(true);
      expect(isSupportedMime('application/pdf')).toBe(true);
    });

    it('returns false for unsupported MIME types', () => {
      expect(isSupportedMime('application/json')).toBe(false);
      expect(isSupportedMime('text/html')).toBe(false);
    });
  });

  describe('getMimeFromDataUrl', () => {
    it('extracts MIME type from data URL', () => {
      expect(getMimeFromDataUrl('data:image/png;base64,abc')).toBe('image/png');
      expect(getMimeFromDataUrl('data:image/jpeg;base64,abc')).toBe('image/jpeg');
      expect(getMimeFromDataUrl('data:video/mp4;base64,abc')).toBe('video/mp4');
    });

    it('returns null for non-data URLs', () => {
      expect(getMimeFromDataUrl('https://example.com/file.jpg')).toBeNull();
    });

    it('returns null for malformed data URLs', () => {
      expect(getMimeFromDataUrl('data:')).toBeNull();
      expect(getMimeFromDataUrl('')).toBeNull();
      expect(getMimeFromDataUrl(null as unknown as string)).toBeNull();
    });
  });

  describe('getMediaTypeFromDataUrl', () => {
    it('returns correct media type from data URL', () => {
      expect(getMediaTypeFromDataUrl('data:image/png;base64,abc')).toBe('image');
      expect(getMediaTypeFromDataUrl('data:video/mp4;base64,abc')).toBe('video');
      expect(getMediaTypeFromDataUrl('data:audio/mpeg;base64,abc')).toBe('audio');
    });

    it('returns "unknown" for invalid data URLs', () => {
      expect(getMediaTypeFromDataUrl('invalid')).toBe('unknown');
    });
  });

  describe('detectMimeFromBytes', () => {
    it('detects JPEG from magic bytes', () => {
      const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(detectMimeFromBytes(bytes)).toBe('image/jpeg');
    });

    it('detects PNG from magic bytes', () => {
      const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      expect(detectMimeFromBytes(bytes)).toBe('image/png');
    });

    it('detects GIF87a from magic bytes', () => {
      const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('image/gif');
    });

    it('detects GIF89a from magic bytes', () => {
      const bytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('image/gif');
    });

    it('detects WebP from magic bytes', () => {
      // RIFF....WEBP
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
      ]);
      expect(detectMimeFromBytes(bytes)).toBe('image/webp');
    });

    it('rejects RIFF without WEBP signature', () => {
      // RIFF....AVI_
      const bytes = new Uint8Array([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x41, 0x56, 0x49, 0x20,
      ]);
      expect(detectMimeFromBytes(bytes)).toBeNull();
    });

    it('detects BMP from magic bytes', () => {
      const bytes = new Uint8Array([0x42, 0x4d, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('image/bmp');
    });

    it('detects ICO from magic bytes', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('image/x-icon');
    });

    it('detects CUR from magic bytes', () => {
      const bytes = new Uint8Array([0x00, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('image/x-icon');
    });

    it('detects WebM/MKV from magic bytes', () => {
      const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('video/webm');
    });

    it('detects MP3 with ID3 tag', () => {
      const bytes = new Uint8Array([0x49, 0x44, 0x33, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('audio/mpeg');
    });

    it('detects MP3 frame sync (0xfffb)', () => {
      const bytes = new Uint8Array([0xff, 0xfb, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('audio/mpeg');
    });

    it('detects MP3 frame sync (0xfffa)', () => {
      const bytes = new Uint8Array([0xff, 0xfa, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('audio/mpeg');
    });

    it('detects OGG from magic bytes', () => {
      const bytes = new Uint8Array([0x4f, 0x67, 0x67, 0x53, 0x00, 0x00, 0x00, 0x00]);
      expect(detectMimeFromBytes(bytes)).toBe('audio/ogg');
    });

    it('detects PDF from magic bytes', () => {
      const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(detectMimeFromBytes(bytes)).toBe('application/pdf');
    });

    it('returns null for unknown bytes', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      expect(detectMimeFromBytes(bytes)).toBeNull();
    });

    it('returns null for small arrays', () => {
      const bytes = new Uint8Array([0xff, 0xd8]);
      expect(detectMimeFromBytes(bytes)).toBeNull();
    });

    it('returns null for null/undefined', () => {
      expect(detectMimeFromBytes(null as unknown as Uint8Array)).toBeNull();
      expect(detectMimeFromBytes(undefined as unknown as Uint8Array)).toBeNull();
    });
  });

  describe('detectMediaTypeFromBytes', () => {
    it('returns correct media type from bytes', () => {
      const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
      expect(detectMediaTypeFromBytes(jpegBytes)).toBe('image');

      const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
      expect(detectMediaTypeFromBytes(pdfBytes)).toBe('document');
    });

    it('returns "unknown" for unrecognized bytes', () => {
      const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
      expect(detectMediaTypeFromBytes(bytes)).toBe('unknown');
    });
  });

  describe('getSupportedImageExtensions', () => {
    it('returns array of image extensions', () => {
      const exts = getSupportedImageExtensions();
      expect(exts).toContain('jpg');
      expect(exts).toContain('png');
      expect(exts).toContain('gif');
      expect(exts).toContain('webp');
      expect(Array.isArray(exts)).toBe(true);
    });
  });

  describe('getSupportedVideoExtensions', () => {
    it('returns array of video extensions', () => {
      const exts = getSupportedVideoExtensions();
      expect(exts).toContain('mp4');
      expect(exts).toContain('webm');
      expect(exts).toContain('mkv');
      expect(Array.isArray(exts)).toBe(true);
    });
  });

  describe('getSupportedAudioExtensions', () => {
    it('returns array of audio extensions', () => {
      const exts = getSupportedAudioExtensions();
      expect(exts).toContain('mp3');
      expect(exts).toContain('wav');
      expect(exts).toContain('ogg');
      expect(Array.isArray(exts)).toBe(true);
    });
  });

  describe('getSupportedDocumentExtensions', () => {
    it('returns array of document extensions', () => {
      const exts = getSupportedDocumentExtensions();
      expect(exts).toContain('pdf');
      expect(exts).toContain('doc');
      expect(exts).toContain('docx');
      expect(Array.isArray(exts)).toBe(true);
    });
  });

  describe('getSupportedExtensions', () => {
    it('returns correct extensions for each media type', () => {
      expect(getSupportedExtensions('image')).toContain('jpg');
      expect(getSupportedExtensions('video')).toContain('mp4');
      expect(getSupportedExtensions('audio')).toContain('mp3');
      expect(getSupportedExtensions('document')).toContain('pdf');
    });

    it('returns empty array for unknown media type', () => {
      expect(getSupportedExtensions('unknown')).toEqual([]);
    });
  });
});
