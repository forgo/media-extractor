# @forgo/media-extractor

[![npm version](https://img.shields.io/npm/v/@forgo/media-extractor.svg)](https://www.npmjs.com/package/@forgo/media-extractor)
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

## Quick Start

```bash
npm install @forgo/media-extractor
```

### Extract from a URL

```typescript
import { extractFromUrl } from '@forgo/media-extractor';

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

### Extract from HTML

```typescript
import { extractFromHtml } from '@forgo/media-extractor';

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

### Extract from Drag & Drop

```typescript
import { extractFromDataTransfer } from '@forgo/media-extractor';

element.addEventListener('drop', (e) => {
  const result = extractFromDataTransfer(e.dataTransfer);

  result.items.forEach(item => {
    console.log(`Dropped: ${item.filename} (${item.mediaType})`);
  });
});
```

---

## Core Concepts

### Media Types

Every extracted item is classified into one of five types:

| Type | Formats | Platforms |
|------|---------|-----------|
| `image` | JPEG, PNG, GIF, WebP, SVG, AVIF, HEIC... | Imgur, Unsplash, CDNs |
| `video` | MP4, WebM, MKV, AVI, MOV, HLS, DASH... | YouTube, Vimeo, Twitch, TikTok |
| `audio` | MP3, WAV, FLAC, AAC, OGG, Opus... | Spotify, SoundCloud, Bandcamp |
| `document` | PDF, DOCX, XLSX, PPTX, TXT... | — |
| `unknown` | Unrecognized formats | — |

### Extraction Result

Every extraction returns a consistent result object:

```typescript
interface ExtractionResult {
  items: ExtractedMedia[];  // Extracted media items
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
  id: string;                    // Unique identifier
  url: string;                   // Resource URL
  mediaType: MediaType;          // 'image' | 'video' | 'audio' | 'document' | 'unknown'
  source: MediaSource;           // Where it came from
  filename?: string;             // Suggested filename
  mimeType?: string;             // MIME type
  dimensions?: { width, height }; // For images/videos
  security: SecurityAssessment;  // Threat analysis
  extractedAt: Date;             // Timestamp
}
```

---

## Extraction Methods

### From URLs

```typescript
import { extractFromUrl, createExtractor } from '@forgo/media-extractor';

// Quick extraction
const result = extractFromUrl('https://example.com/video.mp4');

// Multiple URLs
const extractor = createExtractor();
const result = extractor.fromUrls([
  'https://example.com/a.jpg',
  'https://example.com/b.png',
  'https://example.com/c.mp4',
]);
```

### From HTML

Extracts from `<img>`, `<video>`, `<audio>`, `<source>`, `<a>`, `<link>`, background images, and srcset:

```typescript
import { extractFromHtml } from '@forgo/media-extractor';

const result = extractFromHtml(html, 'https://base-url.com');
```

### From DOM Elements

```typescript
import { extractFromElement, createExtractor } from '@forgo/media-extractor';

// Single element
const result = extractFromElement(document.querySelector('img'));

// Full document
const extractor = createExtractor();
const result = extractor.fromDocument();
```

### From Clipboard & Drag-Drop

```typescript
import { extractFromClipboard, extractFromDataTransfer } from '@forgo/media-extractor';

// Paste event
document.addEventListener('paste', (e) => {
  const result = extractFromClipboard(e.clipboardData);
});

// Drop event
element.addEventListener('drop', (e) => {
  const result = extractFromDataTransfer(e.dataTransfer);
});
```

### From Files

```typescript
import { createExtractor } from '@forgo/media-extractor';

const extractor = createExtractor();

// File input
input.addEventListener('change', (e) => {
  const result = extractor.fromFiles(e.target.files);
});
```

---

## Configuration

### Basic Configuration

```typescript
import { createExtractor } from '@forgo/media-extractor';

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

```typescript
import { createSecureExtractor } from '@forgo/media-extractor';

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

```typescript
import { createFilteredExtractor } from '@forgo/media-extractor';

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
    dedupe: 'smart',  // 'simple' | 'normalized' | 'smart'
  },
});
```

---

## Security

### Threat Detection

The library detects 18 types of threats:

| Category | Threats |
|----------|---------|
| **Phishing** | Homograph attacks (Cyrillic lookalikes), suspicious TLDs |
| **Injection** | `javascript:`, `data:`, `vbscript:` protocols |
| **Tracking** | Tracking pixels, analytics parameters |
| **Exfiltration** | High-entropy query strings |
| **Obfuscation** | Excessive encoding, URL shorteners |
| **Network** | Private IPs, blocked domains/patterns |

### Security Assessment

Every extracted item includes a security assessment:

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

| Preset | Description |
|--------|-------------|
| `strict` | Block suspicious URLs, require HTTPS, no private IPs |
| `balanced` | Quarantine suspicious, allow HTTP, warn on threats |
| `permissive` | Allow most URLs, only block known malicious |

```typescript
import { createSecureExtractor } from '@forgo/media-extractor';

const strict = createSecureExtractor('strict');
const balanced = createSecureExtractor('balanced');
const permissive = createSecureExtractor('permissive');
```

### Sanitization

```typescript
import { sanitizeUrl, sanitizeFilename } from '@forgo/media-extractor/security';

// Remove dangerous URL components
const safeUrl = sanitizeUrl('https://example.com/path?utm_source=ads');
// 'https://example.com/path'

// Safe filesystem names
const safeFilename = sanitizeFilename('../../../etc/passwd');
// 'etc-passwd'
```

---

## Filtering

### Dimension Filters

```typescript
import { filterByDimensions } from '@forgo/media-extractor/filters';

const filtered = filterByDimensions(items, {
  minWidth: 100,
  minHeight: 100,
  maxWidth: 4000,
  maxHeight: 4000,
  minAspectRatio: 0.5,  // Avoid too tall
  maxAspectRatio: 2.0,  // Avoid too wide
});
```

### Pattern Filters

```typescript
import { filterByPatterns } from '@forgo/media-extractor/filters';

const filtered = filterByPatterns(items, {
  include: [/photos/, /images/],
  exclude: [/thumb/, /icon/, /sprite/, /avatar/],
});
```

### Deduplication

```typescript
import { deduplicate } from '@forgo/media-extractor/filters';

// Simple: exact URL match
const unique = deduplicate(items, 'simple');

// Normalized: ignores query params, protocol
const unique = deduplicate(items, 'normalized');

// Smart: keeps highest quality variant
const unique = deduplicate(items, 'smart');
```

### Filter Presets

| Preset | Description |
|--------|-------------|
| `none` | No filtering |
| `basic` | Remove tiny images, deduplicate |
| `standard` | Remove small images, filter tracking/ads, dedupe |
| `strict` | Larger minimums, smart dedupe, safe-only |
| `photos` | Optimized for photo galleries |
| `videos` | Video content only |
| `documents` | Documents only |

---

## Detection

### Check Media Type

```typescript
import { detectMediaType, isImage, isVideo } from '@forgo/media-extractor/detectors';

const detection = detectMediaType('https://youtube.com/watch?v=abc123');
// { type: 'video', confidence: 0.95 }

if (isImage(url)) {
  // Handle image
}

if (isVideo(url)) {
  // Handle video
}
```

### Group by Type

```typescript
import { groupByMediaType } from '@forgo/media-extractor/detectors';

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

Attach custom data to extracted items:

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

```typescript
const extractor = createExtractor()
  .configure({ mediaTypes: ['image'] })
  .configure({ security: { mode: 'strict' } })
  .configure({ filters: { dedupe: true } });
```

### Batch Extraction

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

For tree-shaking, import specific modules:

```typescript
// Detectors only
import { detectMediaType, isImage } from '@forgo/media-extractor/detectors';

// Parsers only
import { parseHtml, parseDom } from '@forgo/media-extractor/parsers';

// Security only
import { SecurityScanner, validateUrl } from '@forgo/media-extractor/security';

// Filters only
import { applyFilters, deduplicate } from '@forgo/media-extractor/filters';

// Utils only
import { isAbsoluteUrl, getExtension } from '@forgo/media-extractor/utils';
```

---

## API Reference

### Factory Functions

| Function | Description |
|----------|-------------|
| `createExtractor(config?)` | Create a configured extractor instance |
| `createSecureExtractor(preset)` | Create with security preset |
| `createFilteredExtractor(preset)` | Create with filter preset |

### Quick Functions

| Function | Description |
|----------|-------------|
| `extractFromUrl(url)` | Extract from a single URL |
| `extractFromHtml(html, baseUrl?)` | Extract from HTML string |
| `extractFromElement(element)` | Extract from DOM element |
| `extractFromDataTransfer(dt)` | Extract from drag/drop |
| `extractFromClipboard(data)` | Extract from paste |
| `extractFromFiles(files)` | Extract from File objects |

### MediaExtractor Methods

| Method | Description |
|--------|-------------|
| `fromUrl(url)` | Extract from URL |
| `fromUrls(urls)` | Extract from multiple URLs |
| `fromHtml(html, baseUrl?)` | Extract from HTML |
| `fromElement(element)` | Extract from DOM element |
| `fromDocument(doc?)` | Extract from document |
| `fromDataTransfer(dt)` | Extract from DataTransfer |
| `fromClipboard(data)` | Extract from clipboard |
| `fromFiles(files)` | Extract from files |
| `extract(source)` | Auto-detect source type |
| `extractAll(sources)` | Batch with deduplication |
| `configure(updates)` | Update configuration |
| `getConfig()` | Get current config |
| `getSecurityScanner()` | Get security scanner |

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
