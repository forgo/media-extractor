/**
 * Security module index
 *
 * Provides the SecurityScanner class and re-exports all security utilities.
 */

import type {
  SecurityConfig,
  SecurityAssessment,
  ThreatInfo,
  ThreatType,
  ThreatSeverity,
  MediaDimensions,
} from '../types';
import { extractDomain, isPrivateUrl } from '../utils/url';
import { validateUrl, type ValidationResult } from './validator';
import { BlocklistManager } from './blocklists';
import { detectThreats, detectScriptInjection } from './threat-detector';
import { sanitizeUrl, sanitizeFilename, sanitizeHtml } from './sanitizer';
import { DEFAULT_SECURITY_CONFIG, SECURITY_PRESETS, type BlocklistConfig } from './types';

// Re-export all security modules
export * from './types';
export * from './validator';
export * from './blocklists';
export * from './threat-detector';
export * from './sanitizer';

// =============================================================================
// Severity Weights for Risk Scoring
// =============================================================================

/**
 * Severity to numeric weight mapping for risk calculation
 */
const SEVERITY_WEIGHTS: Record<ThreatSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

/**
 * Threat type base weights (some threats are inherently more severe)
 */
const THREAT_TYPE_MULTIPLIERS: Partial<Record<ThreatType, number>> = {
  'script-injection': 1.5, // XSS is critical
  'blocked-domain': 1.3, // Known bad actors
  'blocked-ip': 1.3,
  'data-exfil': 1.2, // Data theft
  'homograph': 1.1, // Phishing
};

// =============================================================================
// SecurityScanner Class
// =============================================================================

/**
 * SecurityScanner provides comprehensive URL and content security analysis.
 *
 * Features:
 * - URL validation (protocol, length, encoding, etc.)
 * - Blocklist checking (domains, IPs)
 * - Threat detection (homograph, XSS, tracking, exfiltration)
 * - Risk scoring (0-100)
 * - Content sanitization
 *
 * @example
 * ```typescript
 * const scanner = new SecurityScanner({
 *   mode: 'balanced',
 *   blockedDomains: ['malware.com'],
 * });
 *
 * const assessment = scanner.scan('https://example.com/image.jpg');
 * if (assessment.status === 'safe') {
 *   // Use the URL
 * } else if (assessment.status === 'quarantined') {
 *   // Show warning to user
 * } else if (assessment.status === 'blocked') {
 *   // Reject the URL
 * }
 * ```
 */
export class SecurityScanner {
  private config: SecurityConfig;
  private blocklistManager: BlocklistManager;

  constructor(config: Partial<SecurityConfig> = {}) {
    // Merge with defaults
    this.config = {
      ...DEFAULT_SECURITY_CONFIG,
      ...config,
      threatDetection: {
        ...DEFAULT_SECURITY_CONFIG.threatDetection,
        ...config.threatDetection,
      },
      validation: {
        ...DEFAULT_SECURITY_CONFIG.validation,
        ...config.validation,
      },
    };

    // Initialize blocklist manager
    const blocklistConfig: BlocklistConfig = {};
    if (this.config.blockedDomains) blocklistConfig.domains = this.config.blockedDomains;
    if (this.config.blockedIps) blocklistConfig.ips = this.config.blockedIps;
    if (this.config.blockedPatterns) blocklistConfig.patterns = this.config.blockedPatterns;
    this.blocklistManager = new BlocklistManager(blocklistConfig);
  }

  /**
   * Create a scanner from a preset
   */
  static fromPreset(preset: keyof typeof SECURITY_PRESETS): SecurityScanner {
    return new SecurityScanner(SECURITY_PRESETS[preset]);
  }

