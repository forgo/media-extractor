/**
 * Core type definitions for the Media Extractor library
 *
 * This module defines all interfaces, types, and enums used throughout
 * the library for extracting and validating media from various sources.
 */

// =============================================================================
// Media Types
// =============================================================================

/** Supported media types for extraction */
export type MediaType = 'image' | 'video' | 'audio' | 'document' | 'unknown';

/** All media types as an array for iteration */
export const MEDIA_TYPES: readonly MediaType[] = [
  'image',
  'video',
  'audio',
  'document',
  'unknown',
] as const;

// =============================================================================
// Source Tracking
// =============================================================================

/** Identifies where an extracted media item originated from */
export type MediaSource =
  | 'url' // Direct URL input
  | 'html' // Parsed from HTML string
  | 'html-element' // HTML element (img, video, etc.)
  | 'dom' // Live DOM element
  | 'dom-element' // DOM element reference
  | 'drop' // Drag & drop DataTransfer
  | 'paste' // Clipboard paste
  | 'file' // Direct file input
  | 'uri-list' // text/uri-list data
  | 'text-url' // URL in plain text
  | 'embedded' // Extracted from wrapper URL
  | 'data-url' // Inline data URL
  | 'blob-url'; // Blob URL

/** Quality/recommendation hints for extracted items */
export type MediaHint =
  | 'primary' // Main content (first/largest)
  | 'secondary' // Supporting content
  | 'ui-element' // Likely icon/button
  | 'thumbnail' // Thumbnail version
  | 'duplicate' // Duplicate of another item
  | 'unknown';

// =============================================================================
// Security Types
// =============================================================================

/** Security status for extracted items */
export type SecurityStatus =
  | 'safe' // Passed all security checks
  | 'quarantined' // Flagged but allowed (user can review)
  | 'blocked' // Rejected entirely
  | 'unchecked'; // Security checks disabled/skipped

/** Security mode */
export type SecurityMode = 'strict' | 'balanced' | 'permissive' | 'disabled';

/** Types of threats that can be detected */
export type ThreatType =
  | 'blocked-domain' // Domain is on blocklist
  | 'blocked-ip' // IP address is on blocklist
  | 'blocked-pattern' // URL matches blocked pattern
  | 'suspicious-redirect' // URL contains suspicious redirect
  | 'known-malware' // Known malware distribution URL
  | 'phishing' // Suspected phishing URL
  | 'tracking-pixel' // 1x1 tracking pixel
  | 'data-exfil' // Potential data exfiltration URL
  | 'script-injection' // URL contains script injection attempt
  | 'private-ip' // Points to private/local IP range
  | 'suspicious-tld' // Suspicious top-level domain
  | 'homograph' // Unicode homograph attack
  | 'excessive-params' // Unusually long/suspicious query params
  | 'obfuscated-url' // URL appears obfuscated
  | 'invalid-protocol' // Invalid or dangerous protocol
  | 'excessive-encoding' // Excessive URL encoding
  | 'excessive-redirects' // Too many redirect hops
  | 'url-too-long' // URL exceeds max length
  | 'custom'; // User-defined threat

/** Severity levels for detected threats */
export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

/** Information about a detected threat */
export interface ThreatInfo {
  /** Type of threat detected */
  type: ThreatType;

  /** Severity level of the threat */
  severity: ThreatSeverity;

  /** Human-readable description of the threat */
  description: string;

  /** Pattern that triggered this detection (if applicable) */
  matchedPattern?: string;

  /** Recommended action for the user */
  recommendation?: string;
}

/** Detailed security assessment for an extracted item */
export interface SecurityAssessment {
  /** Overall security status */
  status: SecurityStatus;

  /** List of detected threats */
  threats: ThreatInfo[];

  /** Risk score from 0 (safe) to 100 (dangerous) */
  riskScore: number;

  /** Timestamp when the check was performed */
  scannedAt?: Date;
}

// =============================================================================
// Dimensions
// =============================================================================

/** Dimensions of a media item */
export interface MediaDimensions {
  width: number | null;
  height: number | null;
}

/** Dimension filter configuration */
export interface DimensionFilter {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  minAspectRatio?: number;
  maxAspectRatio?: number;
}

// =============================================================================
// Extracted Media Item
// =============================================================================

/** Core extracted media item with optional user-defined metadata */
export interface ExtractedMedia<TMeta = unknown> {
  /** Unique identifier for this extraction */
  id: string;

  /** URL of the media resource */
  url: string;

  /** File object if this came from a file drop/paste */
  file?: File;

  /** Where this item was extracted from */
  source: MediaSource;

  /** Type of media (image, video, etc.) */
  mediaType: MediaType;

  /** Suggested filename for the item */
  filename?: string;

  /** MIME type if known */
  mimeType?: string;

  /** File size in bytes if known */
  fileSize?: number;

  /** Dimensions if known */
  dimensions?: MediaDimensions;

  /** Security assessment results */
  security: SecurityAssessment;

  /** When this item was extracted */
  extractedAt: Date;

  /** User-defined metadata */
  metadata?: TMeta;
}

// =============================================================================
// Extraction Results
// =============================================================================

