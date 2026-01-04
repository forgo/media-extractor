/**
 * Blocklists module
 *
 * Built-in blocklists for known malicious domains, phishing sites,
 * trackers, ads, and cryptominers.
 *
 * These are curated subsets from reputable sources to maintain
 * the zero-dependency goal while providing baseline protection.
 */

import type { ThreatInfo, ThreatType } from '../types';
import type { BlocklistConfig } from './types';
import { extractDomain, extractRegisteredDomain, isIpv4Address } from '../utils/url';
import type { BlocklistCheckResult } from './types';

// =============================================================================
// Built-in Blocklists
// =============================================================================

/**
 * Known malware distribution domains
 * Sources: URLhaus, MalwareDomainList (curated subset)
 */
const MALWARE_DOMAINS = new Set([
  // Example entries - in production, this would be a larger curated list
  'malware-distribution.example',
  'dropper.malicious',
]);

/**
 * Known phishing domains
 * Sources: OpenPhish patterns (curated subset)
 */
const PHISHING_DOMAINS = new Set<string>([
  // Patterns that are commonly used in phishing
  // In production, this would be regularly updated
]);

/**
 * Common tracking domains
 * Sources: EasyPrivacy (subset for image/media trackers)
 */
const TRACKING_DOMAINS = new Set([
  'pixel.facebook.com',
  'pixel.admob.com',
  'tracking.pixel',
  'beacon.krxd.net',
  'pixel.quantserve.com',
  'pixel.mathtag.com',
  'secure-gl.imrworldwide.com',
  'b.scorecardresearch.com',
  'pixel.wp.com',
]);

/**
 * Ad network domains
 * Sources: EasyList (subset for image ads)
 */
const AD_DOMAINS = new Set(['ads.example', 'adserver.example']);

/**
 * Cryptominer domains
 */
const CRYPTOMINER_DOMAINS = new Set([
  'coin-hive.com',
  'coinhive.com',
  'jsecoin.com',
  'crypto-loot.com',
  'cryptoloot.pro',
  'minero.cc',
  'webmine.pro',
]);

/**
 * Suspicious TLDs (frequently abused)
 */
const SUSPICIOUS_TLDS = new Set([
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'xyz',
  'top',
  'club',
  'work',
  'date',
  'racing',
  'win',
  'bid',
  'stream',
  'download',
  'loan',
  'men',
  'click',
  'link',
  'trade',
  'party',
  'science',
  'review',
  'country',
  'kim',
  'cricket',
  'webcam',
  'faith',
  'accountant',
]);

// =============================================================================
// Blocklist Manager
// =============================================================================

/**
 * Compiled blocklist for efficient lookups
 */
interface CompiledBlocklist {
  /** Exact domain matches */
  domains: Set<string>;

  /** Wildcard patterns (compiled to regex) */
  wildcards: { pattern: string; regex: RegExp }[];

  /** IP ranges (start, end as integers) */
  ipRanges: { start: number; end: number; pattern: string }[];

  /** URL patterns (compiled regex) */
  urlPatterns: { pattern: string | RegExp; regex: RegExp }[];
}

/**
 * Parse CIDR notation to IP range
 */
function parseCidr(cidr: string): { start: number; end: number } | null {
  const parts = cidr.split('/');
  if (parts.length !== 2) return null;

  const ip = parts[0];
  const prefixStr = parts[1];
  if (!ip || !prefixStr) return null;

  const prefix = parseInt(prefixStr, 10);
  if (isNaN(prefix) || prefix < 0 || prefix > 32) return null;

  const ipParts = ip.split('.');
  if (ipParts.length !== 4) return null;

  let ipInt = 0;
  for (const part of ipParts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    ipInt = (ipInt << 8) | num;
  }
  ipInt = ipInt >>> 0; // Convert to unsigned

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  const start = (ipInt & mask) >>> 0;
  const end = (start | (~mask >>> 0)) >>> 0;

  return { start, end };
}

/**
 * Convert wildcard pattern to regex
 */
