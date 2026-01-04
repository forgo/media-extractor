# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-01-03

### Added

- Initial release of @elliott.software/media-extractor
- **Core Extraction**
  - `MediaExtractor` class with configurable extraction pipeline
  - `createExtractor()`, `createSecureExtractor()`, `createFilteredExtractor()` factory functions
  - Quick extraction functions: `extractFromUrl()`, `extractFromHtml()`, `extractFromElement()`, `extractFromDataTransfer()`, `extractFromClipboard()`, `extractFromFiles()`
- **Media Detection** (`/detectors`)
  - Support for 100+ media formats across images, video, audio, and documents
  - Platform-aware detection for YouTube, Vimeo, Twitch, TikTok, Spotify, SoundCloud, and more
  - Confidence-based detection with configurable thresholds
  - Helper functions: `detectMediaType()`, `isImage()`, `isVideo()`, `isAudio()`, `isDocument()`, `groupByMediaType()`
- **Parsers** (`/parsers`)
  - HTML parser with support for `<img>`, `<video>`, `<audio>`, `<source>`, `<picture>`, srcset, and background images
  - DOM parser with shadow DOM and iframe traversal options
  - DataTransfer/Clipboard parser for drag-drop and paste events
  - URL parser with embedded URL extraction
- **Security** (`/security`)
  - `SecurityScanner` with 18 threat detection types
  - Threat categories: phishing, script injection, tracking pixels, data exfiltration, obfuscation, private IPs
  - Security presets: `strict`, `balanced`, `permissive`
  - `BlocklistManager` for domain and pattern blocking
  - Sanitization utilities: `sanitizeUrl()`, `sanitizeFilename()`, `sanitizeHtml()`
  - URL validation with configurable checks
- **Filters** (`/filters`)
  - Dimension filtering with min/max width, height, and aspect ratio
  - Pattern filtering with include/exclude regex support
  - Deduplication modes: `simple`, `normalized`, `smart`
  - Filter presets: `none`, `basic`, `standard`, `strict`, `photos`, `videos`, `documents`
- **Utilities** (`/utils`)
  - URL utilities: parsing, normalization, domain extraction, encoding detection
  - Filename utilities: extraction, sanitization, path traversal prevention
  - MIME type utilities: detection, mapping, magic byte detection
- **TypeScript Support**
  - Full type definitions for all public APIs
  - Generic metadata support on `ExtractedMedia<T>`
  - Comprehensive type exports
- **Testing**
  - 876 tests with 97%+ line coverage
  - Tests for all modules: detectors, parsers, filters, security, utils

[unreleased]: https://github.com/forgo/media-extractor/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/forgo/media-extractor/releases/tag/v0.1.0