/** Statistics from an extraction operation */
export interface ExtractionStats {
  /** Total URLs processed */
  urlsProcessed: number;

  /** Number of items successfully extracted */
  itemsExtracted: number;

  /** Number of items filtered out */
  itemsFiltered: number;

  /** Number of invalid URLs encountered */
  invalidUrls: number;

  /** Number of URLs blocked by security */
  blockedUrls: number;

  /** Number of URLs quarantined */
  quarantinedUrls: number;

  /** Time taken for extraction in milliseconds */
  extractionTimeMs: number;
}

/** Result container for extraction operations */
export interface ExtractionResult<TMeta = unknown> {
  /** Extracted items */
  items: ExtractedMedia<TMeta>[];

  /** Extraction statistics */
  stats: ExtractionStats;
}

// =============================================================================
// Configuration Types
// =============================================================================

/** Threat detection configuration */
export interface ThreatDetectionConfig {
  /** Detect unicode lookalike domains (default: true) */
  homographAttacks?: boolean;

  /** Flag suspicious TLDs (default: true) */
  suspiciousTlds?: boolean;

  /** Additional TLDs to flag */
  suspiciousTldList?: string[];

  /** Detect URL obfuscation (default: true) */
  obfuscatedUrls?: boolean;

  /** Detect 1x1 tracking pixels (default: true) */
  trackingPixels?: boolean;

  /** Detect data in URL params (default: true) */
  dataExfiltration?: boolean;

  /** Detect script injection attempts (default: true) */
  scriptInjection?: boolean;
}

/** URL validation configuration */
export interface ValidationConfig {
  /** Block http:// URLs (default: false) */
  requireHttps?: boolean;

  /** Allow data: URLs (default: false for security) */
  allowDataUrls?: boolean;

  /** Allow blob: URLs (default: true) */
  allowBlobUrls?: boolean;

  /** Allow private IP ranges (default: false) */
  allowPrivateIps?: boolean;

  /** Allow localhost (default: false) */
  allowLocalhost?: boolean;

  /** Maximum URL length (default: 8192) */
  maxUrlLength?: number;

  /** Maximum query parameters (default: 50) */
  maxQueryParams?: number;

  /** Maximum redirects in URL (default: 3) */
  maxRedirects?: number;

  /** Maximum encoding ratio (default: 0.3) */
  maxEncodingRatio?: number;
}

/** Security configuration */
export interface SecurityConfig {
  /** Security mode: strict, balanced, permissive, disabled */
  mode?: SecurityMode;

  /** Threat detection settings */
  threatDetection?: ThreatDetectionConfig;

  /** URL validation rules */
  validation?: ValidationConfig;

  /** Blocked domains (e.g., ['evil.com', '*.malware.net']) */
  blockedDomains?: string[];

  /** Blocked IP addresses or CIDR ranges */
  blockedIps?: string[];

  /** Blocked URL patterns */
  blockedPatterns?: string[];

  /** Allow private IP addresses */
  allowPrivateIps?: boolean;

  /** Allow data: URLs */
  allowDataUrls?: boolean;

  /** Strip tracking parameters from URLs */
  stripTracking?: boolean;
}

/** Main extractor configuration */
export interface ExtractorConfig {
  /** Media types to extract (default: all) */
  mediaTypes?: MediaType[];

  /** Confidence threshold for type detection (0-1, default: 0.5) */
  confidenceThreshold?: number;

  /** Security configuration */
  security?: SecurityConfig;

  /** Filter configuration (uses FilterConfig from filters module) */
  filters?: Record<string, unknown>;

  /** Extract dimensions from media */
  extractDimensions?: boolean;

  /** Extract additional metadata */
  extractMetadata?: boolean;

  /** Follow embedded URLs in wrapper URLs */
  followEmbeddedUrls?: boolean;

  /** Maximum items to extract */
  maxItems?: number;

  /** Maximum depth for nested extraction */
  maxDepth?: number;

  /** Enable deduplication */
  deduplication?: boolean;
}

// =============================================================================
// Default Values
// =============================================================================

/** Default security assessment for unchecked items */
export const DEFAULT_SECURITY_ASSESSMENT: SecurityAssessment = {
  status: 'unchecked',
  threats: [],
  riskScore: 0,
};

/** Default severity weights for risk score calculation */
export const SEVERITY_WEIGHTS: Record<ThreatSeverity, number> = {
  critical: 40,
  high: 25,
  medium: 15,
  low: 5,
};

/** Default severity for each threat type */
export const DEFAULT_THREAT_SEVERITY: Partial<Record<ThreatType, ThreatSeverity>> = {
  'known-malware': 'critical',
  phishing: 'critical',
  'script-injection': 'critical',
  'blocked-domain': 'high',
  'blocked-ip': 'high',
  'blocked-pattern': 'high',
  'data-exfil': 'high',
  homograph: 'medium',
  'suspicious-redirect': 'medium',
  'obfuscated-url': 'medium',
  'private-ip': 'medium',
  'suspicious-tld': 'low',
  'tracking-pixel': 'low',
  'excessive-params': 'low',
  custom: 'medium',
};
