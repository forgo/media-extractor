/**
 * Threat Detector module
 *
 * Detects various URL-based threats including homograph attacks,
 * obfuscation, script injection, tracking pixels, and data exfiltration.
 */

import type { ThreatInfo, ThreatDetectionConfig, MediaDimensions } from '../types';
import {
  parseUrl,
  extractDomain,
  extractTld,
  safeDecodeURIComponent,
  countEncodedChars,
  isUrlShortener,
} from '../utils/url';
import { isSuspiciousTld } from './blocklists';

// =============================================================================
// Homograph Attack Detection
// =============================================================================

/**
 * Unicode characters that look like ASCII letters
 * Maps confusable character to its ASCII equivalent
 */
const CONFUSABLES: Record<string, string> = {
  // Cyrillic
  '\u0430': 'a', // а
  '\u0435': 'e', // е
  '\u043E': 'o', // о
  '\u0440': 'p', // р
  '\u0441': 'c', // с
  '\u0443': 'y', // у
  '\u0445': 'x', // х
  '\u0456': 'i', // і
  '\u0458': 'j', // ј
  '\u0455': 's', // ѕ

  // Greek
  '\u03B1': 'a', // α
  '\u03B5': 'e', // ε
  '\u03B9': 'i', // ι
  '\u03BF': 'o', // ο
  '\u03C1': 'p', // ρ
  '\u03C5': 'u', // υ
  '\u03C7': 'x', // χ

  // Other scripts
  '\u0131': 'i', // ı (Turkish dotless i)
  '\u0261': 'g', // ɡ (IPA)
  '\u0251': 'a', // ɑ (IPA)
  '\u0562': 'b', // բ (Armenian)
  '\u0564': 'd', // դ (Armenian)
  '\u0566': 'g', // զ (Armenian)
  '\u0570': 'h', // հ (Armenian)
  '\u0578': 'n', // ո (Armenian)
  '\u0585': 'o', // օ (Armenian)

  // Latin extended
  '\u0101': 'a', // ā
  '\u0113': 'e', // ē
  '\u012B': 'i', // ī
  '\u014D': 'o', // ō
  '\u016B': 'u', // ū
};

/**
 * Check if a string contains non-ASCII characters
 */
function hasNonAscii(str: string): boolean {
  return /[^\x00-\x7F]/.test(str);
}

/**
 * Check if a string contains ASCII letters
 */
function hasAscii(str: string): boolean {
  return /[a-z]/i.test(str);
}

/**
 * Detect homograph attack in a domain
 */
export function detectHomograph(domain: string): ThreatInfo | null {
  if (!domain) return null;

  // Check for mixed scripts (ASCII + non-ASCII)
  if (hasAscii(domain) && hasNonAscii(domain)) {
    // Find which confusable characters are present
    const confusablesFound: string[] = [];
    for (const char of domain) {
      if (CONFUSABLES[char]) {
        confusablesFound.push(`'${char}' looks like '${CONFUSABLES[char]}'`);
      }
    }

    if (confusablesFound.length > 0) {
      return {
        type: 'homograph',
        severity: 'medium',
        description: `Domain contains Unicode characters that look like ASCII: ${confusablesFound.slice(0, 3).join(', ')}`,
        matchedPattern: domain,
        recommendation:
          'This domain may be impersonating a legitimate website using lookalike characters',
      };
    }

    // Mixed scripts even without known confusables is suspicious
    return {
      type: 'homograph',
      severity: 'low',
      description: 'Domain contains mixed ASCII and non-ASCII characters',
      matchedPattern: domain,
      recommendation: 'Mixed-script domains can be used for phishing',
    };
  }

  // Check for punycode (xn--) domains
  if (domain.includes('xn--')) {
    return {
      type: 'homograph',
      severity: 'low',
      description: 'Domain uses Punycode (internationalized domain name)',
      matchedPattern: domain,
      recommendation: 'Punycode domains can be used to create lookalike URLs',
    };
  }

  return null;
}

// =============================================================================
// URL Obfuscation Detection
// =============================================================================

/**
 * Detect various URL obfuscation techniques
 */
