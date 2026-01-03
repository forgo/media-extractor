# Contributing to @forgo/media-extractor

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/forgo/media-extractor.git
   cd media-extractor
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development

### Scripts

| Command                 | Description                 |
| ----------------------- | --------------------------- |
| `npm run build`         | Build the library           |
| `npm run dev`           | Build in watch mode         |
| `npm test`              | Run tests in watch mode     |
| `npm run test:run`      | Run tests once              |
| `npm run test:coverage` | Run tests with coverage     |
| `npm run typecheck`     | Type-check without emitting |
| `npm run lint`          | Lint source files           |

### Project Structure

```
src/
├── detectors/     # Media type detection
├── filters/       # Filtering and deduplication
├── parsers/       # HTML, DOM, URL parsing
├── security/      # Threat detection and sanitization
├── utils/         # Shared utilities
├── __tests__/     # Test files
├── extractor.ts   # Main extractor class
├── types.ts       # Type definitions
└── index.ts       # Public API exports
```

## Making Changes

### Code Style

- Write TypeScript with strict type checking
- Follow existing code patterns and naming conventions
- Keep functions focused and single-purpose
- Add JSDoc comments for public APIs

### Testing

- Add tests for new functionality
- Ensure all existing tests pass: `npm run test:run`
- Aim for good coverage of edge cases

### Commits

- Use clear, descriptive commit messages
- Keep commits focused on a single change
- Reference issue numbers where applicable (e.g., "Fix #123")

## Pull Requests

1. Ensure your branch is up to date with `main`
2. Run the full test suite: `npm run test:run`
3. Run type checking: `npm run typecheck`
4. Push your branch and open a PR
5. Fill out the PR template with:
   - Description of changes
   - Related issue (if any)
   - Testing performed

## Reporting Issues

### Bug Reports

Please include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Environment details (Node version, browser, OS)
- Minimal code example if possible

### Feature Requests

Please include:

- Clear description of the feature
- Use case / motivation
- Example API or usage (if applicable)

## Questions?

Open an issue with the "question" label and we'll be happy to help.
