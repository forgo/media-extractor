/**
 * MIME type utilities for the Media Extractor library
 *
 * Provides mappings between file extensions and MIME types,
 * and utilities for media type detection.
 */

import type { MediaType } from '../types';

// =============================================================================
// Extension to MIME Type Mapping
// =============================================================================

/** Map of file extensions to MIME types */
const EXTENSION_TO_MIME: Record<string, string> = {
  // Images
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  jpe: 'image/jpeg',
  jfif: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  ico: 'image/x-icon',
  avif: 'image/avif',
  heic: 'image/heic',
  heif: 'image/heif',
  tiff: 'image/tiff',
  tif: 'image/tiff',

  // Video
  mp4: 'video/mp4',
  m4v: 'video/mp4',
  webm: 'video/webm',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  mov: 'video/quicktime',
  wmv: 'video/x-ms-wmv',
  flv: 'video/x-flv',
  ogv: 'video/ogg',
  '3gp': 'video/3gpp',
  mpg: 'video/mpeg',
  mpeg: 'video/mpeg',

  // Audio
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  ogg: 'audio/ogg',
  oga: 'audio/ogg',
  flac: 'audio/flac',
  aac: 'audio/aac',
  m4a: 'audio/mp4',
  wma: 'audio/x-ms-wma',
  aiff: 'audio/aiff',
  opus: 'audio/opus',

  // Documents
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  txt: 'text/plain',
  rtf: 'application/rtf',
};

/** Map of MIME types to extensions (primary extension for each type) */
const MIME_TO_EXTENSION: Record<string, string> = {
  // Images
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/bmp': 'bmp',
  'image/x-icon': 'ico',
  'image/vnd.microsoft.icon': 'ico',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  'image/tiff': 'tiff',

  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/x-matroska': 'mkv',
  'video/x-msvideo': 'avi',
  'video/quicktime': 'mov',
  'video/x-ms-wmv': 'wmv',
  'video/x-flv': 'flv',
  'video/ogg': 'ogv',
  'video/3gpp': '3gp',
  'video/mpeg': 'mpg',

  // Audio
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav',
  'audio/wave': 'wav',
  'audio/x-wav': 'wav',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/aac': 'aac',
  'audio/mp4': 'm4a',
  'audio/x-ms-wma': 'wma',
  'audio/aiff': 'aiff',
  'audio/opus': 'opus',

  // Documents
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'text/plain': 'txt',
  'application/rtf': 'rtf',
};

// =============================================================================
// MIME Type Detection
// =============================================================================

/**
 * Get MIME type from file extension
 */
export function getMimeFromExtension(extension: string): string | null {
  if (!extension) return null;

  const normalized = extension.toLowerCase().replace(/^\./, '');
  return EXTENSION_TO_MIME[normalized] || null;
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMime(mimeType: string): string | null {
  if (!mimeType) return null;

  const normalized = mimeType.toLowerCase().trim();
  return MIME_TO_EXTENSION[normalized] || null;
}

/**
 * Get MediaType from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (!mimeType) return 'unknown';

  const normalized = mimeType.toLowerCase().trim();

  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  if (normalized === 'application/pdf') return 'document';
  if (
    normalized.includes('document') ||
    normalized.includes('msword') ||
    normalized.includes('excel') ||
    normalized.includes('powerpoint') ||
    normalized.includes('spreadsheet') ||
    normalized.includes('presentation')
  ) {
    return 'document';
  }

  return 'unknown';
}

/**
 * Get MediaType from file extension
 */
export function getMediaTypeFromExtension(extension: string): MediaType {
  const mime = getMimeFromExtension(extension);
  if (mime) {
    return getMediaTypeFromMime(mime);
  }

  // Fallback to extension-based detection
  const normalized = extension.toLowerCase().replace(/^\./, '');

  const imageExts = new Set([
    'jpg',
    'jpeg',
    'png',
    'gif',
    'webp',
    'svg',
    'bmp',
    'ico',
    'avif',
    'heic',
    'heif',
    'tiff',
    'tif',
  ]);
  const videoExts = new Set(['mp4', 'webm', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'ogv', '3gp', 'mpg', 'mpeg', 'm4v']);
  const audioExts = new Set(['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma', 'aiff', 'opus']);
  const docExts = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf']);

  if (imageExts.has(normalized)) return 'image';
  if (videoExts.has(normalized)) return 'video';
  if (audioExts.has(normalized)) return 'audio';
  if (docExts.has(normalized)) return 'document';

  return 'unknown';
}

// =============================================================================
// MIME Type Validation
// =============================================================================

/**
 * Check if a MIME type is an image type
 */
export function isImageMime(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('image/');
}

/**
 * Check if a MIME type is a video type
 */
export function isVideoMime(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('video/');
}

/**
 * Check if a MIME type is an audio type
 */
export function isAudioMime(mimeType: string): boolean {
  if (!mimeType) return false;
  return mimeType.toLowerCase().startsWith('audio/');
}

/**
 * Check if a MIME type is a document type
 */
export function isDocumentMime(mimeType: string): boolean {
  if (!mimeType) return false;

  const normalized = mimeType.toLowerCase();

  return (
    normalized === 'application/pdf' ||
    normalized.includes('document') ||
    normalized.includes('msword') ||
    normalized.includes('excel') ||
    normalized.includes('powerpoint') ||
    normalized.includes('spreadsheet') ||
    normalized.includes('presentation')
  );
}

/**
 * Check if a MIME type is a supported media type
 */
export function isSupportedMime(mimeType: string): boolean {
  return (
    isImageMime(mimeType) || isVideoMime(mimeType) || isAudioMime(mimeType) || isDocumentMime(mimeType)
  );
}

// =============================================================================
// Data URL MIME Extraction
// =============================================================================

/**
 * Extract MIME type from a data URL
 */
export function getMimeFromDataUrl(dataUrl: string): string | null {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;

  const match = dataUrl.match(/^data:([^;,]+)/);
  if (!match?.[1]) return null;

  return match[1].toLowerCase();
}

/**
 * Extract MediaType from a data URL
 */
export function getMediaTypeFromDataUrl(dataUrl: string): MediaType {
  const mime = getMimeFromDataUrl(dataUrl);
  if (mime) {
    return getMediaTypeFromMime(mime);
  }
  return 'unknown';
}

// =============================================================================
// File Type Detection from Bytes (Magic Numbers)
// =============================================================================

/** Magic number signatures for common file types */
const MAGIC_NUMBERS: Array<{
  bytes: number[];
  offset?: number;
  mime: string;
}> = [
  // Images
  { bytes: [0xff, 0xd8, 0xff], mime: 'image/jpeg' },
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], mime: 'image/png' },
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], mime: 'image/gif' }, // GIF87a
  { bytes: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61], mime: 'image/gif' }, // GIF89a
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: 'image/webp' }, // RIFF (check for WEBP later)
  { bytes: [0x42, 0x4d], mime: 'image/bmp' },
  { bytes: [0x00, 0x00, 0x01, 0x00], mime: 'image/x-icon' }, // ICO
  { bytes: [0x00, 0x00, 0x02, 0x00], mime: 'image/x-icon' }, // CUR

  // Video
  { bytes: [0x00, 0x00, 0x00], mime: 'video/mp4' }, // ftyp box (offset varies)
  { bytes: [0x1a, 0x45, 0xdf, 0xa3], mime: 'video/webm' }, // EBML (WebM/MKV)

  // Audio
  { bytes: [0x49, 0x44, 0x33], mime: 'audio/mpeg' }, // ID3 tag (MP3)
  { bytes: [0xff, 0xfb], mime: 'audio/mpeg' }, // MP3 frame sync
  { bytes: [0xff, 0xfa], mime: 'audio/mpeg' }, // MP3 frame sync
  { bytes: [0x4f, 0x67, 0x67, 0x53], mime: 'audio/ogg' }, // OggS

  // Documents
  { bytes: [0x25, 0x50, 0x44, 0x46], mime: 'application/pdf' }, // %PDF
];

