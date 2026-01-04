# @elliott.software/media-extractor

[![npm version](https://img.shields.io/npm/v/@elliott.software/media-extractor.svg)](https://www.npmjs.com/package/@elliott.software/media-extractor)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Zero-dependency TypeScript library for extracting, detecting, and validating media from any source

Extract images, videos, audio, and documents from URLs, HTML, DOM elements, drag-and-drop events, clipboard, and files—with built-in security scanning and smart filtering.

## Why media-extractor?

- **Zero Dependencies** — Pure TypeScript, no external packages
- **Universal Extraction** — URLs, HTML, DOM, drag-drop, clipboard, files
- **Smart Detection** — 100+ formats, platform-aware (YouTube, Vimeo, Spotify...)
- **Security First** — Threat detection, URL validation, XSS prevention
- **Flexible Filtering** — Dimensions, patterns, deduplication
- **Type Safe** — Full TypeScript with generics support

---

## Installation

```bash
npm install @elliott.software/media-extractor
```

```bash
pnpm add @elliott.software/media-extractor
```

```bash
yarn add @elliott.software/media-extractor
```

### Compatibility

| Environment | Support                                                         |
| ----------- | --------------------------------------------------------------- |
| Node.js 20+ | URL parsing, detection, validation, security scanning           |
| Browser     | Full support including DOM, clipboard, and drag-drop extraction |

> **Note:** Functions that parse live DOM elements (`extractFromElement`, `extractFromHtml`, `parseDom`) require browser APIs. URL-based detection, validation, and security features work in both environments.

---

## Quick Start

### Extract from a URL

When you have direct media URLs and want to validate them, detect their type, and get structured metadata:

```typescript
import { extractFromUrl } from '@elliott.software/media-extractor';

const result = extractFromUrl('https://example.com/photo.jpg');

console.log(result.items[0]);
// {
//   id: 'abc123',
//   url: 'https://example.com/photo.jpg',
//   mediaType: 'image',
//   filename: 'photo.jpg',
//   security: { status: 'safe', threats: [], riskScore: 0 }
// }
```

### Extract from HTML (Browser)

When building a scraper, content importer, or need to find all media in an HTML string:

```typescript
import { extractFromHtml } from '@elliott.software/media-extractor';

const html = `
  <img src="hero.jpg" srcset="hero-2x.jpg 2x">
  <video src="intro.mp4"></video>
  <div style="background-image: url(bg.png)"></div>
`;

const result = extractFromHtml(html, 'https://example.com');

console.log(result.items.length); // 4 items extracted
console.log(result.stats);
// { urlsProcessed: 4, itemsExtracted: 4, extractionTimeMs: 2 }
```

### Extract from Drag & Drop (Browser)

When building interactive UIs where users drop images, files, or links:

```typescript
import { extractFromDataTransfer } from '@elliott.software/media-extractor';

element.addEventListener('drop', (e) => {
  const result = extractFromDataTransfer(e.dataTransfer);

  result.items.forEach((item) => {
    console.log(`Dropped: ${item.filename} (${item.mediaType})`);
  });
});
```

---

## Core Concepts

### Media Types

Every extracted item is classified into one of five types:

| Type       | Formats                                  | Platforms                      |
| ---------- | ---------------------------------------- | ------------------------------ |
| `image`    | JPEG, PNG, GIF, WebP, SVG, AVIF, HEIC... | Imgur, Unsplash, CDNs          |
| `video`    | MP4, WebM, MKV, AVI, MOV, HLS, DASH...   | YouTube, Vimeo, Twitch, TikTok |
| `audio`    | MP3, WAV, FLAC, AAC, OGG, Opus...        | Spotify, SoundCloud, Bandcamp  |
| `document` | PDF, DOCX, XLSX, PPTX, TXT...            | —                              |
| `unknown`  | Unrecognized formats                     | —                              |

### Extraction Result

Every extraction returns a consistent result object:

```typescript
interface ExtractionResult {
  items: ExtractedMedia[]; // Extracted media items
  stats: {
    urlsProcessed: number;
    itemsExtracted: number;
    itemsFiltered: number;
    invalidUrls: number;
    blockedUrls: number;
    extractionTimeMs: number;
  };
}
```

### Extracted Media

Each item contains full context about the extracted media:

```typescript
interface ExtractedMedia {
  id: string; // Unique identifier
  url: string; // Resource URL
  mediaType: MediaType; // 'image' | 'video' | 'audio' | 'document' | 'unknown'
  source: MediaSource; // Where it came from
  filename?: string; // Suggested filename
  mimeType?: string; // MIME type
  dimensions?: { width; height }; // For images/videos
  security: SecurityAssessment; // Threat analysis
  extractedAt: Date; // Timestamp
}
```

---

## Extraction Methods

### From URLs

Best for: processing known media URLs, validating user-submitted links, or building download queues.

```typescript
import { extractFromUrl, createExtractor } from '@elliott.software/media-extractor';

// Quick extraction
const result = extractFromUrl('https://example.com/video.mp4');

// Multiple URLs with deduplication
const extractor = createExtractor();
const result = extractor.fromUrls([
  'https://example.com/a.jpg',
  'https://example.com/b.png',
  'https://example.com/c.mp4',
]);
```

### From HTML (Browser)

Best for: content importers, article scrapers, or extracting media from saved web pages.

Extracts from `<img>`, `<video>`, `<audio>`, `<source>`, `<a>`, `<link>`, background images, and srcset:

```typescript
import { extractFromHtml } from '@elliott.software/media-extractor';

const result = extractFromHtml(html, 'https://base-url.com');
```

### From DOM Elements (Browser)

Best for: browser extensions, bookmarklets, or web apps that analyze the current page.

```typescript
import { extractFromElement, createExtractor } from '@elliott.software/media-extractor';

// Single element
const result = extractFromElement(document.querySelector('img'));

// Full document
const extractor = createExtractor();
const result = extractor.fromDocument();
```

### From Clipboard & Drag-Drop (Browser)

Best for: media upload interfaces, image editors, or content management tools.

```typescript
import { extractFromClipboard, extractFromDataTransfer } from '@elliott.software/media-extractor';

// Paste event
document.addEventListener('paste', (e) => {
  const result = extractFromClipboard(e.clipboardData);
});

// Drop event
element.addEventListener('drop', (e) => {
  const result = extractFromDataTransfer(e.dataTransfer);
});
```

### From Files (Browser)

Best for: file upload handlers, media library imports, or batch processing user uploads.

```typescript
import { createExtractor } from '@elliott.software/media-extractor';

const extractor = createExtractor();

// File input
input.addEventListener('change', (e) => {
  const result = extractor.fromFiles(e.target.files);
});
```

---

## Configuration

### Basic Configuration

Tune extraction behavior to match your use case—filter by type, set quality thresholds, or limit results:

```typescript
import { createExtractor } from '@elliott.software/media-extractor';

const extractor = createExtractor({
  // Filter by media type
  mediaTypes: ['image', 'video'],

  // Minimum detection confidence (0-1)
  confidenceThreshold: 0.7,

  // Extract dimensions when possible
  extractDimensions: true,

  // Remove duplicates
  deduplication: true,

  // Limit results
  maxItems: 100,
});
```

### Security Configuration

Control how aggressively to scan and block potentially dangerous URLs:

```typescript
import { createSecureExtractor } from '@elliott.software/media-extractor';

// Use a preset
const extractor = createSecureExtractor('strict');

// Or customize
const extractor = createExtractor({
  security: {
    mode: 'balanced',
    blockedDomains: ['malware.com', '*.suspicious.net'],
    blockedPatterns: [/tracking/, /analytics/],
    allowPrivateIps: false,
    allowDataUrls: true,
    stripTracking: true,
  },
});
```

### Filter Configuration

Remove unwanted media based on dimensions, URL patterns, or duplicates:

```typescript
import { createFilteredExtractor } from '@elliott.software/media-extractor';

// Use a preset
const extractor = createFilteredExtractor('photos');

// Or customize
const extractor = createExtractor({
  filters: {
    dimensions: {
      minWidth: 200,
      minHeight: 200,
      maxAspectRatio: 3,
    },
    patterns: {
      exclude: [/thumb/, /icon/, /avatar/],
    },
    dedupe: 'smart', // 'simple' | 'normalized' | 'smart'
  },
});
```

---

## Security

### Threat Detection

The library protects against common web security threats that can appear in media URLs:

| Category         | Threats                                                  |
| ---------------- | -------------------------------------------------------- |
| **Phishing**     | Homograph attacks (Cyrillic lookalikes), suspicious TLDs |
| **Injection**    | `javascript:`, `data:`, `vbscript:` protocols            |
| **Tracking**     | Tracking pixels, analytics parameters                    |
| **Exfiltration** | High-entropy query strings                               |
| **Obfuscation**  | Excessive encoding, URL shorteners                       |
| **Network**      | Private IPs, blocked domains/patterns                    |

### Security Assessment

Every extracted item includes a security assessment so you can decide how to handle it:

```typescript
const result = extractFromUrl('https://example.com/image.jpg');

console.log(result.items[0].security);
// {
//   status: 'safe',        // 'safe' | 'quarantined' | 'blocked'
//   threats: [],           // Detected threats
//   riskScore: 0,          // 0-100
//   scannedAt: Date
// }
```

### Security Presets

Choose a security level based on your trust requirements:

| Preset       | Description                                          |
| ------------ | ---------------------------------------------------- |
| `strict`     | Block suspicious URLs, require HTTPS, no private IPs |
| `balanced`   | Quarantine suspicious, allow HTTP, warn on threats   |
| `permissive` | Allow most URLs, only block known malicious          |

```typescript
import { createSecureExtractor } from '@elliott.software/media-extractor';

const strict = createSecureExtractor('strict');
const balanced = createSecureExtractor('balanced');
const permissive = createSecureExtractor('permissive');
```

### Sanitization

Clean URLs and filenames before using them in your application:

```typescript
import { sanitizeUrl, sanitizeFilename } from '@elliott.software/media-extractor/security';

// Remove tracking parameters and dangerous components
const safeUrl = sanitizeUrl('https://example.com/path?utm_source=ads');
// 'https://example.com/path'

// Create safe filesystem names from untrusted input
const safeFilename = sanitizeFilename('../../../etc/passwd');
// 'etc-passwd'
```

---

## Filtering

### Dimension Filters

Remove images that are too small (icons, spacers) or too large for your use case:

```typescript
import { filterByDimensions } from '@elliott.software/media-extractor/filters';

const filtered = filterByDimensions(items, {
  minWidth: 100,
  minHeight: 100,
  maxWidth: 4000,
  maxHeight: 4000,
  minAspectRatio: 0.5, // Avoid too tall
  maxAspectRatio: 2.0, // Avoid too wide
});
```

### Pattern Filters

Include or exclude media based on URL patterns—useful for filtering out thumbnails, avatars, or tracking pixels:

```typescript
import { filterByPatterns } from '@elliott.software/media-extractor/filters';

const filtered = filterByPatterns(items, {
  include: [/photos/, /images/],
  exclude: [/thumb/, /icon/, /sprite/, /avatar/],
});
```

### Deduplication

Remove duplicate media, with different strategies depending on your needs:

```typescript
import { deduplicate } from '@elliott.software/media-extractor/filters';

// Simple: exact URL match
const unique = deduplicate(items, 'simple');

// Normalized: ignores query params, protocol
const unique = deduplicate(items, 'normalized');

// Smart: detects size variants, keeps highest quality
const unique = deduplicate(items, 'smart');
```

### Filter Presets

Common filter configurations for specific use cases:

| Preset      | Description                                      |
| ----------- | ------------------------------------------------ |
| `none`      | No filtering                                     |
| `basic`     | Remove tiny images, deduplicate                  |
| `standard`  | Remove small images, filter tracking/ads, dedupe |
| `strict`    | Larger minimums, smart dedupe, safe-only         |
| `photos`    | Optimized for photo galleries                    |
| `videos`    | Video content only                               |
| `documents` | Documents only                                   |

---

## Detection

### Check Media Type

Determine what type of media a URL points to, without downloading it:

```typescript
import {
  detectMediaType,
  isImageUrl,
  isVideoUrl,
} from '@elliott.software/media-extractor/detectors';

const detection = detectMediaType('https://youtube.com/watch?v=abc123');
// { type: 'video', confidence: 0.95 }

if (isImageUrl(url)) {
  // Handle image
}

if (isVideoUrl(url)) {
  // Handle video
}
```

### Group by Type

Organize extracted media by type for separate handling:

```typescript
import { groupByMediaType } from '@elliott.software/media-extractor/detectors';

const groups = groupByMediaType(items);
// {
//   image: [...],
//   video: [...],
//   audio: [...],
//   document: [...],
//   unknown: [...]
// }
```

---

## Advanced Usage

### Custom Metadata

Attach your own data to extracted items using TypeScript generics:

```typescript
interface MyMetadata {
  category: string;
  tags: string[];
}

const extractor = createExtractor<MyMetadata>();

const result = extractor.fromUrl('https://example.com/photo.jpg');

// Add metadata later
result.items[0].metadata = {
  category: 'landscape',
  tags: ['nature', 'mountain'],
};
```

### Chaining Configuration

Build up configuration incrementally:

```typescript
const extractor = createExtractor()
  .configure({ mediaTypes: ['image'] })
  .configure({ security: { mode: 'strict' } })
  .configure({ filters: { dedupe: true } });
```

### Batch Extraction

Process multiple sources at once with automatic deduplication across all of them:

```typescript
const extractor = createExtractor({ deduplication: true });

const result = extractor.extractAll([
  'https://example.com/a.jpg',
  '<img src="b.jpg">',
  document.querySelector('img'),
]);

// Automatically deduplicates across all sources
```

---

## Submodule Imports

Import specific modules for smaller bundle sizes:

```typescript
// Detectors only
import { detectMediaType, isImageUrl } from '@elliott.software/media-extractor/detectors';

// Parsers only (browser)
import { parseHtml, parseDom } from '@elliott.software/media-extractor/parsers';

// Security only
import { SecurityScanner, validateUrl } from '@elliott.software/media-extractor/security';

// Filters only
import { applyFilters, deduplicate } from '@elliott.software/media-extractor/filters';

// Utils only
import { isAbsoluteUrl, extractExtension } from '@elliott.software/media-extractor/utils';
```

---

## API Reference

### Factory Functions

| Function                          | Description                            |
| --------------------------------- | -------------------------------------- |
| `createExtractor(config?)`        | Create a configured extractor instance |
| `createSecureExtractor(preset)`   | Create with security preset            |
| `createFilteredExtractor(preset)` | Create with filter preset              |

### Quick Functions

| Function                          | Environment | Description               |
| --------------------------------- | ----------- | ------------------------- |
| `extractFromUrl(url)`             | Any         | Extract from a single URL |
| `extractFromHtml(html, baseUrl?)` | Browser     | Extract from HTML string  |
| `extractFromElement(element)`     | Browser     | Extract from DOM element  |
| `extractFromDataTransfer(dt)`     | Browser     | Extract from drag/drop    |
| `extractFromClipboard(data)`      | Browser     | Extract from paste        |
| `extractFromFiles(files)`         | Browser     | Extract from File objects |

### MediaExtractor Methods

| Method                     | Description                |
| -------------------------- | -------------------------- |
| `fromUrl(url)`             | Extract from URL           |
| `fromUrls(urls)`           | Extract from multiple URLs |
| `fromHtml(html, baseUrl?)` | Extract from HTML          |
| `fromElement(element)`     | Extract from DOM element   |
| `fromDocument(doc?)`       | Extract from document      |
| `fromDataTransfer(dt)`     | Extract from DataTransfer  |
| `fromClipboard(data)`      | Extract from clipboard     |
| `fromFiles(files)`         | Extract from files         |
| `extract(source)`          | Auto-detect source type    |
| `extractAll(sources)`      | Batch with deduplication   |
| `configure(updates)`       | Update configuration       |
| `getConfig()`              | Get current config         |
| `getSecurityScanner()`     | Get security scanner       |

---

## Browser Support

- Chrome 88+
- Firefox 78+
- Safari 14+
- Edge 88+

---

## License

MIT

---

## Contributing

Contributions welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to get started.
