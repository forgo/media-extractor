/**
 * Video detection module
 *
 * Provides functions to detect and validate video URLs.
 */

import type { MediaType } from '../types';
import { isAbsoluteUrl, isDataUrl, isBlobUrl, parseUrl, extractDomain } from '../utils/url';
import { extractExtension, isVideoExtension } from '../utils/filename';
import { getMimeFromDataUrl, isVideoMime, getSupportedVideoExtensions } from '../utils/mime';

/** Supported video extensions */
const _VIDEO_EXTENSIONS = new Set(getSupportedVideoExtensions());
void _VIDEO_EXTENSIONS; // Preserve for future use

/** Streaming manifest extensions */
const STREAMING_EXTENSIONS = new Set(['m3u8', 'm3u', 'mpd']);

/** Known video hosting platforms */
const VIDEO_PLATFORMS: {
  domain: RegExp;
  patterns?: RegExp[];
}[] = [
  {
    domain: /^(www\.)?youtube\.com$/i,
    patterns: [/\/watch\?/, /\/embed\//, /\/v\//],
  },
  {
    domain: /^youtu\.be$/i,
  },
  {
    domain: /^(www\.)?vimeo\.com$/i,
    patterns: [/\/\d+/, /\/video\//],
  },
  {
    domain: /^player\.vimeo\.com$/i,
  },
  {
    domain: /^(www\.)?dailymotion\.com$/i,
    patterns: [/\/video\//, /\/embed\//],
  },
  {
    domain: /^(www\.)?twitch\.tv$/i,
    patterns: [/\/videos\//, /\/clip\//],
  },
  {
    domain: /^clips\.twitch\.tv$/i,
  },
  {
    domain: /^(www\.)?tiktok\.com$/i,
    patterns: [/\/@[\w.-]+\/video\//],
  },
  {
    domain: /^(www\.)?facebook\.com$/i,
    patterns: [/\/watch\//, /\/videos\//],
  },
  {
    domain: /^(www\.)?instagram\.com$/i,
    patterns: [/\/reel\//, /\/tv\//],
  },
  {
    domain: /^(www\.)?twitter\.com$/i,
    patterns: [/\/status\/.*\/video\//],
  },
  {
    domain: /^(www\.)?x\.com$/i,
    patterns: [/\/status\/.*\/video\//],
  },
];

/** Video CDN patterns */
const VIDEO_CDN_PATTERNS = [
  /\.cloudfront\.net\/[^?#]*\.(mp4|webm|m3u8)/i,
  /\.akamaized\.net\/[^?#]*\.(mp4|webm|m3u8)/i,
  /\.fastly\.net\/[^?#]*\.(mp4|webm)/i,
  /video\.twimg\.com\//i,
  /\.cdninstagram\.com\/[^?#]*video/i,
  /\.fbcdn\.net\/[^?#]*video/i,
];

/**
 * Check if a URL has a video file extension
 */
export function hasVideoExtension(url: string): boolean {
  const ext = extractExtension(url);
  return isVideoExtension(ext);
}

/**
 * Check if a URL is a streaming manifest
 */
export function isStreamingManifest(url: string): boolean {
  const ext = extractExtension(url);
  return STREAMING_EXTENSIONS.has(ext.toLowerCase());
}

/**
 * Check if a data URL is a video
 */
export function isVideoDataUrl(url: string): boolean {
  if (!isDataUrl(url)) return false;

  const mime = getMimeFromDataUrl(url);
  return mime ? isVideoMime(mime) : false;
}

/**
 * Check if URL is from a known video platform
 */
export function isVideoPlatformUrl(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  const parsed = parseUrl(url);
  if (!parsed) return false;

  for (const platform of VIDEO_PLATFORMS) {
    if (platform.domain.test(domain)) {
      // If no patterns specified, domain match is enough
      if (!platform.patterns) return true;

      // Check if URL matches any pattern
      const fullUrl = parsed.pathname + parsed.search;
      for (const pattern of platform.patterns) {
        if (pattern.test(fullUrl)) {
          return true;
        }
      }
    }
  }

  return false;
}

/**
 * Check if URL matches video CDN patterns
 */
export function matchesVideoCdnPattern(url: string): boolean {
  if (!url) return false;

  for (const pattern of VIDEO_CDN_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Extract video ID from known platform URLs
 */
export function extractVideoId(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const domain = extractDomain(url);

  // YouTube
  if (/youtube\.com$/i.test(domain)) {
    // Watch URL: ?v=VIDEO_ID
    const videoId = parsed.searchParams.get('v');
    if (videoId) return videoId;

    // Embed URL: /embed/VIDEO_ID
    const embedMatch = /\/embed\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
    if (embedMatch?.[1]) return embedMatch[1];
  }

  if (/youtu\.be$/i.test(domain)) {
    // Short URL: /VIDEO_ID
    const match = /^\/([a-zA-Z0-9_-]+)/.exec(parsed.pathname);
    if (match?.[1]) return match[1];
  }

  // Vimeo
  if (/vimeo\.com$/i.test(domain)) {
    const match = /\/(\d+)/.exec(parsed.pathname);
    if (match?.[1]) return match[1];
  }

  return null;
}

/**
 * Detect if a URL is a video URL
 *
 * @param url - The URL to check
 * @returns Confidence score from 0 to 1
 */
export function detectVideo(url: string): number {
  if (!url) return 0;

  // Data URLs - check MIME type
  if (isDataUrl(url)) {
    return isVideoDataUrl(url) ? 1.0 : 0;
  }

  // Blob URLs could be videos - moderate score
  if (isBlobUrl(url)) {
    return 0.4;
  }

  // Check for absolute URL
  if (!isAbsoluteUrl(url)) return 0;

  // Video file extension (highest confidence)
  if (hasVideoExtension(url)) {
    return 1.0;
  }

  // Streaming manifest (high confidence)
  if (isStreamingManifest(url)) {
    return 0.95;
  }

  // Known video platform (high confidence)
  if (isVideoPlatformUrl(url)) {
    return 0.9;
  }

  // Video CDN patterns (high confidence)
  if (matchesVideoCdnPattern(url)) {
    return 0.85;
  }

  return 0;
}

/**
 * Check if a URL is likely a video (boolean version)
 *
 * @param url - The URL to check
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isVideoUrl(url: string, threshold = 0.5): boolean {
  return detectVideo(url) >= threshold;
}

/**
 * Get the detected media type for a video URL
 * Returns 'video' if detected, 'unknown' otherwise
 */
export function getVideoMediaType(url: string): MediaType {
  return isVideoUrl(url) ? 'video' : 'unknown';
}
