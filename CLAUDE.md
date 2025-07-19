# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

`paper2llm` is a React-based web application that converts academic PDFs into text-only Markdown files using OCR and vision AI models. The application runs entirely client-side with no backend server, focusing on privacy and security.

## Development Commands

```bash
# Start development server
npm start

# Build for production
npm build

# Run tests (in watch mode)
npm test

# Deploy to GitHub Pages
npm run deploy
```

All commands should be run from the `paper2llm-web/` directory.

## Architecture

### Directory Structure
- `src/web/` - React UI components (App.tsx is the main entry point)
- `src/core/` - Core business logic and services
- `src/adapters/web/` - Browser-specific implementations
- `src/types/` - TypeScript type definitions

### Core Services
1. **PDF to Markdown Service** (`src/core/pdf-to-md.ts`) - Main orchestrator
2. **OCR Service** (`src/core/ocr-service.ts`) - Mistral OCR integration
3. **Image Service** (`src/core/image-service.ts`) - Multi-provider vision AI
4. **Markdown Processor** (`src/core/markdown-processor.ts`) - Post-processing

### Processing Pipeline
1. Input validation (file upload or URL)
2. OCR processing via Mistral API
3. Markdown formatting and normalization
4. Optional image description using vision models
5. Final markdown assembly with BibTeX generation

## Important Considerations

### API Key Security
- The application implements sophisticated client-side API key storage with encryption options
- Keys can be stored in session, local storage, or encrypted storage
- See `src/adapters/web/api-storage/` for implementation details
- Always respect the security documentation in `docs/security/README.md`

### Multi-Provider Support
The application supports multiple AI providers:
- Mistral AI (required for OCR)
- OpenAI
- Google Gemini
- Anthropic

Each provider has its own API key management and service implementation.

### Domain Handlers
Academic repository URLs are handled specially via domain handlers in `src/adapters/web/domain-handlers/`. Supported domains include arXiv, OpenReview, bioRxiv, and others.

### Testing
Currently minimal test coverage with only basic App.test.tsx. Uses Jest with React Testing Library.

**Basic Testing Approach**: Until proper test coverage is implemented, use `npm run build` to verify that the TypeScript code compiles without errors. This ensures type safety and catches most syntax/import issues. After making changes, always run:
```bash
cd paper2llm-web
npm run build
```
If the build succeeds, you can have reasonable confidence that the code is structurally sound.

### Deployment
The application is deployed to GitHub Pages at https://lacerbi.github.io/paper2llm using the `gh-pages` package.

## Key Technical Details

- React 19 with TypeScript
- Material-UI (MUI) v6 for UI components
- No state management library (uses React hooks)
- Web Crypto API for encryption
- Axios for HTTP requests
- react-markdown for markdown rendering

## API Rate Limits
Be aware of rate limits when testing:
- Mistral AI has a free tier with rate limits
- Image processing can be skipped by selecting "None" in the vision model dropdown
- Multiple providers allow switching if one hits rate limits