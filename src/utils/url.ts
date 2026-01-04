/**
 * URL utilities for the Media Extractor library
 *
 * Provides functions for URL parsing, normalization, validation,
 * and extraction of components like domains and query parameters.
 */

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Check if a string is an absolute URL (starts with http:// or https://)
 */
export function isAbsoluteUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return /^https?:\/\//i.test(url);
}

/**
 * Check if a string is a valid data URL
 */
export function isDataUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('data:');
}

/**
 * Check if a string is a valid blob URL
 */
export function isBlobUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('blob:');
}

/**
 * Check if a URL uses HTTPS
 */
export function isHttps(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.toLowerCase().startsWith('https://');
}

/**
 * Check if a URL uses HTTP (non-secure)
 */
export function isHttp(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  return url.toLowerCase().startsWith('http://');
}

/**
 * Check if a URL is a javascript: URL (XSS risk)
 */
export function isJavascriptUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  // Normalize and check for javascript: protocol
  const normalized = url.trim().toLowerCase().replace(/\s+/g, '');
  return normalized.startsWith('javascript:');
}

// =============================================================================
// URL Parsing
// =============================================================================

/**
 * Safely parse a URL string into a URL object
 * Returns null if parsing fails
 */
export function parseUrl(url: string): URL | null {
  if (!url || typeof url !== 'string') return null;

  try {
    // Handle data URLs specially - they're valid but URL parsing may fail
    if (isDataUrl(url)) {
      return new URL(url);
    }

    // Handle blob URLs
    if (isBlobUrl(url)) {
      return new URL(url);
    }

    // Regular URLs
    return new URL(url);
  } catch {
    return null;
  }
}

/**
 * Extract the domain/hostname from a URL
 * Returns empty string if extraction fails
 */
export function extractDomain(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return '';

  // Data URLs don't have a domain
  if (isDataUrl(url)) return '';

  return parsed.hostname.toLowerCase();
}

/**
 * Extract the top-level domain (TLD) from a URL
 * e.g., 'www.example.co.uk' -> 'co.uk' or 'example.com' -> 'com'
 */
export function extractTld(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';

  // Simple extraction - get last part(s) after the domain name
  const parts = domain.split('.');
  if (parts.length < 2) return domain;

  // Handle known two-part TLDs
  const twoPartTlds = ['co.uk', 'com.au', 'co.jp', 'co.nz', 'com.br', 'org.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo)) {
    return lastTwo;
  }

  return parts[parts.length - 1] ?? domain;
}

/**
 * Extract the registered domain (domain + TLD) from a URL
 * e.g., 'www.example.com' -> 'example.com'
 */
export function extractRegisteredDomain(url: string): string {
  const domain = extractDomain(url);
  if (!domain) return '';

  const parts = domain.split('.');
  if (parts.length < 2) return domain;

  // Handle known two-part TLDs
  const twoPartTlds = ['co.uk', 'com.au', 'co.jp', 'co.nz', 'com.br', 'org.uk'];
  const lastTwo = parts.slice(-2).join('.');
  if (twoPartTlds.includes(lastTwo) && parts.length > 2) {
    return parts.slice(-3).join('.');
  }

  return parts.slice(-2).join('.');
}

/**
 * Extract the path from a URL
 */
export function extractPath(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return '';

  return parsed.pathname;
}

/**
 * Extract query string from a URL (without the leading ?)
 */
export function extractQueryString(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return '';

  return parsed.search.slice(1); // Remove leading ?
}

/**
 * Parse query parameters from a URL into a Map
 */
export function parseQueryParams(url: string): Map<string, string> {
  const parsed = parseUrl(url);
  if (!parsed) return new Map();

  const params = new Map<string, string>();
  parsed.searchParams.forEach((value, key) => {
    params.set(key, value);
  });

  return params;
}

/**
 * Count the number of query parameters in a URL
 */
export function countQueryParams(url: string): number {
  const parsed = parseUrl(url);
  if (!parsed) return 0;

  let count = 0;
  parsed.searchParams.forEach(() => count++);
  return count;
}

// =============================================================================
// URL Normalization
// =============================================================================

/**
 * Normalize a URL for comparison
 * - Lowercase protocol and hostname
 * - Remove trailing slashes
 * - Sort query parameters
 * - Remove default ports
 */