function wildcardToRegex(pattern: string): RegExp {
  // Escape special regex chars except *
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
  // Replace * with .*
  const regexStr = '^' + escaped.replace(/\*/g, '.*') + '$';
  return new RegExp(regexStr, 'i');
}

/**
 * Compile blocklist configuration into efficient lookup structure
 */
export function compileBlocklist(config: BlocklistConfig): CompiledBlocklist {
  const compiled: CompiledBlocklist = {
    domains: new Set(),
    wildcards: [],
    ipRanges: [],
    urlPatterns: [],
  };

  // Add built-in lists
  if (config.builtIn?.malware) {
    MALWARE_DOMAINS.forEach((d) => compiled.domains.add(d.toLowerCase()));
  }
  if (config.builtIn?.phishing) {
    PHISHING_DOMAINS.forEach((d) => compiled.domains.add(d.toLowerCase()));
  }
  if (config.builtIn?.tracking) {
    TRACKING_DOMAINS.forEach((d) => compiled.domains.add(d.toLowerCase()));
  }
  if (config.builtIn?.ads) {
    AD_DOMAINS.forEach((d) => compiled.domains.add(d.toLowerCase()));
  }
  if (config.builtIn?.cryptominers) {
    CRYPTOMINER_DOMAINS.forEach((d) => compiled.domains.add(d.toLowerCase()));
  }

  // Add custom domains
  if (config.domains) {
    for (const domain of config.domains) {
      const lower = domain.toLowerCase();
      if (lower.includes('*')) {
        // Wildcard pattern
        compiled.wildcards.push({
          pattern: domain,
          regex: wildcardToRegex(lower),
        });
      } else {
        compiled.domains.add(lower);
      }
    }
  }

  // Add IP ranges
  if (config.ipRanges) {
    for (const range of config.ipRanges) {
      const parsed = parseCidr(range);
      if (parsed) {
        compiled.ipRanges.push({ ...parsed, pattern: range });
      }
    }
  }

  // Add URL patterns
  if (config.urlPatterns) {
    for (const pattern of config.urlPatterns) {
      if (typeof pattern === 'string') {
        compiled.urlPatterns.push({
          pattern,
          regex: new RegExp(pattern, 'i'),
        });
      } else {
        compiled.urlPatterns.push({
          pattern,
          regex: pattern,
        });
      }
    }
  }

  return compiled;
}

/**
 * Check if a domain matches a compiled blocklist
 */
export function checkBlocklist(url: string, blocklist: CompiledBlocklist): BlocklistCheckResult {
  const domain = extractDomain(url).toLowerCase();
  const registeredDomain = extractRegisteredDomain(url).toLowerCase();

  // Check exact domain match
  if (blocklist.domains.has(domain)) {
    return {
      blocked: true,
      matchedLists: ['domain-exact'],
      matchedPattern: domain,
    };
  }

  // Check registered domain
  if (blocklist.domains.has(registeredDomain)) {
    return {
      blocked: true,
      matchedLists: ['domain-registered'],
      matchedPattern: registeredDomain,
    };
  }

  // Check wildcard patterns
  for (const wildcard of blocklist.wildcards) {
    if (wildcard.regex.test(domain)) {
      return {
        blocked: true,
        matchedLists: ['wildcard'],
        matchedPattern: wildcard.pattern,
      };
    }
  }

  // Check IP ranges
  if (isIpv4Address(domain)) {
    const ipParts = domain.split('.');
    let ipInt = 0;
    for (const part of ipParts) {
      ipInt = (ipInt << 8) | parseInt(part, 10);
    }
    ipInt = ipInt >>> 0;

    for (const range of blocklist.ipRanges) {
      if (ipInt >= range.start && ipInt <= range.end) {
        return {
          blocked: true,
          matchedLists: ['ip-range'],
          matchedPattern: range.pattern,
        };
      }
    }
  }

  // Check URL patterns
  for (const urlPattern of blocklist.urlPatterns) {
    if (urlPattern.regex.test(url)) {
      return {
        blocked: true,
        matchedLists: ['url-pattern'],
        matchedPattern: String(urlPattern.pattern),
      };
    }
  }

  return {
    blocked: false,
    matchedLists: [],
  };
}

