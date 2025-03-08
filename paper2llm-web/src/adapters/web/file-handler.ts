// AI Summary: Provides browser-specific file handling for PDFs. Handles reading files,
// validating PDFs, and fetching files from URLs with error handling and mime type checking.
// Now includes content-type checking via HEAD requests and a domain handler system for extensibility.

import { FileHandler, PdfFile } from '../../types/interfaces';

/**
 * Domain-specific handler interface for PDF URL processing
 */
interface DomainHandler {
  /**
   * Determines if this handler can process a given URL
   */
  canHandle(url: string): boolean;
  
  /**
   * Normalizes a URL to ensure it properly points to a PDF
   */
  normalizePdfUrl(url: string): string;
  
  /**
   * Generates a filename from the URL
   */
  getFileName(url: string): string;
}

/**
 * Implements the FileHandler interface for web browsers
 */
export class WebFileHandler implements FileHandler {
  private domainHandlers: DomainHandler[] = [];
  
  constructor() {
    this.initializeDomainHandlers();
  }
  
  /**
   * Initializes the domain handlers registry
   */
  private initializeDomainHandlers() {
    // ArXiv handler
    this.registerDomainHandler({
      canHandle(url: string): boolean {
        try {
          const urlObj = new URL(url);
          if (!urlObj.hostname.includes('arxiv.org')) {
            return false;
          }
          
          const pathname = urlObj.pathname;
          // Check for /abs/, /pdf/, or /html/ formats
          return /\/(abs|pdf|html)\/(\d+\.\d+|[\w-]+\/\d+)/.test(pathname);
        } catch (e) {
          return false;
        }
      },
      
      normalizePdfUrl(url: string): string {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          
          // Convert /abs/ or /html/ to /pdf/
          if (pathname.includes('/abs/') || pathname.includes('/html/')) {
            return url.replace(/\/(abs|html)\//, '/pdf/') + '.pdf';
          }
          
          // If already a PDF URL, just return it
          if (pathname.includes('/pdf/')) {
            // Ensure it ends with .pdf
            return pathname.endsWith('.pdf') ? url : url + '.pdf';
          }
          
          return url;
        } catch (e) {
          return url;
        }
      },
      
      getFileName(url: string): string {
        try {
          const urlObj = new URL(url);
          const pathname = urlObj.pathname;
          
          // Extract paper ID from /abs/, /pdf/, or /html/ URLs
          const arxivPattern = /\/(abs|pdf|html)\/([\w.-]+\/?\d+|\d+\.\d+)/;
          const match = pathname.match(arxivPattern);
          
          if (match) {
            return `arxiv-${match[2]}.pdf`;
          }
          
          return `arxiv-paper-${new Date().toISOString().slice(0, 10)}.pdf`;
        } catch (e) {
          return `arxiv-paper-${new Date().toISOString().slice(0, 10)}.pdf`;
        }
      }
    });
    
    // Additional domain handlers can be registered here in the future
  }
  
  /**
   * Registers a new domain handler
   */
  private registerDomainHandler(handler: DomainHandler) {
    this.domainHandlers.push(handler);
  }
  
  /**
   * Returns a domain handler that can process the given URL
   */
  private getDomainHandler(url: string): DomainHandler | null {
    return this.domainHandlers.find(handler => handler.canHandle(url)) || null;
  }

  /**
   * Reads a File object and returns a PdfFile
   */
  async readFile(file: File): Promise<PdfFile> {
    if (!this.validatePdf(file)) {
      throw new Error('Invalid file type. Please upload a PDF file.');
    }

    return {
      name: file.name,
      size: file.size,
      type: file.type,
      content: file,
      source: 'upload'
    };
  }