export function normalizeUrl(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  // Handle data/blob URLs - just return as-is
  if (isDataUrl(url) || isBlobUrl(url)) {
    return url;
  }

  try {
    // Normalize protocol (lowercase)
    let normalized = parsed.protocol.toLowerCase() + '//';

    // Add auth if present
    if (parsed.username) {
      normalized += parsed.username;
      if (parsed.password) {
        normalized += ':' + parsed.password;
      }
      normalized += '@';
    }

    // Add hostname (lowercase)
    normalized += parsed.hostname.toLowerCase();

    // Add port only if non-default
    const isDefaultPort =
      (parsed.protocol === 'http:' && parsed.port === '80') ||
      (parsed.protocol === 'https:' && parsed.port === '443') ||
      !parsed.port;

    if (!isDefaultPort) {
      normalized += ':' + parsed.port;
    }

    // Add path (remove trailing slash unless root)
    let path = parsed.pathname;
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    normalized += path;

    // Sort and add query params
    const sortedParams = new URLSearchParams();
    const entries = Array.from(parsed.searchParams.entries());
    entries.sort((a, b) => a[0].localeCompare(b[0]));
    entries.forEach(([key, value]) => {
      sortedParams.append(key, value);
    });

    const queryString = sortedParams.toString();
    if (queryString) {
      normalized += '?' + queryString;
    }

    // Add hash
    if (parsed.hash) {
      normalized += parsed.hash;
    }

    return normalized;
  } catch {
    return url;
  }
}

/**
 * Get a deduplication key from a URL
 * Strips protocol and query params for comparison
 */
export function getDedupeKey(url: string): string {
  const parsed = parseUrl(url);
  if (!parsed) return url;

  // For data URLs, use the whole URL (they should be unique)
  if (isDataUrl(url)) {
    return url;
  }

  // For blob URLs, use the whole URL
  if (isBlobUrl(url)) {
    return url;
  }

  // Return hostname + pathname (no protocol, query, or hash)
  return parsed.hostname.toLowerCase() + parsed.pathname;
}

// =============================================================================
// IP Address Detection
// =============================================================================

/** Private/reserved IP ranges in CIDR notation */
const PRIVATE_IP_RANGES = [
  { start: 0x0a000000, end: 0x0affffff }, // 10.0.0.0/8
  { start: 0xac100000, end: 0xac1fffff }, // 172.16.0.0/12
  { start: 0xc0a80000, end: 0xc0a8ffff }, // 192.168.0.0/16
  { start: 0x7f000000, end: 0x7fffffff }, // 127.0.0.0/8 (loopback)
  { start: 0xa9fe0000, end: 0xa9feffff }, // 169.254.0.0/16 (link-local)
  { start: 0x00000000, end: 0x00ffffff }, // 0.0.0.0/8
  { start: 0x64400000, end: 0x647fffff }, // 100.64.0.0/10 (carrier-grade NAT)
  { start: 0xc0000000, end: 0xc00000ff }, // 192.0.0.0/24
  { start: 0xc0000200, end: 0xc00002ff }, // 192.0.2.0/24 (TEST-NET-1)
  { start: 0xc6336400, end: 0xc63364ff }, // 198.51.100.0/24 (TEST-NET-2)
  { start: 0xcb007100, end: 0xcb0071ff }, // 203.0.113.0/24 (TEST-NET-3)
  { start: 0xe0000000, end: 0xefffffff }, // 224.0.0.0/4 (multicast)
  { start: 0xf0000000, end: 0xffffffff }, // 240.0.0.0/4 (reserved) + broadcast
];

/**
 * Parse an IPv4 address string to a 32-bit integer
 */
function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.');
  if (parts.length !== 4) return null;

  let result = 0;
  for (const part of parts) {
    const num = parseInt(part, 10);
    if (isNaN(num) || num < 0 || num > 255) return null;
    result = (result << 8) | num;
  }

  return result >>> 0; // Convert to unsigned
}

/**
 * Check if a string is a valid IPv4 address
 */
export function isIpv4Address(str: string): boolean {
  return ipv4ToInt(str) !== null;
}

/**
 * Check if an IP address is in a private/reserved range
 */
export function isPrivateIp(ip: string): boolean {
  const ipInt = ipv4ToInt(ip);
  if (ipInt === null) return false;

  return PRIVATE_IP_RANGES.some((range) => ipInt >= range.start && ipInt <= range.end);
}

/**
 * Check if a hostname is localhost
 */