export function detectObfuscation(url: string): ThreatInfo[] {
  const threats: ThreatInfo[] = [];

  // Check for excessive URL encoding
  const encodedCount = countEncodedChars(url);
  const encodingRatio = (encodedCount * 3) / url.length;

  if (encodingRatio > 0.3) {
    threats.push({
      type: 'obfuscated-url',
      severity: 'medium',
      description: `URL is heavily encoded (${Math.round(encodingRatio * 100)}% encoded characters)`,
      matchedPattern: `${encodedCount} encoded chars`,
      recommendation: 'Heavily encoded URLs may be hiding malicious content',
    });
  }

  // Check for IP address obfuscation (decimal, hex, octal)
  const parsed = parseUrl(url);
  if (parsed) {
    const host = parsed.hostname;

    // Decimal IP (e.g., 3232235777 for 192.168.1.1)
    if (/^\d{9,10}$/.test(host)) {
      threats.push({
        type: 'obfuscated-url',
        severity: 'high',
        description: 'URL uses decimal IP address obfuscation',
        matchedPattern: host,
        recommendation: 'Decimal IP addresses are often used to hide malicious destinations',
      });
    }

    // Hex IP (e.g., 0xC0A80101 for 192.168.1.1)
    if (/^0x[0-9a-f]{8}$/i.test(host)) {
      threats.push({
        type: 'obfuscated-url',
        severity: 'high',
        description: 'URL uses hexadecimal IP address obfuscation',
        matchedPattern: host,
        recommendation: 'Hex IP addresses are often used to hide malicious destinations',
      });
    }

    // Octal IP (e.g., 0300.0250.0001.0001)
    if (/^0\d+\.0\d+\.0\d+\.0\d+$/.test(host)) {
      threats.push({
        type: 'obfuscated-url',
        severity: 'high',
        description: 'URL uses octal IP address obfuscation',
        matchedPattern: host,
        recommendation: 'Octal IP addresses are often used to hide malicious destinations',
      });
    }
  }

  // Check for double encoding
  const decoded = safeDecodeURIComponent(url);
  if (decoded !== url) {
    const doubleDecoded = safeDecodeURIComponent(decoded);
    if (doubleDecoded !== decoded && doubleDecoded !== url) {
      threats.push({
        type: 'obfuscated-url',
        severity: 'medium',
        description: 'URL uses double encoding',
        recommendation: 'Double-encoded URLs may be bypassing security filters',
      });
    }
  }

  // Check for URL shorteners
  if (isUrlShortener(url)) {
    threats.push({
      type: 'suspicious-redirect',
      severity: 'low',
      description: 'URL uses a URL shortening service',
      matchedPattern: extractDomain(url),
      recommendation: 'URL shorteners hide the actual destination',
    });
  }

  return threats;
}

// =============================================================================
// Script Injection Detection
// =============================================================================

/**
 * XSS patterns to detect in URLs
 * Using bounded patterns to prevent ReDoS
 */
