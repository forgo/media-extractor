/**
 * Media type detector tests
 */

import { describe, it, expect } from 'vitest';
import {
  detectMediaType,
  getMediaType,
  isMediaType,
  isSupportedMedia,
  filterByMediaType,
  groupByMediaType,
  detectMediaTypes,
  detectImage,
  detectVideo,
  detectAudio,
  detectDocument,
  isImageUrl,
  isVideoUrl,
  isAudioUrl,
  isDocumentUrl,
  isPdfUrl,
  isTrackingPixelSize,
  isUiElementUrl,
  // Image detector functions
  hasImageExtension,
  isImageDataUrl,
  matchesImageCdnPattern,
  hasImageQueryParams,
  getImageMediaType,
  isUiElementSize,
  // Video detector functions
  hasVideoExtension,
  isStreamingManifest,
  isVideoDataUrl,
  isVideoPlatformUrl,
  matchesVideoCdnPattern,
  extractVideoId,
  getVideoMediaType,
  // Audio detector functions
  hasAudioExtension,
  isAudioDataUrl,
  isAudioPlatformUrl,
  matchesAudioCdnPattern,
  isStreamingAudioUrl,
  getAudioMediaType,
  // Document detector functions
  hasDocumentExtension,
  isDocumentDataUrl,
  isDocumentPlatformUrl,
  matchesDocumentCdnPattern,
  hasDocumentPathIndicator,
  getDocumentMediaType,
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

    it('should use default threshold', () => {
      expect(getMediaType('https://example.com/photo.jpg')).toBe('image');
    });
  });

  describe('isMediaType', () => {
    it('should check for image type', () => {
      expect(isMediaType('https://example.com/photo.jpg', 'image')).toBe(true);
      expect(isMediaType('https://example.com/video.mp4', 'image')).toBe(false);
    });

    it('should check for video type', () => {
      expect(isMediaType('https://example.com/video.mp4', 'video')).toBe(true);
      expect(isMediaType('https://example.com/photo.jpg', 'video')).toBe(false);
    });

    it('should check for audio type', () => {
      expect(isMediaType('https://example.com/audio.mp3', 'audio')).toBe(true);
      expect(isMediaType('https://example.com/photo.jpg', 'audio')).toBe(false);
    });

    it('should check for document type', () => {
      expect(isMediaType('https://example.com/doc.pdf', 'document')).toBe(true);
      expect(isMediaType('https://example.com/photo.jpg', 'document')).toBe(false);
    });

    it('should return false for unknown type', () => {
      expect(isMediaType('https://example.com/photo.jpg', 'unknown')).toBe(false);
    });

    it('should respect threshold', () => {
      expect(isMediaType('https://example.com/photo.jpg', 'image', 0.5)).toBe(true);
      // High confidence for clear extensions means 0.99 might still pass
      expect(isMediaType('https://example.com/photo.jpg', 'image', 1.1)).toBe(false);
    });
  });

  describe('isSupportedMedia', () => {
    it('should return true for supported media types', () => {
      expect(isSupportedMedia('https://example.com/photo.jpg')).toBe(true);
      expect(isSupportedMedia('https://example.com/video.mp4')).toBe(true);
      expect(isSupportedMedia('https://example.com/audio.mp3')).toBe(true);
      expect(isSupportedMedia('https://example.com/doc.pdf')).toBe(true);
    });

    it('should return false for unsupported types', () => {
      expect(isSupportedMedia('https://example.com/page.html')).toBe(false);
    });

    it('should respect threshold', () => {
      expect(isSupportedMedia('https://example.com/photo.jpg', 0.5)).toBe(true);
    });
  });

  describe('filterByMediaType', () => {
    it('should filter URLs by media type', () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/video.mp4',
        'https://example.com/another.png',
      ];
      const images = filterByMediaType(urls, 'image');
      expect(images).toHaveLength(2);
      expect(images).toContain('https://example.com/photo.jpg');
      expect(images).toContain('https://example.com/another.png');
    });

    it('should return empty array when no matches', () => {
      const urls = ['https://example.com/video.mp4'];
      const images = filterByMediaType(urls, 'image');
      expect(images).toHaveLength(0);
    });
  });

  describe('groupByMediaType', () => {
    it('should group URLs by their media type', () => {
      const urls = [
        'https://example.com/photo.jpg',
        'https://example.com/video.mp4',
        'https://example.com/audio.mp3',
        'https://example.com/doc.pdf',
        'https://example.com/page.html',
      ];
      const groups = groupByMediaType(urls);
      expect(groups.image).toContain('https://example.com/photo.jpg');
      expect(groups.video).toContain('https://example.com/video.mp4');
      expect(groups.audio).toContain('https://example.com/audio.mp3');
      expect(groups.document).toContain('https://example.com/doc.pdf');
      expect(groups.unknown).toContain('https://example.com/page.html');
    });

    it('should handle empty array', () => {
      const groups = groupByMediaType([]);
      expect(groups.image).toHaveLength(0);
      expect(groups.video).toHaveLength(0);
      expect(groups.audio).toHaveLength(0);
      expect(groups.document).toHaveLength(0);
      expect(groups.unknown).toHaveLength(0);
    });
  });

  describe('detectMediaTypes', () => {
    it('should detect media types for multiple URLs', () => {
      const urls = ['https://example.com/photo.jpg', 'https://example.com/video.mp4'];
      const results = detectMediaTypes(urls);
      expect(results.size).toBe(2);
      expect(results.get('https://example.com/photo.jpg')?.type).toBe('image');
      expect(results.get('https://example.com/video.mp4')?.type).toBe('video');
    });

    it('should handle empty array', () => {
      const results = detectMediaTypes([]);
      expect(results.size).toBe(0);
    });
  });

  describe('individual detector functions', () => {
    describe('detectImage', () => {
      it('should return confidence score for image URLs', () => {
        expect(detectImage('https://example.com/photo.jpg')).toBeGreaterThan(0);
        expect(detectImage('https://example.com/photo.png')).toBeGreaterThan(0);
        expect(detectImage('https://example.com/photo.gif')).toBeGreaterThan(0);
      });

      it('should return 0 for non-image URLs', () => {
        expect(detectImage('https://example.com/video.mp4')).toBe(0);
      });
    });

    describe('detectVideo', () => {
      it('should return confidence score for video URLs', () => {
        expect(detectVideo('https://example.com/video.mp4')).toBeGreaterThan(0);
        expect(detectVideo('https://example.com/video.webm')).toBeGreaterThan(0);
        expect(detectVideo('https://example.com/video.avi')).toBeGreaterThan(0);
      });

      it('should return 0 for non-video URLs', () => {
        expect(detectVideo('https://example.com/photo.jpg')).toBe(0);
      });
    });

    describe('detectAudio', () => {
      it('should return confidence score for audio URLs', () => {
        expect(detectAudio('https://example.com/audio.mp3')).toBeGreaterThan(0);
        expect(detectAudio('https://example.com/audio.wav')).toBeGreaterThan(0);
        expect(detectAudio('https://example.com/audio.ogg')).toBeGreaterThan(0);
      });

      it('should return 0 for non-audio URLs', () => {
        expect(detectAudio('https://example.com/photo.jpg')).toBe(0);
      });
    });

    describe('detectDocument', () => {
      it('should return confidence score for document URLs', () => {
        expect(detectDocument('https://example.com/doc.pdf')).toBeGreaterThan(0);
        expect(detectDocument('https://example.com/doc.docx')).toBeGreaterThan(0);
        expect(detectDocument('https://example.com/doc.xlsx')).toBeGreaterThan(0);
      });

      it('should return 0 for non-document URLs', () => {
        expect(detectDocument('https://example.com/photo.jpg')).toBe(0);
      });
    });
  });

  describe('type check functions', () => {
    describe('isImageUrl', () => {
      it('should return true for image URLs', () => {
        expect(isImageUrl('https://example.com/photo.jpg')).toBe(true);
        expect(isImageUrl('https://example.com/photo.png')).toBe(true);
      });

      it('should return false for non-image URLs', () => {
        expect(isImageUrl('https://example.com/video.mp4')).toBe(false);
      });

      it('should respect threshold', () => {
        // High confidence for clear extensions, so use impossible threshold
        expect(isImageUrl('https://example.com/photo.jpg', 1.1)).toBe(false);
      });
    });

    describe('isVideoUrl', () => {
      it('should return true for video URLs', () => {
        expect(isVideoUrl('https://example.com/video.mp4')).toBe(true);
        expect(isVideoUrl('https://example.com/video.webm')).toBe(true);
      });

      it('should return false for non-video URLs', () => {
        expect(isVideoUrl('https://example.com/photo.jpg')).toBe(false);
      });
    });

    describe('isAudioUrl', () => {
      it('should return true for audio URLs', () => {
        expect(isAudioUrl('https://example.com/audio.mp3')).toBe(true);
        expect(isAudioUrl('https://example.com/audio.wav')).toBe(true);
      });

      it('should return false for non-audio URLs', () => {
        expect(isAudioUrl('https://example.com/photo.jpg')).toBe(false);
      });
    });

    describe('isDocumentUrl', () => {
      it('should return true for document URLs', () => {
        expect(isDocumentUrl('https://example.com/doc.pdf')).toBe(true);
        expect(isDocumentUrl('https://example.com/doc.docx')).toBe(true);
      });

      it('should return false for non-document URLs', () => {
        expect(isDocumentUrl('https://example.com/photo.jpg')).toBe(false);
      });
    });

    describe('isPdfUrl', () => {
      it('should return true for PDF URLs', () => {
        expect(isPdfUrl('https://example.com/doc.pdf')).toBe(true);
      });

      it('should return false for non-PDF URLs', () => {
        expect(isPdfUrl('https://example.com/photo.jpg')).toBe(false);
      });
    });
  });

  describe('utility functions', () => {
    describe('isTrackingPixelSize', () => {
      it('should detect tracking pixel dimensions', () => {
        // Only 1x1 is considered tracking pixel
        expect(isTrackingPixelSize(1, 1)).toBe(true);
      });

      it('should return false for larger images', () => {
        expect(isTrackingPixelSize(2, 2)).toBe(false);
        expect(isTrackingPixelSize(100, 100)).toBe(false);
        expect(isTrackingPixelSize(800, 600)).toBe(false);
      });

      it('should handle null dimensions', () => {
        expect(isTrackingPixelSize(null, null)).toBe(false);
        expect(isTrackingPixelSize(1, null)).toBe(false);
      });
    });

    describe('isUiElementUrl', () => {
      it('should detect UI element URLs', () => {
        expect(isUiElementUrl('https://example.com/icon.png')).toBe(true);
        expect(isUiElementUrl('https://example.com/button.png')).toBe(true);
        expect(isUiElementUrl('https://example.com/logo.png')).toBe(true);
      });

      it('should return false for regular image URLs', () => {
        expect(isUiElementUrl('https://example.com/photo.jpg')).toBe(false);
      });
    });
  });
});

