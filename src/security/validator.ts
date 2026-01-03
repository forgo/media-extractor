/**
 * URL Validator module
 *
 * Validates URLs against security rules like protocol, length,
 * private IPs, and other structural checks.
 */

import type { ThreatInfo, ThreatType, ValidationConfig } from '../types';

// Type alias for backward compatibility
type UrlValidationConfig = ValidationConfig;

export type { ValidationConfig as UrlValidationConfig };
import {
  parseUrl,
  isDataUrl,
  isBlobUrl,
  isHttp,
  isJavascriptUrl,
  isPrivateUrl,
  isLocalhost,
  extractDomain,
  countQueryParams,
  isExcessivelyEncoded,
  countRedirects,
} from '../utils/url';
import type { ValidationResult } from './types';
export type { ValidationResult };

/**
 * Default URL validation configuration
 */
const DEFAULT_CONFIG: UrlValidationConfig = {
  requireHttps: false,
  allowDataUrls: true,
  allowBlobUrls: true,
  allowPrivateIps: false,
  allowLocalhost: false,
  maxUrlLength: 2048,
  maxQueryParams: 50,
  maxRedirects: 3,
};

/**
 * Create a threat info object
 */
function createThreat(
  type: ThreatType,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  recommendation: string,
  matchedPattern?: string
): ThreatInfo {
  const threat: ThreatInfo = {
    type,
    severity,
    description,
    recommendation,
  };
  if (matchedPattern) threat.matchedPattern = matchedPattern;
  return threat;
}

/**
 * Validate URL protocol
 */
export function validateProtocol(url: string, config: UrlValidationConfig = {}): ThreatInfo[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatInfo[] = [];

  // Check for javascript: URLs (always block)
  if (isJavascriptUrl(url)) {
    threats.push(
      createThreat(
        'script-injection',
        'critical',
        'URL contains javascript: protocol which can execute arbitrary code',
        'Do not use this URL - it may execute malicious code',
        'javascript:'
      )
    );
    return threats;
  }

  // Check for data URLs
  if (isDataUrl(url)) {
    if (!opts.allowDataUrls) {
      threats.push(
        createThreat(
          'obfuscated-url',
          'medium',
          'Data URLs are disabled in security configuration',
          'Use regular HTTP/HTTPS URLs instead',
          'data:'
        )
      );
    }
    return threats;
  }

  // Check for blob URLs
  if (isBlobUrl(url)) {
    if (!opts.allowBlobUrls) {
      threats.push(
        createThreat(
          'obfuscated-url',
          'medium',
          'Blob URLs are disabled in security configuration',
          'Use regular HTTP/HTTPS URLs instead',
          'blob:'
        )
      );
    }
    return threats;
  }

  // Check HTTPS requirement
  if (opts.requireHttps && isHttp(url)) {
    threats.push(
      createThreat(
        'suspicious-redirect',
        'low',
        'URL uses insecure HTTP protocol',
        'Use HTTPS URLs for better security',
        'http://'
      )
    );
  }

  return threats;
}

/**
 * Validate URL length
 */
export function validateLength(url: string, config: UrlValidationConfig = {}): ThreatInfo[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatInfo[] = [];

  if (opts.maxUrlLength && url.length > opts.maxUrlLength) {
    threats.push(
      createThreat(
        'excessive-params',
        'medium',
        `URL exceeds maximum length of ${opts.maxUrlLength} characters (${url.length} chars)`,
        'Unusually long URLs may contain hidden data or tracking',
        `length: ${url.length}`
      )
    );
  }

  return threats;
}

/**
 * Validate private IP address
 */
export function validatePrivateIp(url: string, config: UrlValidationConfig = {}): ThreatInfo[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatInfo[] = [];

  if (opts.allowPrivateIps) return threats;

  const domain = extractDomain(url);

  // Check for localhost
  if (!opts.allowLocalhost && isLocalhost(domain)) {
    threats.push(
      createThreat(
        'private-ip',
        'medium',
        'URL points to localhost/loopback address',
        'Local addresses should not be used for external resources',
        domain
      )
    );
    return threats;
  }

  // Check for private IP ranges
  if (isPrivateUrl(url)) {
    threats.push(
      createThreat(
        'private-ip',
        'medium',
        'URL points to a private/internal IP address',
        'Private IP addresses may indicate SSRF attempts or misconfiguration',
        domain
      )
    );
  }

  return threats;
}