const XSS_PATTERNS = [
  /<script/i,
  /javascript:/i,
  /on[a-z]{1,20}\s{0,10}=/i, // onclick=, onerror=, etc. - bounded
  /data:text\/html/i,
  /vbscript:/i,
  /expression\s{0,10}\(/i, // bounded whitespace
  /url\s{0,10}\(\s{0,10}['"]?\s{0,10}javascript/i, // bounded whitespace
  /<img[^>]{0,500}onerror/i, // bounded attribute length
  /<svg[^>]{0,500}onload/i, // bounded attribute length
  /<iframe/i,
  /<object/i,
  /<embed/i,
];

/**
 * Detect script injection attempts in URL
 */
export function detectScriptInjection(url: string): ThreatInfo | null {
  // Decode URL for analysis
  const decoded = safeDecodeURIComponent(url);

  for (const pattern of XSS_PATTERNS) {
    if (pattern.test(url) || pattern.test(decoded)) {
      return {
        type: 'script-injection',
        severity: 'critical',
        description: 'URL contains potential script injection attempt',
        matchedPattern: pattern.source,
        recommendation: 'Do not use this URL - it may execute malicious code',
      };
    }
  }

  return null;
}

// =============================================================================
// Tracking Pixel Detection
// =============================================================================

/** Maximum URL length to process (prevents ReDoS on malicious input) */
const MAX_URL_LENGTH = 2048;

/**
 * Detect if dimensions suggest a tracking pixel
 */
export function detectTrackingPixel(url: string, dimensions?: MediaDimensions): ThreatInfo | null {
  // Check dimensions
  if (dimensions) {
    const { width, height } = dimensions;
    if (width !== null && height !== null && width <= 1 && height <= 1) {
      return {
        type: 'tracking-pixel',
        severity: 'low',
        description: `Image is a tracking pixel (${width}x${height})`,
        matchedPattern: `${width}x${height}`,
        recommendation: 'This is likely a tracking image, not actual content',
      };
    }
  }

  // Limit URL length to prevent ReDoS attacks
  if (!url || url.length > MAX_URL_LENGTH) return null;

  // Check URL patterns
  const trackingPatterns = [
    /pixel\.gif/i,
    /pixel\.png/i,
    /tracking\.gif/i,
    /beacon\.gif/i,
    /spacer\.gif/i,
    /clear\.gif/i,
    /1x1\.gif/i,
    /transparent\.gif/i,
    /\.gif\?[^#]{0,200}tracking/i, // bounded query string length
    /\/pixel\?/i,
    /\/beacon\?/i,
    /\/track\?/i,
  ];

  for (const pattern of trackingPatterns) {
    if (pattern.test(url)) {
      return {
        type: 'tracking-pixel',
        severity: 'low',
        description: 'URL matches tracking pixel pattern',
        matchedPattern: pattern.source,
        recommendation: 'This is likely a tracking image, not actual content',
      };
    }
  }

  return null;
}

// =============================================================================
// Data Exfiltration Detection
// =============================================================================

/**
 * Suspicious parameter names that might contain exfiltrated data
 */
const SUSPICIOUS_PARAMS = new Set([
  'data',
  'payload',
  'token',
  'session',
  'auth',
  'key',
  'secret',
  'password',
  'pw',
  'pass',
  'user',
  'email',
  'cookie',
  'creds',
  'credentials',
]);

/**
 * Detect potential data exfiltration in URL
 */
export function detectDataExfiltration(url: string): ThreatInfo | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  const issues: string[] = [];

  // Check for very long query string
  if (parsed.search.length > 500) {
    issues.push(`unusually long query string (${parsed.search.length} chars)`);
  }

  // Check for base64-like content in URL
  const base64Pattern = /[A-Za-z0-9+/]{50,}={0,2}/;
  if (base64Pattern.test(url)) {
    issues.push('contains base64-like encoded data');
  }

  // Check for suspicious parameter names
  const suspiciousFound: string[] = [];
  parsed.searchParams.forEach((_, key) => {
    if (SUSPICIOUS_PARAMS.has(key.toLowerCase())) {
      suspiciousFound.push(key);
    }
  });

  if (suspiciousFound.length > 0) {
    issues.push(`suspicious parameters: ${suspiciousFound.join(', ')}`);
  }

  // Check for very long parameter values
  parsed.searchParams.forEach((value, key) => {
    if (value.length > 200) {
      issues.push(`parameter '${key}' has unusually long value`);
    }
  });

  if (issues.length > 0) {
    return {
      type: 'data-exfil',
      severity: issues.length > 1 ? 'high' : 'medium',
      description: `URL may contain exfiltrated data: ${issues.join('; ')}`,
      recommendation: 'This URL may be sending sensitive data to an external server',
    };
  }

  return null;
}

// =============================================================================
// Suspicious TLD Detection
// =============================================================================

/**
 * Detect suspicious TLD
 */
export function detectSuspiciousTld(url: string, additionalTlds?: string[]): ThreatInfo | null {
  if (isSuspiciousTld(url, additionalTlds)) {
    const tld = extractTld(url);
    return {
      type: 'suspicious-tld',
      severity: 'low',
      description: `Domain uses suspicious TLD: .${tld}`,
      matchedPattern: `.${tld}`,
      recommendation: 'This TLD is frequently used for malicious purposes',
    };
  }

  return null;
}

// =============================================================================
// Combined Threat Detection
// =============================================================================

/**
 * Run all threat detection checks on a URL
 */
export function detectThreats(
  url: string,
  config: ThreatDetectionConfig = {},
  dimensions?: MediaDimensions
): ThreatInfo[] {
  const threats: ThreatInfo[] = [];

  const opts: ThreatDetectionConfig = {
    homographAttacks: true,
    suspiciousTlds: true,
    obfuscatedUrls: true,
    trackingPixels: true,
    dataExfiltration: true,
    scriptInjection: true,
    ...config,
  };

  // Script injection (always check - critical)
  if (opts.scriptInjection) {
    const scriptThreat = detectScriptInjection(url);
    if (scriptThreat) threats.push(scriptThreat);
  }

  // Homograph attacks
  if (opts.homographAttacks) {
    const domain = extractDomain(url);
    const homographThreat = detectHomograph(domain);
    if (homographThreat) threats.push(homographThreat);
  }

  // Obfuscation
  if (opts.obfuscatedUrls) {
    threats.push(...detectObfuscation(url));
  }

  // Suspicious TLD
  if (opts.suspiciousTlds) {
    const tldThreat = detectSuspiciousTld(url, opts.suspiciousTldList);
    if (tldThreat) threats.push(tldThreat);
  }

  // Tracking pixels
  if (opts.trackingPixels) {
    const trackingThreat = detectTrackingPixel(url, dimensions);
    if (trackingThreat) threats.push(trackingThreat);
  }

  // Data exfiltration
  if (opts.dataExfiltration) {
    const exfilThreat = detectDataExfiltration(url);
    if (exfilThreat) threats.push(exfilThreat);
  }

  return threats;
}