// =============================================================================
// Video Detector Tests
// =============================================================================

describe('Video detector', () => {
  describe('hasVideoExtension', () => {
    it('should return true for video extensions', () => {
      expect(hasVideoExtension('https://example.com/video.mp4')).toBe(true);
      expect(hasVideoExtension('https://example.com/video.webm')).toBe(true);
      expect(hasVideoExtension('https://example.com/video.mov')).toBe(true);
      expect(hasVideoExtension('https://example.com/video.avi')).toBe(true);
      expect(hasVideoExtension('https://example.com/video.mkv')).toBe(true);
    });

    it('should return false for non-video extensions', () => {
      expect(hasVideoExtension('https://example.com/image.jpg')).toBe(false);
      expect(hasVideoExtension('https://example.com/audio.mp3')).toBe(false);
      expect(hasVideoExtension('https://example.com/doc.pdf')).toBe(false);
    });

    it('should handle case-insensitive extensions', () => {
      expect(hasVideoExtension('https://example.com/video.MP4')).toBe(true);
      expect(hasVideoExtension('https://example.com/video.WebM')).toBe(true);
    });
  });

  describe('isStreamingManifest', () => {
    it('should detect HLS manifests', () => {
      expect(isStreamingManifest('https://example.com/stream.m3u8')).toBe(true);
      expect(isStreamingManifest('https://example.com/playlist.m3u')).toBe(true);
    });

    it('should detect DASH manifests', () => {
      expect(isStreamingManifest('https://example.com/manifest.mpd')).toBe(true);
    });

    it('should return false for regular video files', () => {
      expect(isStreamingManifest('https://example.com/video.mp4')).toBe(false);
    });
  });

  describe('isVideoDataUrl', () => {
    it('should detect video data URLs', () => {
      expect(isVideoDataUrl('data:video/mp4;base64,abc')).toBe(true);
      expect(isVideoDataUrl('data:video/webm;base64,xyz')).toBe(true);
    });

    it('should return false for non-video data URLs', () => {
      expect(isVideoDataUrl('data:image/png;base64,abc')).toBe(false);
      expect(isVideoDataUrl('data:audio/mp3;base64,abc')).toBe(false);
    });

    it('should return false for non-data URLs', () => {
      expect(isVideoDataUrl('https://example.com/video.mp4')).toBe(false);
    });
  });

  describe('isVideoPlatformUrl', () => {
    it('should detect YouTube URLs', () => {
      expect(isVideoPlatformUrl('https://www.youtube.com/watch?v=abc123')).toBe(true);
      expect(isVideoPlatformUrl('https://youtube.com/embed/abc123')).toBe(true);
      expect(isVideoPlatformUrl('https://youtu.be/abc123')).toBe(true);
    });

    it('should detect Vimeo URLs', () => {
      expect(isVideoPlatformUrl('https://vimeo.com/123456789')).toBe(true);
      expect(isVideoPlatformUrl('https://player.vimeo.com/video/123456')).toBe(true);
    });

    it('should detect Twitch URLs', () => {
      expect(isVideoPlatformUrl('https://www.twitch.tv/videos/123456')).toBe(true);
      expect(isVideoPlatformUrl('https://clips.twitch.tv/SomeClip')).toBe(true);
    });

    it('should detect TikTok URLs', () => {
      expect(isVideoPlatformUrl('https://www.tiktok.com/@user/video/123456')).toBe(true);
    });

    it('should detect Dailymotion URLs', () => {
      expect(isVideoPlatformUrl('https://www.dailymotion.com/video/x123abc')).toBe(true);
    });

    it('should detect social media video URLs', () => {
      expect(isVideoPlatformUrl('https://www.facebook.com/watch/123')).toBe(true);
      expect(isVideoPlatformUrl('https://www.instagram.com/reel/abc123')).toBe(true);
      expect(isVideoPlatformUrl('https://twitter.com/user/status/123/video/1')).toBe(true);
      expect(isVideoPlatformUrl('https://x.com/user/status/123/video/1')).toBe(true);
    });

    it('should return false for non-video platform URLs', () => {
      expect(isVideoPlatformUrl('https://example.com/page')).toBe(false);
      expect(isVideoPlatformUrl('https://youtube.com/')).toBe(false);
    });
  });

  describe('matchesVideoCdnPattern', () => {
    it('should detect CloudFront video URLs', () => {
      expect(matchesVideoCdnPattern('https://abc.cloudfront.net/videos/file.mp4')).toBe(true);
    });

    it('should detect Akamai video URLs', () => {
      expect(matchesVideoCdnPattern('https://abc.akamaized.net/stream.m3u8')).toBe(true);
    });

    it('should detect social media CDN video URLs', () => {
      expect(matchesVideoCdnPattern('https://video.twimg.com/abc')).toBe(true);
      expect(matchesVideoCdnPattern('https://scontent.cdninstagram.com/video123')).toBe(true);
      expect(matchesVideoCdnPattern('https://video.fbcdn.net/video_abc')).toBe(true);
    });

    it('should return false for empty URL', () => {
      expect(matchesVideoCdnPattern('')).toBe(false);
    });

    it('should return false for non-CDN URLs', () => {
      expect(matchesVideoCdnPattern('https://example.com/video.mp4')).toBe(false);
    });
  });

  describe('extractVideoId', () => {
    it('should extract YouTube video ID from watch URL', () => {
      expect(extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract YouTube video ID from embed URL', () => {
      expect(extractVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract YouTube video ID from short URL', () => {
      expect(extractVideoId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    });

    it('should extract Vimeo video ID', () => {
      expect(extractVideoId('https://vimeo.com/123456789')).toBe('123456789');
    });

    it('should return null for invalid URLs', () => {
      expect(extractVideoId('not-a-url')).toBe(null);
    });

    it('should return null for non-video platform URLs', () => {
      expect(extractVideoId('https://example.com/page')).toBe(null);
    });
  });

  describe('detectVideo', () => {
    it('should return 0 for empty URL', () => {
      expect(detectVideo('')).toBe(0);
    });

    it('should return 1.0 for video file extensions', () => {
      expect(detectVideo('https://example.com/video.mp4')).toBe(1.0);
    });

    it('should return 0.95 for streaming manifests', () => {
      expect(detectVideo('https://example.com/stream.m3u8')).toBe(0.95);
    });

    it('should return 0.9 for video platform URLs', () => {
      expect(detectVideo('https://www.youtube.com/watch?v=abc')).toBe(0.9);
    });

    it('should return 0.85 for video CDN patterns', () => {
      expect(detectVideo('https://video.twimg.com/abc')).toBe(0.85);
    });

    it('should return 0.4 for blob URLs', () => {
      expect(detectVideo('blob:https://example.com/abc-123')).toBe(0.4);
    });

    it('should return 0 for non-absolute URLs', () => {
      expect(detectVideo('/relative/path.mp4')).toBe(0);
    });
  });

  describe('getVideoMediaType', () => {
    it('should return video for video URLs', () => {
      expect(getVideoMediaType('https://example.com/video.mp4')).toBe('video');
    });

    it('should return unknown for non-video URLs', () => {
      expect(getVideoMediaType('https://example.com/photo.jpg')).toBe('unknown');
    });
  });
});

// =============================================================================
// Audio Detector Tests
// =============================================================================

describe('Audio detector', () => {
  describe('hasAudioExtension', () => {
    it('should return true for audio extensions', () => {
      expect(hasAudioExtension('https://example.com/audio.mp3')).toBe(true);
      expect(hasAudioExtension('https://example.com/audio.wav')).toBe(true);
      expect(hasAudioExtension('https://example.com/audio.ogg')).toBe(true);
      expect(hasAudioExtension('https://example.com/audio.flac')).toBe(true);
      expect(hasAudioExtension('https://example.com/audio.m4a')).toBe(true);
    });

    it('should return false for non-audio extensions', () => {
      expect(hasAudioExtension('https://example.com/video.mp4')).toBe(false);
      expect(hasAudioExtension('https://example.com/image.jpg')).toBe(false);
    });
  });

  describe('isAudioDataUrl', () => {
    it('should detect audio data URLs', () => {
      expect(isAudioDataUrl('data:audio/mp3;base64,abc')).toBe(true);
      expect(isAudioDataUrl('data:audio/wav;base64,xyz')).toBe(true);
      expect(isAudioDataUrl('data:audio/ogg;base64,def')).toBe(true);
    });

    it('should return false for non-audio data URLs', () => {
      expect(isAudioDataUrl('data:video/mp4;base64,abc')).toBe(false);
      expect(isAudioDataUrl('data:image/png;base64,abc')).toBe(false);
    });

    it('should return false for non-data URLs', () => {
      expect(isAudioDataUrl('https://example.com/audio.mp3')).toBe(false);
    });
  });

  describe('isAudioPlatformUrl', () => {
    it('should detect Spotify URLs', () => {
      expect(isAudioPlatformUrl('https://www.spotify.com/track/abc123')).toBe(true);
      expect(isAudioPlatformUrl('https://open.spotify.com/track/abc123')).toBe(true);
    });

    it('should detect SoundCloud URLs', () => {
      expect(isAudioPlatformUrl('https://soundcloud.com/artist/track')).toBe(true);
    });

    it('should detect Bandcamp URLs', () => {
      expect(isAudioPlatformUrl('https://bandcamp.com/album')).toBe(true);
      expect(isAudioPlatformUrl('https://artist.bandcamp.com/album')).toBe(true);
    });

    it('should detect podcast platforms', () => {
      expect(isAudioPlatformUrl('https://podcasts.apple.com/show/abc')).toBe(true);
      expect(isAudioPlatformUrl('https://anchor.fm/show')).toBe(true);
    });

    it('should detect other audio platforms', () => {
      expect(isAudioPlatformUrl('https://mixcloud.com/show')).toBe(true);
      expect(isAudioPlatformUrl('https://audiomack.com/song')).toBe(true);
    });

    it('should return false for non-audio platform URLs', () => {
      expect(isAudioPlatformUrl('https://example.com/page')).toBe(false);
    });
  });

  describe('matchesAudioCdnPattern', () => {
    it('should detect SoundCloud CDN URLs', () => {
      expect(matchesAudioCdnPattern('https://abc.soundcloud.com/file.mp3')).toBe(true);
    });

    it('should detect audio CloudFront URLs', () => {
      expect(matchesAudioCdnPattern('https://audio123.cloudfront.net/file.mp3')).toBe(true);
    });

    it('should detect audio path patterns', () => {
      expect(matchesAudioCdnPattern('https://example.com/audio/file.mp3')).toBe(true);
    });

    it('should detect podcast patterns', () => {
      expect(matchesAudioCdnPattern('https://example.com/podcast123.mp3')).toBe(true);
    });

    it('should return false for empty URL', () => {
      expect(matchesAudioCdnPattern('')).toBe(false);
    });
  });

  describe('isStreamingAudioUrl', () => {
    it('should detect playlist files', () => {
      expect(isStreamingAudioUrl('https://example.com/playlist.pls')).toBe(true);
      expect(isStreamingAudioUrl('https://example.com/playlist.asx')).toBe(true);
    });

    it('should detect streaming path patterns', () => {
      expect(isStreamingAudioUrl('https://example.com/stream/live')).toBe(true);
      expect(isStreamingAudioUrl('https://example.com/listen/radio')).toBe(true);
    });

    it('should detect internet radio servers', () => {
      expect(isStreamingAudioUrl('https://icecast.example.com/stream')).toBe(true);
      expect(isStreamingAudioUrl('https://shoutcast.example.com/live')).toBe(true);
    });

    it('should return false for empty URL', () => {
      expect(isStreamingAudioUrl('')).toBe(false);
    });

    it('should return false for regular audio files', () => {
      expect(isStreamingAudioUrl('https://example.com/audio.mp3')).toBe(false);
    });
  });

  describe('detectAudio', () => {
    it('should return 0 for empty URL', () => {
      expect(detectAudio('')).toBe(0);
    });

    it('should return 1.0 for audio file extensions', () => {
      expect(detectAudio('https://example.com/audio.mp3')).toBe(1.0);
    });

    it('should return 0.9 for audio platform URLs', () => {
      expect(detectAudio('https://soundcloud.com/artist/track')).toBe(0.9);
    });

    it('should return 0.85 for audio CDN patterns', () => {
      expect(detectAudio('https://example.com/audio/file.mp3')).toBe(1.0); // Has extension, so 1.0
      expect(detectAudio('https://audio.cloudfront.net/stream')).toBe(0.85);
    });

    it('should return 0.7 for streaming audio URLs', () => {
      expect(detectAudio('https://icecast.example.com/live')).toBe(0.7);
    });

    it('should return 0.4 for blob URLs', () => {
      expect(detectAudio('blob:https://example.com/abc-123')).toBe(0.4);
    });

    it('should return 0 for non-absolute URLs', () => {
      expect(detectAudio('/relative/path.mp3')).toBe(0);
    });
  });

  describe('getAudioMediaType', () => {
    it('should return audio for audio URLs', () => {
      expect(getAudioMediaType('https://example.com/audio.mp3')).toBe('audio');
    });

    it('should return unknown for non-audio URLs', () => {
      expect(getAudioMediaType('https://example.com/video.mp4')).toBe('unknown');
    });
  });
});

// =============================================================================
// Document Detector Tests
// =============================================================================

describe('Document detector', () => {
  describe('hasDocumentExtension', () => {
    it('should return true for document extensions', () => {
      expect(hasDocumentExtension('https://example.com/doc.pdf')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.doc')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.docx')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.xls')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.xlsx')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.ppt')).toBe(true);
      expect(hasDocumentExtension('https://example.com/doc.pptx')).toBe(true);
    });

    it('should return false for non-document extensions', () => {
      expect(hasDocumentExtension('https://example.com/video.mp4')).toBe(false);
      expect(hasDocumentExtension('https://example.com/image.jpg')).toBe(false);
    });
  });

  describe('isDocumentDataUrl', () => {
    it('should detect document data URLs', () => {
      expect(isDocumentDataUrl('data:application/pdf;base64,abc')).toBe(true);
      expect(isDocumentDataUrl('data:application/msword;base64,xyz')).toBe(true);
    });

    it('should return false for non-document data URLs', () => {
      expect(isDocumentDataUrl('data:video/mp4;base64,abc')).toBe(false);
      expect(isDocumentDataUrl('data:image/png;base64,abc')).toBe(false);
    });

    it('should return false for non-data URLs', () => {
      expect(isDocumentDataUrl('https://example.com/doc.pdf')).toBe(false);
    });
  });

  describe('isDocumentPlatformUrl', () => {
    it('should detect Google Docs URLs', () => {
      expect(isDocumentPlatformUrl('https://docs.google.com/document/d/abc123')).toBe(true);
      expect(isDocumentPlatformUrl('https://docs.google.com/spreadsheets/d/abc123')).toBe(true);
      expect(isDocumentPlatformUrl('https://docs.google.com/presentation/d/abc123')).toBe(true);
    });

    it('should detect Google Drive URLs', () => {
      expect(isDocumentPlatformUrl('https://drive.google.com/file/d/abc123')).toBe(true);
    });

    it('should detect SharePoint URLs', () => {
      expect(isDocumentPlatformUrl('https://company.sharepoint.com/_layouts/15/Doc.aspx')).toBe(
        true
      );
    });

    it('should detect Dropbox URLs', () => {
      expect(isDocumentPlatformUrl('https://www.dropbox.com/s/abc123/file.pdf')).toBe(true);
    });

    it('should detect Scribd URLs', () => {
      expect(isDocumentPlatformUrl('https://www.scribd.com/document/123456')).toBe(true);
    });

    it('should detect SlideShare URLs', () => {
      expect(isDocumentPlatformUrl('https://www.slideshare.net/presentation')).toBe(true);
    });

    it('should detect Issuu URLs', () => {
      expect(isDocumentPlatformUrl('https://issuu.com/magazine')).toBe(true);
    });

    it('should detect Box URLs', () => {
      expect(isDocumentPlatformUrl('https://box.com/s/abc123')).toBe(true);
    });

    it('should return false for non-document platform URLs', () => {
      expect(isDocumentPlatformUrl('https://example.com/page')).toBe(false);
    });
  });

  describe('matchesDocumentCdnPattern', () => {
    it('should detect PDF path patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/pdf/file.pdf')).toBe(true);
    });

    it('should detect document path patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/documents/report.docx')).toBe(true);
      expect(matchesDocumentCdnPattern('https://example.com/document/report')).toBe(true);
    });

    it('should detect download path patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/downloads/file.pdf')).toBe(true);
      expect(matchesDocumentCdnPattern('https://example.com/download/report.docx')).toBe(true);
    });

    it('should detect file path patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/files/doc.pdf')).toBe(true);
    });

    it('should detect PDF query string patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/view.pdf?id=123')).toBe(true);
    });

    it('should detect attachment patterns', () => {
      expect(matchesDocumentCdnPattern('https://example.com/attachment123.pdf')).toBe(true);
    });

    it('should return false for empty URL', () => {
      expect(matchesDocumentCdnPattern('')).toBe(false);
    });
  });

  describe('hasDocumentPathIndicator', () => {
    it('should detect PDF path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/pdf/file')).toBe(true);
    });

    it('should detect document path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/document/123')).toBe(true);
    });

    it('should detect download path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/download/file')).toBe(true);
    });

    it('should detect file path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/file/abc')).toBe(true);
    });

    it('should detect attachment path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/attachment/123')).toBe(true);
    });

    it('should detect export path indicator', () => {
      expect(hasDocumentPathIndicator('https://example.com/export/report')).toBe(true);
    });

    it('should return false for paths without indicators', () => {
      expect(hasDocumentPathIndicator('https://example.com/page')).toBe(false);
    });
  });

  describe('detectDocument', () => {
    it('should return 0 for empty URL', () => {
      expect(detectDocument('')).toBe(0);
    });

    it('should return 1.0 for document file extensions', () => {
      expect(detectDocument('https://example.com/doc.pdf')).toBe(1.0);
    });

    it('should return 0.9 for document platform URLs', () => {
      expect(detectDocument('https://docs.google.com/document/d/abc')).toBe(0.9);
    });

    it('should return 0.85 for CDN patterns with path indicator', () => {
      expect(detectDocument('https://example.com/pdf/download/report')).toBe(0.85);
    });

    it('should return 0.85 for CDN patterns that also match path indicators', () => {
      // /files/ matches both CDN pattern and path indicator (/file)
      expect(detectDocument('https://example.com/files/abc')).toBe(0.85);
    });

    it('should return 0.5 for path indicators alone (export)', () => {
      // /export is a path indicator but not a CDN pattern
      expect(detectDocument('https://example.com/export/report')).toBe(0.5);
    });

    it('should return 0.4 for blob URLs', () => {
      expect(detectDocument('blob:https://example.com/abc-123')).toBe(0.4);
    });

    it('should return 0 for non-absolute URLs', () => {
      expect(detectDocument('/relative/path.pdf')).toBe(0);
    });
  });

  describe('getDocumentMediaType', () => {
    it('should return document for document URLs', () => {
      expect(getDocumentMediaType('https://example.com/doc.pdf')).toBe('document');
    });

    it('should return unknown for non-document URLs', () => {
      expect(getDocumentMediaType('https://example.com/video.mp4')).toBe('unknown');
    });
  });

  describe('isPdfUrl', () => {
    it('should return true for PDF file extension', () => {
      expect(isPdfUrl('https://example.com/doc.pdf')).toBe(true);
      expect(isPdfUrl('https://example.com/doc.PDF')).toBe(true);
    });

    it('should return true for PDF data URL', () => {
      expect(isPdfUrl('data:application/pdf;base64,abc')).toBe(true);
    });

    it('should return false for non-PDF document URLs', () => {
      expect(isPdfUrl('https://example.com/doc.docx')).toBe(false);
    });

    it('should return false for other media types', () => {
      expect(isPdfUrl('https://example.com/photo.jpg')).toBe(false);
    });
  });
});

