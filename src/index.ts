/**
 * Media Extractor Library
 *
 * A zero-dependency TypeScript library for extracting, detecting, and validating
 * media from various sources including URLs, HTML, DOM elements, clipboard,
 * and drag & drop events.
 *
 * @packageDocumentation
 */

// =============================================================================
// Core Types
// =============================================================================

export type {
  // Media types
  MediaType,
  MediaSource,
  MediaDimensions,

  // Extracted media
  ExtractedMedia,
  ExtractionResult,
  ExtractionStats,

  // Security types
  SecurityStatus,
  SecurityMode,
  ThreatType,
  ThreatSeverity,
  ThreatInfo,
  SecurityAssessment,
  SecurityConfig,
  ThreatDetectionConfig,
  ValidationConfig,

  // Filter types
  DimensionFilter,

  // Configuration
  ExtractorConfig,
} from './types';

export {
  MEDIA_TYPES,
  DEFAULT_SECURITY_ASSESSMENT,
  SEVERITY_WEIGHTS,
  DEFAULT_THREAT_SEVERITY,
} from './types';

// =============================================================================
// Main Extractor
// =============================================================================

export {
  MediaExtractor,
  createExtractor,
  createSecureExtractor,
  createFilteredExtractor,
  // Quick functions
  extractFromUrl,
  extractFromHtml,
  extractFromElement,
  extractFromDataTransfer,
  extractFromClipboard,
  extractFromFiles,
} from './extractor';

// =============================================================================
// Detectors
// =============================================================================

export {
  // Main detection
  detectMediaType,
  getMediaType,
  isMediaType,
  isSupportedMedia,

  // Type-specific detection
  detectImage,
  isImageUrl,
  detectVideo,
  isVideoUrl,
  detectAudio,
  isAudioUrl,
  detectDocument,
  isDocumentUrl,

  // Batch operations
  filterByMediaType,
  groupByMediaType,
  detectMediaTypes,

  // Types
  type DetectionResult,
} from './detectors';

// =============================================================================
// Parsers
// =============================================================================

export {
  // HTML parsing
  parseHtml,
  type HtmlParseOptions,

  // DataTransfer parsing
  parseDataTransfer,
  parseClipboard,
  type DataTransferParseOptions,

  // DOM parsing
  parseDom,
  parseDocument,
  type DomParseOptions,

  // URL parsing
  parseUrl,
  parseUrls,
  type UrlParseOptions,
} from './parsers';

// =============================================================================
// Security
// =============================================================================

export {
  // Main scanner
  SecurityScanner,

  // Quick functions
  quickScan,
  isUrlBlocked,
  isUrlSafe,
  sanitize,

  // Validation
  validateUrl,
  type ValidationResult,

  // Blocklists
  BlocklistManager,
  isSuspiciousTld,

  // Threat detection
  detectThreats,
  detectHomograph,
  detectObfuscation,
  detectScriptInjection,
  detectTrackingPixel,
  detectDataExfiltration,
  detectSuspiciousTld,

  // Sanitization
  sanitizeUrl,
  sanitizeFilename,
  sanitizeHtml,
  stripTrackingParams,
  extractSafeUrls,
  isSafeMimeType,
  validateContentType,

  // Presets
  SECURITY_PRESETS,
  DEFAULT_SECURITY_CONFIG,
  type BlocklistConfig,
} from './security';

// =============================================================================
// Filters
// =============================================================================

export {
  // Combined filtering
  applyFilters,
  applyPreset,
  filter,
  FilterBuilder,
  type FilterConfig,
  FILTER_PRESETS,

  // Dimension filtering
  filterByDimensions,
  checkDimensions,
  checkFileSize,
  calculateAspectRatio,
  calculatePixelCount,
  sortBySize,
  sortByAspectRatio,
  getLargest,
  groupBySize,
  createPresetFilter,
  combineDimensionFilters,
  DIMENSION_PRESETS,

  // Pattern filtering
  filterByPatterns,
  checkPatternFilter,
  matchesPattern,
  matchesAnyPattern,
  matchesDomain,
  filterOutUnwanted,
  filterForQuality,
  filterByDomain,
  excludeByDomain,
  groupByDomain,
  type PatternFilterConfig,
  type UrlPattern,
  COMMON_EXCLUDE_PATTERNS,
  COMMON_INCLUDE_PATTERNS,

  // Deduplication
  deduplicate,
  findDuplicates,
  countDuplicates,
  generateDedupeKey,
  scoreItem,
  isSizeVariant,
  groupSizeVariants,
  keepLargestVariants,
  type DedupeStrategy,
  type DedupeOptions,
} from './filters';

// =============================================================================
// Utilities
// =============================================================================

export {
  // URL utilities
  isAbsoluteUrl,
  isDataUrl,
  isBlobUrl,
  isHttps,
  isHttp,
  isJavascriptUrl,
  parseUrl as parseUrlUtil,
  extractDomain,
  extractTld,
  extractRegisteredDomain,
  extractPath,
  extractQueryString,
  parseQueryParams,
  countQueryParams,
  normalizeUrl,
  getDedupeKey,
  isIpv4Address,
  isPrivateIp,
  isLocalhost,
  isPrivateUrl,
  safeDecodeURIComponent,
  safeDecodeURI,
  countEncodedChars,
  isExcessivelyEncoded,
  extractEmbeddedUrl,
  isUrlShortener,
  countRedirects,

  // Filename utilities
  extractFilename,
  extractExtension,
  sanitizeFilename as sanitizeFilenameUtil,
  generateFilename,
  hasPathTraversal,

  // MIME utilities
  getMimeFromExtension,
  getExtensionFromMime,
  getMediaTypeFromMime,
  getMediaTypeFromExtension,
  isImageMime,
  isVideoMime,
  isAudioMime,
  isDocumentMime,
  detectMimeFromBytes,
} from './utils';
