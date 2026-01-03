/**
 * Media type detector tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectMediaType,
  getMediaType,
} from '../detectors';

describe('Media type detectors', () => {
  describe('detectMediaType', () => {
    describe('image detection', () => {
      it('should detect common image extensions', () => {
        expect(detectMediaType('https://example.com/photo.jpg').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.jpeg').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.png').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.gif').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.webp').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.avif').type).toBe('image');
        expect(detectMediaType('https://example.com/photo.svg').type).toBe('image');
      });

      it('should detect image with query params', () => {
        const result = detectMediaType('https://example.com/photo.jpg?size=large&v=1');
        expect(result.type).toBe('image');
      });

      it('should detect case-insensitive extensions', () => {
        expect(detectMediaType('https://example.com/PHOTO.JPG').type).toBe('image');
        expect(detectMediaType('https://example.com/Photo.PNG').type).toBe('image');
      });
    });

    describe('video detection', () => {
      it('should detect common video extensions', () => {
        expect(detectMediaType('https://example.com/video.mp4').type).toBe('video');
        expect(detectMediaType('https://example.com/video.webm').type).toBe('video');
        expect(detectMediaType('https://example.com/video.mov').type).toBe('video');
        expect(detectMediaType('https://example.com/video.avi').type).toBe('video');
        expect(detectMediaType('https://example.com/video.mkv').type).toBe('video');
      });
    });

    describe('audio detection', () => {
      it('should detect common audio extensions', () => {
        expect(detectMediaType('https://example.com/audio.mp3').type).toBe('audio');
        expect(detectMediaType('https://example.com/audio.wav').type).toBe('audio');
        expect(detectMediaType('https://example.com/audio.ogg').type).toBe('audio');
        expect(detectMediaType('https://example.com/audio.flac').type).toBe('audio');
        expect(detectMediaType('https://example.com/audio.m4a').type).toBe('audio');
      });
    });

    describe('document detection', () => {
      it('should detect common document extensions', () => {
        expect(detectMediaType('https://example.com/doc.pdf').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.doc').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.docx').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.xls').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.xlsx').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.ppt').type).toBe('document');
        expect(detectMediaType('https://example.com/doc.pptx').type).toBe('document');
      });
    });

    describe('confidence scores', () => {
      it('should have high confidence for clear extensions', () => {
        const result = detectMediaType('https://example.com/photo.jpg');
        expect(result.confidence).toBeGreaterThanOrEqual(0.5);
      });
    });

    describe('data URLs', () => {
      it('should detect image data URLs', () => {
        const result = detectMediaType('data:image/png;base64,abc');
        expect(result.type).toBe('image');
      });

      it('should detect video data URLs', () => {
        const result = detectMediaType('data:video/mp4;base64,abc');
        expect(result.type).toBe('video');
      });
    });
  });

  describe('getMediaType', () => {
    it('should return type with threshold filtering', () => {
      expect(getMediaType('https://example.com/photo.jpg', 0.5)).toBe('image');
    });

    it('should return unknown when confidence is below threshold', () => {
      expect(getMediaType('https://example.com/file', 0.9)).toBe('unknown');
    });
  });
});
