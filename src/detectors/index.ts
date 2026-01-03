/**
 * Detector registry module
 *
 * Provides a unified API for detecting media types from URLs.
 */

import type { MediaType } from '../types';
import { detectImage, isImageUrl } from './image';
import { detectVideo, isVideoUrl } from './video';
import { detectAudio, isAudioUrl } from './audio';
import { detectDocument, isDocumentUrl } from './document';

// Re-export all detectors
export * from './image';
export * from './video';
export * from './audio';
export * from './document';

/**
 * Detection result with confidence scores for each media type
 */
export interface DetectionResult {
  /** The detected media type (highest confidence) */
  type: MediaType;

  /** Confidence score for the detected type (0-1) */
  confidence: number;

  /** Confidence scores for each media type */
  scores: Record<MediaType, number>;
}

/**
 * Detect the media type of a URL with confidence scores
 *
 * @param url - The URL to detect
 * @returns Detection result with type, confidence, and all scores
 */
export function detectMediaType(url: string): DetectionResult {
  const scores: Record<MediaType, number> = {
    image: detectImage(url),
    video: detectVideo(url),
    audio: detectAudio(url),
    document: detectDocument(url),
    unknown: 0,
  };

  // Find the type with highest confidence
  let bestType: MediaType = 'unknown';
  let bestScore = 0;

  for (const [type, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestType = type as MediaType;
    }
  }

  // If no detector matched, set unknown confidence to 1
  if (bestScore === 0) {
    scores.unknown = 1;
    bestType = 'unknown';
    bestScore = 1;
  }

  return {
    type: bestType,
    confidence: bestScore,
    scores,
  };
}

/**
 * Get the detected media type (simple version)
 *
 * @param url - The URL to detect
 * @param threshold - Minimum confidence threshold (default: 0.5)
 * @returns The detected MediaType
 */
export function getMediaType(url: string, threshold: number = 0.5): MediaType {
  const result = detectMediaType(url);
  return result.confidence >= threshold ? result.type : 'unknown';
}

/**
 * Check if a URL matches a specific media type
 *
 * @param url - The URL to check
 * @param type - The media type to check for
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isMediaType(url: string, type: MediaType, threshold: number = 0.5): boolean {
  switch (type) {
    case 'image':
      return isImageUrl(url, threshold);
    case 'video':
      return isVideoUrl(url, threshold);
    case 'audio':
      return isAudioUrl(url, threshold);
    case 'document':
      return isDocumentUrl(url, threshold);
    default:
      return false;
  }
}

/**
 * Check if a URL is any supported media type
 *
 * @param url - The URL to check
 * @param threshold - Minimum confidence threshold (default: 0.5)
 */
export function isSupportedMedia(url: string, threshold: number = 0.5): boolean {
  const result = detectMediaType(url);
  return result.type !== 'unknown' && result.confidence >= threshold;
}

/**
 * Filter URLs by media type
 *
 * @param urls - Array of URLs to filter
 * @param type - Media type to filter for
 * @param threshold - Minimum confidence threshold (default: 0.5)
 * @returns URLs that match the specified type
 */
export function filterByMediaType(urls: string[], type: MediaType, threshold: number = 0.5): string[] {
  return urls.filter((url) => isMediaType(url, type, threshold));
}

/**
 * Group URLs by their detected media type
 *
 * @param urls - Array of URLs to group
 * @param threshold - Minimum confidence threshold (default: 0.5)
 * @returns URLs grouped by media type
 */
export function groupByMediaType(
  urls: string[],
  threshold: number = 0.5
): Record<MediaType, string[]> {
  const groups: Record<MediaType, string[]> = {
    image: [],
    video: [],
    audio: [],
    document: [],
    unknown: [],
  };

  for (const url of urls) {
    const result = detectMediaType(url);
    const type = result.confidence >= threshold ? result.type : 'unknown';
    groups[type].push(url);
  }

  return groups;
}

/**
 * Detect media types for multiple URLs
 *
 * @param urls - Array of URLs to detect
 * @returns Map of URL to detection result
 */
export function detectMediaTypes(urls: string[]): Map<string, DetectionResult> {
  const results = new Map<string, DetectionResult>();

  for (const url of urls) {
    results.set(url, detectMediaType(url));
  }

  return results;
}