/**
 * Check if a TLD is suspicious
 */
export function isSuspiciousTld(url: string, additionalTlds?: string[]): boolean {
  const domain = extractDomain(url).toLowerCase();
  const parts = domain.split('.');
  if (parts.length < 2) return false;

  const tld = parts[parts.length - 1];
  if (!tld) return false;

  if (SUSPICIOUS_TLDS.has(tld)) return true;

  if (additionalTlds) {
    for (const additional of additionalTlds) {
      if (tld === additional.toLowerCase()) return true;
    }
  }

  return false;
}

/**
 * Get threat info for blocklist match
 */
export function getBlocklistThreat(result: BlocklistCheckResult, url: string): ThreatInfo | null {
  if (!result.blocked) return null;

  const listType = result.matchedLists[0];
  let threatType: ThreatType = 'blocked-domain';
  let description = 'Domain is on blocklist';

  if (listType === 'ip-range') {
    threatType = 'blocked-ip';
    description = 'IP address is on blocklist';
  }

  const threat: ThreatInfo = {
    type: threatType,
    severity: 'high',
    description: `${description}: ${result.matchedPattern || extractDomain(url)}`,
    recommendation: 'Do not access this URL - it may be malicious',
  };
  if (result.matchedPattern) threat.matchedPattern = result.matchedPattern;
  return threat;
}

/**
 * Create a blocklist manager instance
 */
export class BlocklistManager {
  private compiled: CompiledBlocklist;
  private allowlist: Set<string>;
  private allowlistPatterns: RegExp[];

  constructor(config: BlocklistConfig = {}) {
    this.compiled = compileBlocklist(config);
    this.allowlist = new Set();
    this.allowlistPatterns = [];
  }

  /**
   * Add domains to allowlist
   */
  addToAllowlist(domains: string[]): void {
    for (const domain of domains) {
      this.allowlist.add(domain.toLowerCase());
    }
  }

  /**
   * Add patterns to allowlist
   */
  addPatternsToAllowlist(patterns: (string | RegExp)[]): void {
    for (const pattern of patterns) {
      if (typeof pattern === 'string') {
        this.allowlistPatterns.push(new RegExp(pattern, 'i'));
      } else {
        this.allowlistPatterns.push(pattern);
      }
    }
  }

  /**
   * Check if URL is on allowlist
   */
  isAllowed(url: string): boolean {
    const domain = extractDomain(url).toLowerCase();

    // Check exact domain
    if (this.allowlist.has(domain)) return true;

    // Check registered domain
    const registered = extractRegisteredDomain(url).toLowerCase();
    if (this.allowlist.has(registered)) return true;

    // Check patterns
    for (const pattern of this.allowlistPatterns) {
      if (pattern.test(url) || pattern.test(domain)) return true;
    }

    return false;
  }

  /**
   * Check if URL is blocked
   */
  isBlocked(url: string): BlocklistCheckResult {
    // Allowlist takes precedence
    if (this.isAllowed(url)) {
      return { blocked: false, matchedLists: [] };
    }

    return checkBlocklist(url, this.compiled);
  }

  /**
   * Add domains to blocklist
   */
  addToBlocklist(domains: string[]): void {
    for (const domain of domains) {
      const lower = domain.toLowerCase();
      if (lower.includes('*')) {
        this.compiled.wildcards.push({
          pattern: domain,
          regex: wildcardToRegex(lower),
        });
      } else {
        this.compiled.domains.add(lower);
      }
    }
  }

  /**
   * Remove domains from blocklist
   */
  removeFromBlocklist(domains: string[]): void {
    for (const domain of domains) {
      this.compiled.domains.delete(domain.toLowerCase());
    }
  }

  /**
   * Get statistics about the blocklist
   */
  getStats(): { domains: number; wildcards: number; ipRanges: number; urlPatterns: number } {
    return {
      domains: this.compiled.domains.size,
      wildcards: this.compiled.wildcards.length,
      ipRanges: this.compiled.ipRanges.length,
      urlPatterns: this.compiled.urlPatterns.length,
    };
  }
}