export function isLocalhost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower === '127.0.0.1' ||
    lower === '[::1]' ||
    lower === '::1' ||
    lower.endsWith('.localhost')
  );
}

/**
 * Check if a URL points to a private/local address
 */
export function isPrivateUrl(url: string): boolean {
  const domain = extractDomain(url);
  if (!domain) return false;

  // Check for localhost
  if (isLocalhost(domain)) return true;

  // Check for private IP
  if (isIpv4Address(domain) && isPrivateIp(domain)) return true;

  return false;
}

// =============================================================================
// URL Encoding/Decoding
// =============================================================================

/**
 * Safely decode a URI component
 * Returns original string if decoding fails
 */
export function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch {
    return str;
  }
}

/**
 * Safely decode a full URI
 * Returns original string if decoding fails
 */
export function safeDecodeURI(str: string): string {
  try {
    return decodeURI(str);
  } catch {
    return str;
  }
}

/**
 * Count the number of URL-encoded characters in a string
 */
export function countEncodedChars(str: string): number {
  const matches = str.match(/%[0-9A-Fa-f]{2}/g);
  return matches ? matches.length : 0;
}

/**
 * Check if a URL appears to be excessively encoded (possible obfuscation)
 */
export function isExcessivelyEncoded(url: string): boolean {
  const encodedCount = countEncodedChars(url);
  const urlLength = url.length;

  // If more than 30% of the URL is encoded characters (each %XX = 3 chars)
  // that's suspicious
  const encodedLength = encodedCount * 3;
  return encodedLength / urlLength > 0.3;
}

// =============================================================================
// Embedded URL Extraction
// =============================================================================

/** Common query parameter names that contain embedded URLs */
const EMBEDDED_URL_PARAMS = [
  'url',
  'src',
  'image',
  'img',
  'imgurl',
  'mediaurl',
  'iai',
  'orig',
  'original',
  'source',
  'ref',
  'target',
];

/**
 * Extract an embedded URL from a wrapper URL (e.g., Google Images)
 * Returns null if no embedded URL is found
 */
export function extractEmbeddedUrl(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  // Check each known parameter
  for (const param of EMBEDDED_URL_PARAMS) {
    const value = parsed.searchParams.get(param);
    if (value && isAbsoluteUrl(value)) {
      return value;
    }
    // Also check URL-decoded value
    if (value) {
      const decoded = safeDecodeURIComponent(value);
      if (decoded !== value && isAbsoluteUrl(decoded)) {
        return decoded;
      }
    }
  }

  return null;
}

// =============================================================================
// URL Shortener Detection
// =============================================================================

/** Known URL shortener domains */
const URL_SHORTENERS = new Set([
  'bit.ly',
  'bitly.com',
  't.co',
  'goo.gl',
  'tinyurl.com',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'adf.ly',
  'j.mp',
  'tr.im',
  'cli.gs',
  'short.to',
  'budurl.com',
  'ping.fm',
  'post.ly',
  'just.as',
  'bkite.com',
  'snipr.com',
  'fic.kr',
  'loopt.us',
  'doiop.com',
  'short.ie',
  'kl.am',
  'wp.me',
  'rubyurl.com',
  'om.ly',
  'to.ly',
  'bit.do',
  'lnkd.in',
  'db.tt',
  'qr.ae',
  'cur.lv',
  'ity.im',
  'q.gs',
  'po.st',
  'bc.vc',
  'twitthis.com',
  'u.teleportd.com',
  'dead.net',
  'j.mp',
  'bzfd.it',
  'waa.ai',
  'tiny.pl',
  'amzn.to',
  'youtu.be',
  'rb.gy',
  'cutt.ly',
  'rebrand.ly',
]);

/**
 * Check if a URL is from a known URL shortener
 */
export function isUrlShortener(url: string): boolean {
  const domain = extractRegisteredDomain(url);
  return URL_SHORTENERS.has(domain.toLowerCase());
}

// =============================================================================
// Redirect Detection
// =============================================================================

/**
 * Count potential redirects in a URL (embedded URLs in query params)
 */
export function countRedirects(url: string): number {
  let count = 0;
  let currentUrl = url;

  // Prevent infinite loops
  const maxIterations = 10;
  for (let i = 0; i < maxIterations; i++) {
    const embedded = extractEmbeddedUrl(currentUrl);
    if (!embedded || embedded === currentUrl) break;
    count++;
    currentUrl = embedded;
  }

  return count;
}