  /**
   * Perform a comprehensive security scan on a URL
   *
   * @param url - The URL to scan
   * @param options - Additional scan options
   * @returns SecurityAssessment with status, threats, and risk score
   */
  scan(
    url: string,
    options: {
      /** Media dimensions for tracking pixel detection */
      dimensions?: MediaDimensions;
      /** Skip validation (already validated) */
      skipValidation?: boolean;
      /** Skip blocklist check */
      skipBlocklist?: boolean;
      /** Skip threat detection */
      skipThreats?: boolean;
    } = {}
  ): SecurityAssessment {
    const threats: ThreatInfo[] = [];

    // Handle disabled mode
    if (this.config.mode === 'disabled') {
      return {
        status: 'unchecked',
        threats: [],
        riskScore: 0,
        scannedAt: new Date(),
      };
    }

    // Step 1: URL Validation
    if (!options.skipValidation) {
      const validationResult = this.validateUrl(url);
      threats.push(...validationResult.threats);

      // If validation fails critically, block immediately in strict mode
      if (!validationResult.isValid && this.config.mode === 'strict') {
        return this.createAssessment(threats, 'blocked');
      }
    }

    // Step 2: Blocklist Check
    if (!options.skipBlocklist) {
      const blocklistThreat = this.checkBlocklists(url);
      if (blocklistThreat) {
        threats.push(blocklistThreat);

        // Blocklist hits are always blocked
        if (this.config.mode === 'strict' || this.config.mode === 'balanced') {
          return this.createAssessment(threats, 'blocked');
        }
      }
    }

    // Step 3: Threat Detection
    if (!options.skipThreats && this.config.threatDetection) {
      const detectedThreats = detectThreats(
        url,
        this.config.threatDetection,
        options.dimensions
      );
      threats.push(...detectedThreats);
    }

    // Calculate risk and determine status
    return this.createAssessment(threats);
  }

  /**
   * Batch scan multiple URLs
   */
  scanBatch(
    urls: string[],
    options: Parameters<SecurityScanner['scan']>[1] = {}
  ): Map<string, SecurityAssessment> {
    const results = new Map<string, SecurityAssessment>();

    for (const url of urls) {
      results.set(url, this.scan(url, options));
    }

    return results;
  }

  /**
   * Quick check if a URL should be blocked
   */
  isBlocked(url: string): boolean {
    if (this.config.mode === 'disabled') return false;

    // Check blocklists first (fast path)
    if (this.blocklistManager.isBlocked(url)) {
      return true;
    }

    // Check for critical threats
    const scriptThreat = detectScriptInjection(url);
    if (scriptThreat && this.config.mode !== 'permissive') {
      return true;
    }

    return false;
  }

  /**
   * Quick check if a URL is likely safe
   */
  isSafe(url: string): boolean {
    const assessment = this.scan(url);
    return assessment.status === 'safe';
  }

  /**
   * Validate URL structure and security
   */
  validateUrl(url: string): ValidationResult {
    return validateUrl(url, this.config.validation);
  }

  /**
   * Check URL against blocklists
   */
  checkBlocklists(url: string): ThreatInfo | null {
    const domain = extractDomain(url);

    // Check domain blocklist
    if (this.blocklistManager.isBlocked(url)) {
      return {
        type: 'blocked-domain',
        severity: 'critical',
        description: `Domain is on blocklist: ${domain}`,
        matchedPattern: domain,
        recommendation: 'This domain has been flagged as potentially dangerous',
      };
    }

    // Check if URL is targeting a private IP
    if (isPrivateUrl(url) && !this.config.allowPrivateIps) {
      return {
        type: 'blocked-ip',
        severity: 'high',
        description: 'URL targets a private/local IP address',
        matchedPattern: domain,
        recommendation: 'Private IP addresses may be used for server-side request forgery',
      };
    }

    return null;
  }

  /**
   * Sanitize a URL for safe usage
   */
  sanitizeUrl(url: string): string | null {
    const opts: Parameters<typeof sanitizeUrl>[1] = {
      allowJavascriptUrls: false, // Never allow
      stripTracking: this.config.stripTracking ?? true,
      maxLength: this.config.validation?.maxUrlLength ?? 8192,
    };
    if (this.config.allowDataUrls !== undefined) opts.allowDataUrls = this.config.allowDataUrls;
    return sanitizeUrl(url, opts);
  }

  /**
   * Sanitize a filename for safe file system usage
   */
  sanitizeFilename(filename: string): string {
    return sanitizeFilename(filename);
  }

  /**
   * Sanitize HTML content
   */
  sanitizeHtml(html: string): string {
    return sanitizeHtml(html);
  }