  /**
   * Fetches a PDF from a URL and returns a PdfFile
   */
  async fetchFromUrl(url: string): Promise<PdfFile> {
    if (!this.validateUrl(url)) {
      throw new Error('Invalid URL format. Please provide a valid URL.');
    }

    // Check for known academic domains that might have CORS restrictions
    const isKnownAcademicDomain = [
      'openreview.net',
      'aclanthology.org',
      'papers.nips.cc',
      'proceedings.mlr.press'
    ].some(domain => url.includes(domain));

    // For known academic domains, use direct URL processing to avoid CORS issues
    if (isKnownAcademicDomain) {
      console.log(`Using direct processing for academic URL: ${url}`);
      const fileName = this.extractFileNameFromUrl(url);
      
      return {
        name: fileName,
        size: 0, // Size unknown until fetched
        type: 'application/pdf',
        content: new Blob(), // Empty blob as placeholder
        source: 'url',
        originalUrl: url,
        directProcessUrl: true // Signal to OCR service to use direct URL processing
      };
    }

    // Check if we have a domain handler for this URL
    const domainHandler = this.getDomainHandler(url);
    
    if (domainHandler) {
      // Normalize the URL for this domain
      const normalizedUrl = domainHandler.normalizePdfUrl(url);
      
      console.log(`Using domain-specific handling for URL: ${url} -> ${normalizedUrl}`);
      
      return {
        name: domainHandler.getFileName(url),
        size: 0, // Size unknown until fetched
        type: 'application/pdf',
        content: new Blob(), // Empty blob as placeholder
        source: 'url',
        originalUrl: normalizedUrl,
        directProcessUrl: true // Signal to OCR service to use direct URL processing
      };
    }

    // For non-domain-specific URLs, check content type before downloading
    const isPdf = await this.checkUrlContentType(url);
    if (!isPdf) {
      throw new Error('The URL does not appear to point to a PDF file. Please provide a valid PDF URL.');
    }

    // For URLs without a specific domain handler, proceed with traditional fetching
    try {
      console.log(`Attempting to fetch URL directly: ${url}`);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        // If we get a CORS error or other fetch failure, try direct processing
        if (response.status === 0 || response.type === 'opaque' || response.status === 403) {
          console.log(`Direct fetch failed, falling back to direct processing: ${url}`);
          return {
            name: this.extractFileNameFromUrl(url),
            size: 0,
            type: 'application/pdf',
            content: new Blob(),
            source: 'url',
            originalUrl: url,
            directProcessUrl: true
          };
        }
        throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      const validContentTypes = ['application/pdf', 'binary/octet-stream'];
      const isValidContentType = contentType && validContentTypes.some(type => contentType.includes(type));
      
      if (!isValidContentType) {
        console.log(`Invalid content type: ${contentType}, falling back to direct processing`);
        return {
          name: this.extractFileNameFromUrl(url),
          size: 0,
          type: 'application/pdf',
          content: new Blob(),
          source: 'url',
          originalUrl: url,
          directProcessUrl: true
        };
      }

      const blob = await response.blob();
      const fileName = this.extractFileNameFromUrl(url);

      return {
        name: fileName,
        size: blob.size,
        type: 'application/pdf',
        content: blob,
        source: 'url',
        originalUrl: url
      };
    } catch (error) {
      console.log(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      
      // For fetch errors (likely CORS), fall back to direct processing
      return {
        name: this.extractFileNameFromUrl(url),
        size: 0,
        type: 'application/pdf',
        content: new Blob(),
        source: 'url',
        originalUrl: url,
        directProcessUrl: true
      };
    }
  }

  /**
   * Performs a HEAD request to check if a URL points to a PDF
   * without downloading the entire file
   */
  private async checkUrlContentType(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
      });
      
      if (!response.ok) {
        return false;
      }
      
      const contentType = response.headers.get('content-type');
      return contentType ? 
        ['application/pdf', 'binary/octet-stream'].some(type => contentType.includes(type)) : 
        false;
    } catch (error) {
      console.warn(`Cannot check content type for ${url}: ${error}`);
      // If we can't check, we'll return true and validate later when downloading
      return true;
    }
  }

  /**
   * Checks if a URL is from arXiv using the domain handler
   */
  isArxivUrl(url: string): boolean {
    try {
      const domainHandler = this.getDomainHandler(url);
      return domainHandler !== null && domainHandler.canHandle(url);
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates if a file is a PDF
   */
  validatePdf(file: File | Blob): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Validates if a URL is well-formed and potentially points to a PDF
   * No longer relies on .pdf extension for validation
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url); // This will throw if the URL is not valid
      
      // If it's a URL we can handle with a domain handler, it's valid
      if (this.getDomainHandler(url)) {
        return true;
      }
      
      // Return true if the URL is valid
      return url.trim() !== '';
    } catch (e) {
      return false;
    }
  }

  /**
   * Extracts a filename from a URL
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      // Check if we have a domain handler for this URL
      const domainHandler = this.getDomainHandler(url);
      if (domainHandler) {
        return domainHandler.getFileName(url);
      }
      
      // Handle OpenReview URLs specifically
      if (url.includes('openreview.net')) {
        try {
          const urlObj = new URL(url);
          const paperId = urlObj.searchParams.get('id');
          if (paperId) {
            return `openreview-${paperId}.pdf`;
          }
        } catch (e) {
          // Fall through to standard handling
        }
      }
      
      // Standard URL processing if no domain handler
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Regular URL handling
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1];
      
      // If last segment is not empty and has content
      if (lastSegment && lastSegment.trim() !== '') {
        // If it ends with .pdf, use it directly
        if (lastSegment.toLowerCase().endsWith('.pdf')) {
          return lastSegment;
        }
        
        // Otherwise, append .pdf to make it a valid filename
        return `${lastSegment}.pdf`;
      }
      
      // If no valid filename found, generate a default
      return `document-${new Date().toISOString().slice(0, 10)}.pdf`;
    } catch (e) {
      return `document-${new Date().toISOString().slice(0, 10)}.pdf`;
    }
  }
}

// Export a singleton instance for convenience
export const webFileHandler = new WebFileHandler();