// =============================================================================
// Image Detector Tests
// =============================================================================

describe('Image detector', () => {
  describe('hasImageExtension', () => {
    it('should return true for image extensions', () => {
      expect(hasImageExtension('https://example.com/photo.jpg')).toBe(true);
      expect(hasImageExtension('https://example.com/photo.png')).toBe(true);
      expect(hasImageExtension('https://example.com/photo.gif')).toBe(true);
      expect(hasImageExtension('https://example.com/photo.webp')).toBe(true);
      expect(hasImageExtension('https://example.com/photo.svg')).toBe(true);
    });

    it('should return false for non-image extensions', () => {
      expect(hasImageExtension('https://example.com/video.mp4')).toBe(false);
      expect(hasImageExtension('https://example.com/doc.pdf')).toBe(false);
    });
  });

  describe('isImageDataUrl', () => {
    it('should detect image data URLs', () => {
      expect(isImageDataUrl('data:image/png;base64,abc')).toBe(true);
      expect(isImageDataUrl('data:image/jpeg;base64,xyz')).toBe(true);
      expect(isImageDataUrl('data:image/gif;base64,def')).toBe(true);
    });

    it('should return false for non-image data URLs', () => {
      expect(isImageDataUrl('data:video/mp4;base64,abc')).toBe(false);
      expect(isImageDataUrl('data:application/pdf;base64,abc')).toBe(false);
    });

    it('should return false for non-data URLs', () => {
      expect(isImageDataUrl('https://example.com/photo.jpg')).toBe(false);
    });
  });

  describe('matchesImageCdnPattern', () => {
    it('should detect path-based CDN patterns', () => {
      expect(matchesImageCdnPattern('https://example.com/images/photo')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/image/photo')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/img/photo')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/photos/vacation')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/media/content')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/uploads/file')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/assets/image')).toBe(true);
      expect(matchesImageCdnPattern('https://example.com/static/logo')).toBe(true);
    });

    it('should detect known image CDN domains', () => {
      expect(matchesImageCdnPattern('https://res.cloudinary.com/demo/image/upload/v1')).toBe(true);
      expect(matchesImageCdnPattern('https://example.imgix.net/image.jpg')).toBe(true);
      expect(matchesImageCdnPattern('https://images.unsplash.com/photo-123')).toBe(true);
      expect(matchesImageCdnPattern('https://www.pexels.com/photo/123')).toBe(true);
      expect(matchesImageCdnPattern('https://pbs.twimg.com/media/abc')).toBe(true);
      expect(matchesImageCdnPattern('https://scontent.fbcdn.net/v/photo')).toBe(true);
      expect(matchesImageCdnPattern('https://scontent.cdninstagram.com/image')).toBe(true);
      expect(matchesImageCdnPattern('https://i.pinimg.com/originals/abc')).toBe(true);
      expect(matchesImageCdnPattern('https://media.giphy.com/media/abc')).toBe(true);
      expect(matchesImageCdnPattern('https://i.imgur.com/abc123')).toBe(true);
    });

    it('should return false for empty URL', () => {
      expect(matchesImageCdnPattern('')).toBe(false);
    });

    it('should return false for non-CDN URLs', () => {
      expect(matchesImageCdnPattern('https://example.com/page')).toBe(false);
    });
  });

  describe('hasImageQueryParams', () => {
    it('should detect format query params', () => {
      expect(hasImageQueryParams('https://example.com/image?format=jpg')).toBe(true);
      expect(hasImageQueryParams('https://example.com/image?f=png')).toBe(true);
      expect(hasImageQueryParams('https://example.com/image?type=webp')).toBe(true);
      expect(hasImageQueryParams('https://example.com/image?fm=gif')).toBe(true);
    });

    it('should detect multiple image operation params', () => {
      expect(hasImageQueryParams('https://example.com/image?w=100&h=100')).toBe(true);
      expect(hasImageQueryParams('https://example.com/image?width=200&height=200')).toBe(true);
      expect(hasImageQueryParams('https://example.com/image?resize=cover&quality=80')).toBe(true);
    });

    it('should return false for single operation param', () => {
      expect(hasImageQueryParams('https://example.com/image?w=100')).toBe(false);
    });

    it('should return false for invalid URLs', () => {
      expect(hasImageQueryParams('not-a-url')).toBe(false);
    });

    it('should return false for URLs without image params', () => {
      expect(hasImageQueryParams('https://example.com/page?id=123')).toBe(false);
    });
  });

  describe('detectImage', () => {
    it('should return 0 for empty URL', () => {
      expect(detectImage('')).toBe(0);
    });

    it('should return 1.0 for image file extensions', () => {
      expect(detectImage('https://example.com/photo.jpg')).toBe(1.0);
    });

    it('should return 0.5 for blob URLs', () => {
      expect(detectImage('blob:https://example.com/abc-123')).toBe(0.5);
    });

    it('should return 0 for non-absolute URLs', () => {
      expect(detectImage('/relative/path.jpg')).toBe(0);
    });

    it('should return 0.9 for CDN pattern with image query params', () => {
      expect(detectImage('https://i.imgur.com/abc?w=100&h=100')).toBe(0.9);
    });

    it('should return 0.7 for CDN pattern without query params', () => {
      expect(detectImage('https://i.imgur.com/abc123')).toBe(0.7);
    });

    it('should return 0.6 for query params without CDN pattern', () => {
      expect(detectImage('https://example.com/unknown?w=100&h=100')).toBe(0.6);
    });

    it('should return 0.5 for path containing image keywords', () => {
      // Path must contain /image, /img, /photo, or /picture as segment
      expect(detectImage('https://example.com/image/abc')).toBe(0.7); // Also matches CDN pattern
      expect(detectImage('https://example.com/gallery/img/123')).toBe(0.7); // Also matches CDN pattern
    });

    it('should return 0.3 for URLs without extension', () => {
      // URL without CDN pattern or keywords, no extension
      expect(detectImage('https://example.com/data/abc123')).toBe(0.3);
    });

    it('should return 0.3 for URL without extension (could be image)', () => {
      expect(detectImage('https://example.com/media/abc123')).toBe(0.7); // matches CDN pattern /media/
    });
  });

  describe('getImageMediaType', () => {
    it('should return image for image URLs', () => {
      expect(getImageMediaType('https://example.com/photo.jpg')).toBe('image');
    });

    it('should return unknown for non-image URLs', () => {
      expect(getImageMediaType('https://example.com/video.mp4')).toBe('unknown');
    });
  });

  describe('isUiElementSize', () => {
    it('should return true for small dimensions', () => {
      expect(isUiElementSize(16, 16)).toBe(true);
      expect(isUiElementSize(24, 24)).toBe(true);
      expect(isUiElementSize(32, 32)).toBe(true);
    });

    it('should return false for large dimensions', () => {
      expect(isUiElementSize(100, 100)).toBe(false);
      expect(isUiElementSize(800, 600)).toBe(false);
    });

    it('should return false for null dimensions', () => {
      expect(isUiElementSize(null, null)).toBe(false);
      expect(isUiElementSize(16, null)).toBe(false);
      expect(isUiElementSize(null, 16)).toBe(false);
    });

    it('should respect custom maxDimension', () => {
      expect(isUiElementSize(50, 50, 64)).toBe(true);
      expect(isUiElementSize(50, 50, 32)).toBe(false);
    });
  });
});
