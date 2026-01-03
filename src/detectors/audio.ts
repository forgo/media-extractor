/**
 * Audio detection module
 *
 * Provides functions to detect and validate audio URLs.
 */

import type { MediaType } from '../types';
import { isAbsoluteUrl, isDataUrl, isBlobUrl, parseUrl, extractDomain } from '../utils/url';
import { extractExtension, isAudioExtension } from '../utils/filename';
import { getMimeFromDataUrl, isAudioMime, getSupportedAudioExtensions } from '../utils/mime';

/** Supported audio extensions */
const _AUDIO_EXTENSIONS = new Set(getSupportedAudioExtensions());
void _AUDIO_EXTENSIONS; // Preserve for future use

/** Known audio/podcast hosting platforms */
const AUDIO_PLATFORMS: Array<{
  domain: RegExp;
  patterns?: RegExp[];
}> = [
  {
    domain: /^(www\.)?spotify\.com$/i,
    patterns: [/\/track\//, /\/episode\//, /\/album\//],
  },
  {
    domain: /^open\.spotify\.com$/i,
  },
  {
    domain: /^(www\.)?soundcloud\.com$/i,
  },
  {
    domain: /^(www\.)?bandcamp\.com$/i,
  },
  {
    domain: /^.*\.bandcamp\.com$/i,
  },
  {
    domain: /^(www\.)?mixcloud\.com$/i,
  },
  {
    domain: /^(www\.)?audiomack\.com$/i,
  },
  {
    domain: /^(www\.)?podcasts\.apple\.com$/i,
  },
  {
    domain: /^(www\.)?anchor\.fm$/i,
  },
];

/** Audio CDN patterns */
const AUDIO_CDN_PATTERNS = [
  /\.soundcloud\.com\/.*\.(mp3|ogg|wav)/i,
  /audio.*\.cloudfront\.net\//i,
  /\.audio\./i,
  /\/audio\//i,
  /podcast.*\.(mp3|m4a|ogg)/i,
];

/** Streaming audio patterns (podcasts, internet radio) */
const STREAMING_AUDIO_PATTERNS = [/\.pls$/i, /\.asx$/i, /\/stream\//i, /\/listen\//i, /icecast/i, /shoutcast/i];

/**
 * Check if a URL has an audio file extension
 */
export function hasAudioExtension(url: string): boolean {
  const ext = extractExtension(url);
  return isAudioExtension(ext);
}

/**
 * Check if a data URL is audio
 */
export function isAudioDataUrl(url: string): boolean {
  if (!isDataUrl(url)) return false;

  const mime = getMimeFromDataUrl(url);
  return mime ? isAudioMime(mime) : false;
}

/**
 * Check if URL is from a known audio platform
 */
export function isAudioPlatformUrl(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  const parsed = parseUrl(url);
  if (!parsed) return false;

  for (const platform of AUDIO_PLATFORMS) {
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
 * Check if URL matches audio CDN patterns
 */
export function matchesAudioCdnPattern(url: string): boolean {
  if (!url) return false;

  for (const pattern of AUDIO_CDN_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Check if URL is a streaming audio URL
 */
export function isStreamingAudioUrl(url: string): boolean {
  if (!url) return false;

  for (const pattern of STREAMING_AUDIO_PATTERNS) {
    if (pattern.test(url)) {
      return true;
    }
  }

  return false;
}

/**
 * Detect if a URL is an audio URL
 *
 * @param url - The URL to check
 * @returns Confidence score from 0 to 1
 */
export function detectAudio(url: string): number {
  if (!url) return 0;

  // Data URLs - check MIME type
  if (isDataUrl(url)) {
    return isAudioDataUrl(url) ? 1.0 : 0;
  }

  // Blob URLs could be audio - moderate score
  if (isBlobUrl(url)) {
    return 0.4;
  }

  // Check for absolute URL
  if (!isAbsoluteUrl(url)) return 0;

  // Audio file extension (highest confidence)
  if (hasAudioExtension(url)) {
    return 1.0;
  }

  // Known audio platform (high confidence)
  if (isAudioPlatformUrl(url)) {
    return 0.9;
  }

  // Audio CDN patterns (high confidence)
  if (matchesAudioCdnPattern(url)) {
    return 0.85;
  }

  // Streaming audio patterns (moderate confidence)
  if (isStreamingAudioUrl(url)) {
    return 0.7;
  }

  return 0;
}

/**
 * Check if a URL is likely an audio file (boolean version)
 *
 * @param url - The URL to check
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isAudioUrl(url: string, threshold: number = 0.5): boolean {
  return detectAudio(url) >= threshold;
}

/**
 * Get the detected media type for an audio URL
 * Returns 'audio' if detected, 'unknown' otherwise
 */
export function getAudioMediaType(url: string): MediaType {
  return isAudioUrl(url) ? 'audio' : 'unknown';
}