/**
 * Detect MIME type from file bytes (magic number detection)
 * Returns null if type cannot be determined
 */
export function detectMimeFromBytes(bytes: Uint8Array): string | null {
  if (!bytes || bytes.length < 8) return null;

  for (const sig of MAGIC_NUMBERS) {
    const offset = sig.offset || 0;
    let matches = true;

    for (let i = 0; i < sig.bytes.length; i++) {
      if (bytes[offset + i] !== sig.bytes[i]) {
        matches = false;
        break;
      }
    }

    if (matches) {
      // Special handling for RIFF-based formats
      if (sig.mime === 'image/webp' && bytes.length >= 12) {
        const webpSig = [0x57, 0x45, 0x42, 0x50]; // WEBP
        let isWebp = true;
        for (let i = 0; i < 4; i++) {
          if (bytes[8 + i] !== webpSig[i]) {
            isWebp = false;
            break;
          }
        }
        if (!isWebp) continue;
      }

      return sig.mime;
    }
  }

  return null;
}

/**
 * Detect MediaType from file bytes
 */
export function detectMediaTypeFromBytes(bytes: Uint8Array): MediaType {
  const mime = detectMimeFromBytes(bytes);
  if (mime) {
    return getMediaTypeFromMime(mime);
  }
  return 'unknown';
}

// =============================================================================
// All Supported Extensions
// =============================================================================

/**
 * Get all supported image extensions
 */
export function getSupportedImageExtensions(): string[] {
  return Object.entries(EXTENSION_TO_MIME)
    .filter(([, mime]) => mime.startsWith('image/'))
    .map(([ext]) => ext);
}

/**
 * Get all supported video extensions
 */
export function getSupportedVideoExtensions(): string[] {
  return Object.entries(EXTENSION_TO_MIME)
    .filter(([, mime]) => mime.startsWith('video/'))
    .map(([ext]) => ext);
}

/**
 * Get all supported audio extensions
 */
export function getSupportedAudioExtensions(): string[] {
  return Object.entries(EXTENSION_TO_MIME)
    .filter(([, mime]) => mime.startsWith('audio/'))
    .map(([ext]) => ext);
}

/**
 * Get all supported document extensions
 */
export function getSupportedDocumentExtensions(): string[] {
  return ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf'];
}

/**
 * Get all supported extensions for a media type
 */
export function getSupportedExtensions(mediaType: MediaType): string[] {
  switch (mediaType) {
    case 'image':
      return getSupportedImageExtensions();
    case 'video':
      return getSupportedVideoExtensions();
    case 'audio':
      return getSupportedAudioExtensions();
    case 'document':
      return getSupportedDocumentExtensions();
    default:
      return [];
  }
}
