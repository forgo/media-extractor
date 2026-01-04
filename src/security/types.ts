/**
 * Security types module
 *
 * Re-exports security-related types from the main types module
 * and adds security-specific helper types.
 */

// Re-export from main types
export type {
  SecurityStatus,
  SecurityMode,
  ThreatType,
  ThreatSeverity,
  ThreatInfo,
  SecurityAssessment,
  SecurityConfig,
  ThreatDetectionConfig,
  ValidationConfig,
} from '../types';

export { DEFAULT_SECURITY_ASSESSMENT, SEVERITY_WEIGHTS, DEFAULT_THREAT_SEVERITY } from '../types';

/**
 * Result of a URL validation check
 */
export interface ValidationResult {
  /** Whether the URL passed validation */
  isValid: boolean;

  /** Threats detected during validation */
  threats: import('../types').ThreatInfo[];

  /** Normalized URL (if valid) */
  normalizedUrl?: string;
}

/** Built-in blocklist categories */
export interface BuiltInBlocklists {
  /** Known malware domains */
  malware?: boolean;
  /** Known phishing domains */
  phishing?: boolean;
  /** Known trackers */
  tracking?: boolean;
  /** Ad networks */
  ads?: boolean;
  /** Cryptomining scripts */
  cryptominers?: boolean;
}

/**
 * Blocklist configuration for BlocklistManager
 */
export interface BlocklistConfig {
  /** Built-in lists to enable */
  builtIn?: BuiltInBlocklists;

  /** Domains to block */
  domains?: string[];

  /** IP addresses or CIDR ranges to block */
  ips?: string[];

  /** IP ranges to block (CIDR notation) */
  ipRanges?: string[];

  /** URL patterns to block */
  patterns?: string[];

  /** URL patterns to block (alias for patterns) */
  urlPatterns?: (string | RegExp)[];
}

/**
 * Result of a blocklist check
 */
export interface BlocklistCheckResult {
  /** Whether the URL is blocked */
  blocked: boolean;

  /** Which list(s) matched */
  matchedLists: string[];

  /** Specific pattern that matched */
  matchedPattern?: string;
}

/**
 * Result of a threat detection scan
 */
export interface ThreatScanResult {
  /** Threats detected */
  threats: import('../types').ThreatInfo[];

  /** Overall risk score (0-100) */
  riskScore: number;

  /** Time taken for scan in milliseconds */
  scanTimeMs: number;
}

/**
 * Security check names for tracking
 */
export type SecurityCheckName =
  | 'url-protocol'
  | 'url-length'
  | 'private-ip'
  | 'localhost'
  | 'blocklist-domain'
  | 'blocklist-ip'
  | 'allowlist'
  | 'homograph'
  | 'obfuscation'
  | 'script-injection'
  | 'tracking-pixel'
  | 'data-exfiltration'
  | 'suspicious-tld'
  | 'redirect-chain'
  | 'query-params'
  | 'custom-validator';

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: import('../types').SecurityConfig = {
  mode: 'balanced',
  threatDetection: {
    homographAttacks: true,
    suspiciousTlds: true,
    obfuscatedUrls: true,
    trackingPixels: true,
    dataExfiltration: true,
    scriptInjection: true,
  },
  validation: {
    requireHttps: false,
    allowDataUrls: false,
    allowBlobUrls: true,
    allowPrivateIps: false,
    allowLocalhost: false,
    maxUrlLength: 8192,
    maxQueryParams: 50,
    maxRedirects: 3,
    maxEncodingRatio: 0.3,
  },
  blockedDomains: [],
  blockedIps: [],
  blockedPatterns: [],
  allowPrivateIps: false,
  allowDataUrls: false,
  stripTracking: true,
};

/**
 * Security presets for common use cases
 */
export const SECURITY_PRESETS = {
  /**
   * Maximum security - strict blocking, all checks enabled
   */
  paranoid: {
    mode: 'strict' as const,
    threatDetection: {
      homographAttacks: true,
      suspiciousTlds: true,
      obfuscatedUrls: true,
      trackingPixels: true,
      dataExfiltration: true,
      scriptInjection: true,
    },
    validation: {
      requireHttps: true,
      allowDataUrls: false,
      allowBlobUrls: true,
      allowPrivateIps: false,
      allowLocalhost: false,
      maxUrlLength: 2048,
      maxQueryParams: 20,
      maxRedirects: 1,
      maxEncodingRatio: 0.2,
    },
    allowPrivateIps: false,
    allowDataUrls: false,
    stripTracking: true,
  },

  /**
   * Balanced - quarantine suspicious items, common checks
   */
  balanced: {
    mode: 'balanced' as const,
    threatDetection: {
      homographAttacks: true,
      suspiciousTlds: true,
      obfuscatedUrls: true,
      trackingPixels: true,
      dataExfiltration: true,
      scriptInjection: true,
    },
    validation: {
      requireHttps: false,
      allowDataUrls: false,
      allowBlobUrls: true,
      allowPrivateIps: false,
      allowLocalhost: false,
      maxUrlLength: 8192,
      maxQueryParams: 50,
      maxRedirects: 3,
      maxEncodingRatio: 0.3,
    },
    allowPrivateIps: false,
    allowDataUrls: false,
    stripTracking: true,
  },

  /**
   * Minimal - basic checks only, permissive mode
   */
  minimal: {
    mode: 'permissive' as const,
    threatDetection: {
      homographAttacks: true,
      suspiciousTlds: false,
      obfuscatedUrls: false,
      trackingPixels: false,
      dataExfiltration: false,
      scriptInjection: true,
    },
    validation: {
      requireHttps: false,
      allowDataUrls: true,
      allowBlobUrls: true,
      allowPrivateIps: true,
      allowLocalhost: true,
      maxUrlLength: 16384,
      maxQueryParams: 100,
      maxRedirects: 5,
      maxEncodingRatio: 0.5,
    },
    allowPrivateIps: true,
    allowDataUrls: true,
    stripTracking: false,
  },

  /**
   * Disabled - no security checks
   */
  disabled: {
    mode: 'disabled' as const,
  },
} as const;