  /**
   * Get the current configuration
   */
  getConfig(): SecurityConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<SecurityConfig>): void {
    this.config = {
      ...this.config,
      ...updates,
      threatDetection: {
        ...this.config.threatDetection,
        ...updates.threatDetection,
      },
      validation: {
        ...this.config.validation,
        ...updates.validation,
      },
    };

    // Rebuild blocklist manager if blocklists changed
    if (updates.blockedDomains || updates.blockedIps || updates.blockedPatterns) {
      this.rebuildBlocklistManager();
    }
  }

  /**
   * Add domains to blocklist
   */
  addBlockedDomains(domains: string[]): void {
    this.config.blockedDomains = [
      ...(this.config.blockedDomains || []),
      ...domains,
    ];
    this.rebuildBlocklistManager();
  }

  /**
   * Add IPs to blocklist
   */
  addBlockedIps(ips: string[]): void {
    this.config.blockedIps = [
      ...(this.config.blockedIps || []),
      ...ips,
    ];
    this.rebuildBlocklistManager();
  }

  /**
   * Add patterns to blocklist
   */
  addBlockedPatterns(patterns: string[]): void {
    this.config.blockedPatterns = [
      ...(this.config.blockedPatterns || []),
      ...patterns,
    ];
    this.rebuildBlocklistManager();
  }

  /**
   * Rebuild blocklist manager with current config
   */
  private rebuildBlocklistManager(): void {
    const blocklistConfig: BlocklistConfig = {};
    if (this.config.blockedDomains) blocklistConfig.domains = this.config.blockedDomains;
    if (this.config.blockedIps) blocklistConfig.ips = this.config.blockedIps;
    if (this.config.blockedPatterns) blocklistConfig.patterns = this.config.blockedPatterns;
    this.blocklistManager = new BlocklistManager(blocklistConfig);
  }

  // =============================================================================
  // Private Methods
  // =============================================================================

  /**
   * Calculate risk score from threats
   */
  private calculateRiskScore(threats: ThreatInfo[]): number {
    if (threats.length === 0) return 0;

    let totalScore = 0;

    for (const threat of threats) {
      const baseWeight = SEVERITY_WEIGHTS[threat.severity];
      const multiplier = THREAT_TYPE_MULTIPLIERS[threat.type] ?? 1;
      totalScore += baseWeight * multiplier;
    }

    // Normalize to 0-100 range
    // Multiple threats compound but we cap at 100
    return Math.min(100, Math.round(totalScore));
  }

  /**
   * Determine security status from risk score and threats
   */
  private determineStatus(
    threats: ThreatInfo[],
    riskScore: number
  ): SecurityAssessment['status'] {
    // No threats = safe
    if (threats.length === 0) {
      return 'safe';
    }

    // Check for critical threats
    const hasCritical = threats.some((t) => t.severity === 'critical');
    const hasHigh = threats.some((t) => t.severity === 'high');

    switch (this.config.mode) {
      case 'strict':
        // Block anything with threats
        if (hasCritical || hasHigh) {
          return 'blocked';
        }
        if (riskScore > 25) {
          return 'blocked';
        }
        return 'quarantined';

      case 'balanced':
        // Block critical, quarantine others
        if (hasCritical) {
          return 'blocked';
        }
        if (hasHigh || riskScore > 50) {
          return 'blocked';
        }
        if (riskScore > 25) {
          return 'quarantined';
        }
        return 'safe';

      case 'permissive':
        // Only block critical threats
        if (hasCritical && riskScore > 75) {
          return 'blocked';
        }
        if (hasHigh) {
          return 'quarantined';
        }
        return 'safe';

      default:
        // Conservative default
        if (hasCritical || hasHigh) {
          return 'blocked';
        }
        return riskScore > 50 ? 'quarantined' : 'safe';
    }
  }

  /**
   * Create a SecurityAssessment object
   */
  private createAssessment(
    threats: ThreatInfo[],
    forcedStatus?: SecurityAssessment['status']
  ): SecurityAssessment {
    const riskScore = this.calculateRiskScore(threats);
    const status = forcedStatus ?? this.determineStatus(threats, riskScore);

    return {
      status,
      threats,
      riskScore,
      scannedAt: new Date(),
    };
  }
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Create a default security scanner
 */
let defaultScanner: SecurityScanner | null = null;

function getDefaultScanner(): SecurityScanner {
  if (!defaultScanner) {
    defaultScanner = new SecurityScanner();
  }
  return defaultScanner;
}

/**
 * Quick security scan with default settings
 */
export function quickScan(url: string): SecurityAssessment {
  return getDefaultScanner().scan(url);
}

/**
 * Quick check if URL is blocked with default settings
 */
export function isUrlBlocked(url: string): boolean {
  return getDefaultScanner().isBlocked(url);
}

/**
 * Quick check if URL is safe with default settings
 */
export function isUrlSafe(url: string): boolean {
  return getDefaultScanner().isSafe(url);
}

/**
 * Sanitize URL with default settings
 */
export function sanitize(url: string): string | null {
  return getDefaultScanner().sanitizeUrl(url);
}
