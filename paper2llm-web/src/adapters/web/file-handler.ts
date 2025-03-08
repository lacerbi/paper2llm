// AI Summary: Provides browser-specific file handling for PDFs. Handles reading files,
// validating PDFs, and fetching files from URLs with improved error handling and enhanced
// domain handler integration. Uses the domain handler registry for academic repositories.

import { FileHandler, PdfFile, DomainHandler } from '../../types/interfaces';
import { domainHandlerRegistry } from '../../core/domain-handler-registry';

/**
 * Implements the FileHandler interface for web browsers
 */
export class WebFileHandler implements FileHandler {
  
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
   * Uses domain handlers for repository-specific URL normalization
   */
  async fetchFromUrl(url: string): Promise<PdfFile> {
    if (!this.validateUrl(url)) {
      throw new Error('Invalid URL format. Please provide a valid URL.');
    }

    // Check if we have a domain handler for this URL
    const domainHandler = domainHandlerRegistry.getHandler(url);
    
    // For academic repositories with a domain handler
    if (domainHandler) {
      console.log(`Using domain-specific handling for URL: ${url}`);
      return this.processDomainHandlerUrl(url, domainHandler);
    }
    
    // For general URLs without a specific domain handler
    return this.processGenericUrl(url);
  }

  /**
   * Processes a URL using a domain-specific handler
   * @param url The original URL
   * @param domainHandler The domain handler to use
   */
  private async processDomainHandlerUrl(url: string, domainHandler: DomainHandler): Promise<PdfFile> {
    try {
      // Normalize the URL for this domain (usually converts to direct PDF URL)
      const normalizedUrl = domainHandler.normalizePdfUrl(url);
      
      console.log(`Normalized URL: ${url} -> ${normalizedUrl}`);
      
      // Get a descriptive filename based on the repository's naming pattern
      const fileName = domainHandler.getFileName(url);
      
      // First attempt a HEAD request to check if the PDF is directly accessible
      const isPdf = await this.checkUrlContentType(normalizedUrl);
      
      // If the normalized URL is directly accessible, try direct fetch
      if (isPdf) {
        try {
          console.log(`Attempting direct fetch for normalized URL: ${normalizedUrl}`);
          const response = await fetch(normalizedUrl, {
            method: 'GET',
            mode: 'cors',
          });
          
          if (response.ok) {
            const blob = await response.blob();
            return {
              name: fileName,
              size: blob.size,
              type: 'application/pdf',
              content: blob,
              source: 'url',
              originalUrl: normalizedUrl
            };
          }
          // Fall through to direct processing if fetch fails
          console.log(`Direct fetch failed with status ${response.status}, using direct processing for: ${normalizedUrl}`);
        } catch (error) {
          console.log(`Fetch error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // If direct fetch failed or was not possible, use direct processing
      // This signals to the OCR service to fetch the URL directly rather than sending blob data
      return {
        name: fileName,
        size: 0, // Size unknown until fetched
        type: 'application/pdf',
        content: new Blob(), // Empty blob as placeholder
        source: 'url',
        originalUrl: normalizedUrl,
        directProcessUrl: true // Signal to OCR service to use direct URL processing
      };
    } catch (error) {
      console.error(`Error processing domain-specific URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw new Error(`Failed to process PDF URL. Please check the URL and try again.`);
    }
  }
  
  /**
   * Processes a generic URL without domain-specific handling
   * @param url The URL to process
   */
  private async processGenericUrl(url: string): Promise<PdfFile> {
    // For URLs without a specific domain handler, check content type before downloading
    const isPdf = await this.checkUrlContentType(url);
    if (!isPdf) {
      throw new Error('The URL does not appear to point to a PDF file. Please provide a valid PDF URL.');
    }

    // For generic URLs, proceed with traditional fetching
    try {
      console.log(`Attempting to fetch generic URL directly: ${url}`);
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
   * @param url The URL to check
   * @returns true if the URL is likely a PDF, false otherwise
   */
  private async checkUrlContentType(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
      });
      
      if (!response.ok) {
        // If HEAD request fails, we can't determine content type
        // We'll return true and validate later when downloading
        console.log(`HEAD request failed for ${url}, will try downloading directly`);
        return true;
      }
      
      const contentType = response.headers.get('content-type');
      const result = contentType ? 
        ['application/pdf', 'binary/octet-stream'].some(type => contentType.includes(type)) : 
        false;
      
      console.log(`Content type check for ${url}: ${contentType} -> isPdf: ${result}`);
      return result;
    } catch (error) {
      console.warn(`Cannot check content type for ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // If we can't check, we'll return true and validate later when downloading
      return true;
    }
  }

  /**
   * Checks if a URL is from arXiv
   * @deprecated Use the domain handler registry instead
   */
  isArxivUrl(url: string): boolean {
    try {
      const handler = domainHandlerRegistry.getHandler(url);
      // This maintains backward compatibility by only returning true for arXiv URLs
      return handler !== null && url.includes('arxiv.org');
    } catch (e) {
      return false;
    }
  }

  /**
   * Validates if a file is a PDF
   * @param file The file to validate
   * @returns true if the file is a PDF, false otherwise
   */
  validatePdf(file: File | Blob): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Validates if a URL is well-formed and potentially points to a PDF
   * Also checks with the domain handler registry if this is a supported academic URL
   * @param url The URL to validate
   * @returns true if the URL is valid, false otherwise
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url); // This will throw if the URL is not valid
      
      // If it's a URL we can handle with a domain handler, it's valid
      if (domainHandlerRegistry.getHandler(url)) {
        return true;
      }
      
      // For generic URLs, we only require that it's well-formed
      return url.trim() !== '';
    } catch (e) {
      return false;
    }
  }

  /**
   * Extracts a filename from a URL
   * Uses domain handlers when possible, falls back to URL path extraction
   * @param url The URL to extract filename from
   * @returns A filename suitable for the PDF
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      // Check if we have a domain handler for this URL
      const domainHandler = domainHandlerRegistry.getHandler(url);
      if (domainHandler) {
        return domainHandler.getFileName(url);
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