/**
 * Validate query parameters
 */
export function validateQueryParams(url: string, config: UrlValidationConfig = {}): ThreatInfo[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatInfo[] = [];

  const paramCount = countQueryParams(url);

  if (opts.maxQueryParams && paramCount > opts.maxQueryParams) {
    threats.push(
      createThreat(
        'excessive-params',
        'low',
        `URL has ${paramCount} query parameters (max: ${opts.maxQueryParams})`,
        'Excessive query parameters may indicate tracking or data exfiltration',
        `params: ${paramCount}`
      )
    );
  }

  return threats;
}

/**
 * Validate URL encoding
 */
export function validateEncoding(url: string): ThreatInfo[] {
  const threats: ThreatInfo[] = [];

  if (isExcessivelyEncoded(url)) {
    threats.push(
      createThreat(
        'obfuscated-url',
        'medium',
        'URL contains excessive URL encoding which may hide malicious content',
        'Heavily encoded URLs may be attempting to bypass security filters',
        'excessive %XX encoding'
      )
    );
  }

  return threats;
}

/**
 * Validate redirect chain length
 */
export function validateRedirects(url: string, config: UrlValidationConfig = {}): ThreatInfo[] {
  const opts = { ...DEFAULT_CONFIG, ...config };
  const threats: ThreatInfo[] = [];

  const redirectCount = countRedirects(url);

  if (opts.maxRedirects && redirectCount > opts.maxRedirects) {
    threats.push(
      createThreat(
        'suspicious-redirect',
        'medium',
        `URL contains ${redirectCount} redirect levels (max: ${opts.maxRedirects})`,
        'Multiple redirects may indicate tracking or phishing attempts',
        `redirects: ${redirectCount}`
      )
    );
  }

  return threats;
}

/**
 * Validate a URL against all validation rules
 */
export function validateUrl(url: string, config: UrlValidationConfig = {}): ValidationResult {
  const threats: ThreatInfo[] = [];

  // Basic validation
  if (!url) {
    return { isValid: false, threats: [] };
  }

  // Parse URL to ensure it's valid
  const parsed = parseUrl(url);
  if (!parsed && !isDataUrl(url) && !isBlobUrl(url)) {
    return { isValid: false, threats: [] };
  }

  // Run all validations
  threats.push(...validateProtocol(url, config));
  threats.push(...validateLength(url, config));
  threats.push(...validatePrivateIp(url, config));
  threats.push(...validateQueryParams(url, config));
  threats.push(...validateEncoding(url));
  threats.push(...validateRedirects(url, config));

  // Check for critical threats
  const hasCritical = threats.some((t) => t.severity === 'critical');

  return {
    isValid: !hasCritical,
    threats,
    normalizedUrl: parsed?.href || url,
  };
}

/**
 * Quick check if URL passes basic validation
 */
export function isValidUrl(url: string, config: UrlValidationConfig = {}): boolean {
  const result = validateUrl(url, config);
  return result.isValid;
}

/**
 * Get list of checks that passed and failed
 */
export function getValidationChecks(
  url: string,
  config: UrlValidationConfig = {}
): { passed: string[]; failed: string[] } {
  const passed: string[] = [];
  const failed: string[] = [];

  // Protocol check
  const protocolThreats = validateProtocol(url, config);
  if (protocolThreats.length === 0) {
    passed.push('url-protocol');
  } else {
    failed.push('url-protocol');
  }

  // Length check
  const lengthThreats = validateLength(url, config);
  if (lengthThreats.length === 0) {
    passed.push('url-length');
  } else {
    failed.push('url-length');
  }

  // Private IP check
  const ipThreats = validatePrivateIp(url, config);
  if (ipThreats.length === 0) {
    passed.push('private-ip');
    passed.push('localhost');
  } else {
    const hasLocalhost = ipThreats.some((t) => t.matchedPattern?.includes('localhost'));
    if (hasLocalhost) {
      failed.push('localhost');
    } else {
      failed.push('private-ip');
    }
  }

  // Query params check
  const paramThreats = validateQueryParams(url, config);
  if (paramThreats.length === 0) {
    passed.push('query-params');
  } else {
    failed.push('query-params');
  }

  // Redirect check
  const redirectThreats = validateRedirects(url, config);
  if (redirectThreats.length === 0) {
    passed.push('redirect-chain');
  } else {
    failed.push('redirect-chain');
  }

  return { passed, failed };
}
