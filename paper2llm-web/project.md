# PDF-to-Markdown Conversion App: Project Summary

## Project Goals

Create an application that:

1. Takes a PDF document as input (from URL or file upload)
2. Sends the PDF to Mistral OCR service
3. Processes the returned Markdown and images
4. Gets image descriptions using Mistral Vision LLM
5. Combines everything into a single enhanced Markdown file
6. Operates through both a web interface and CLI (eventually)

## System Architecture

### Core Processing Flow

1. User uploads PDF or provides URL
2. PDF is sent to Mistral OCR service
3. OCR service returns Markdown and extracted images
4. App processes each image with Mistral Vision LLM, providing image context
5. Image descriptions are integrated into the Markdown
6. Final enhanced Markdown is returned to user

### Technology Stack

**Web Implementation (Primary)**

- **Frontend**: React with TypeScript
- **Deployment**: GitHub Pages (static site)
- **API Access**: Direct browser-to-API communication
- **Build Tool**: Create React App or Vite

**Future CLI Implementation**

- **Runtime**: Node.js with TypeScript
- **CLI Framework**: Commander.js
- **Packaging**: NPM package

## Project Structure

```
/src
  /core                    // Shared logic between web and CLI
    ocr-service.ts         // Mistral OCR API client
    image-service.ts       // Image description service
    markdown-processor.ts  // Process & enhance markdown
    pdf-to-md.ts           // Main orchestration pipeline

  /adapters                // Platform-specific implementations
    /web                   // Browser implementations
      file-handler.ts
      api-storage.ts
      progress-reporter.ts

    /cli                   // Node.js implementations
      file-handler.ts
      api-storage.ts
      progress-reporter.ts

  /web                     // Web-specific React components
    components/
      FileUploader.tsx
      ApiKeyManager.tsx
      ProcessingStatus.tsx
      MarkdownPreview.tsx
    App.tsx

  /types                   // Shared TypeScript interfaces
    interfaces.ts
```

## API Key Management

For GitHub Pages (client-side only):

- Encrypted storage in browser localStorage
- User provides API key once, then it's encrypted with a password
- Key is decrypted when needed for API calls
- Offers reasonable security while maintaining good UX

## Code Reuse Strategy

The architecture enables 70-80% code reuse between web and CLI through:

1. **Dependency Injection**: Core logic receives platform-specific implementations
2. **Interface-Based Design**: All platform-specific code implements common interfaces
3. **Shared Business Logic**: All OCR, image processing, and markdown generation is platform-agnostic

## Implementation Considerations

- **Asynchronous Processing**: Handle OCR potentially being a long-running operation
- **Progress Tracking**: Implement detailed progress indicators for both interfaces
- **Error Handling**: Robust error management for API failures, timeouts, etc.
- **Markdown Processing**: Use parser-based approach (like remark) for reliable processing
- **Image Context**: Extract surrounding text to provide better context for image descriptions

## Development Roadmap

1. Build core processing pipeline and interfaces
2. Implement web version with React for GitHub Pages
3. Add secure API key management
4. Test with various PDF formats and sizes
5. Implement CLI version reusing core code
6. Package and publish CLI tool

This architecture provides a flexible, maintainable solution that meets the current requirements while supporting future CLI capabilities through intelligent code reuse.
