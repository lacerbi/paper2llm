// AI Summary: Provides browser-specific file handling for PDFs. Handles reading files,
// validating PDFs, and fetching files from URLs with error handling and mime type checking.
// Now includes special handling for arXiv links with direct processing capability.

import { FileHandler, PdfFile } from '../../types/interfaces';

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
   */
  async fetchFromUrl(url: string): Promise<PdfFile> {
    if (!this.validateUrl(url)) {
      throw new Error('Invalid URL format. Please provide a valid URL to a PDF file.');
    }

    // Check if this is an arXiv URL that can be directly processed by the OCR service
    const isArxivUrl = this.isArxivUrl(url);
    
    // For arXiv URLs, we'll use direct URL processing via the OCR service
    if (isArxivUrl) {
      console.log(`Using direct processing for arXiv URL: ${url}`);
      return {
        name: this.extractFileNameFromUrl(url),
        size: 0, // Size unknown until fetched
        type: 'application/pdf',
        content: new Blob(), // Empty blob as placeholder
        source: 'url',
        originalUrl: url,
        directProcessUrl: true // Signal to OCR service to use direct URL processing
      };
    }

    // For non-arXiv URLs, proceed with traditional fetching
    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      const validContentTypes = ['application/pdf', 'binary/octet-stream'];
      const isValidContentType = contentType && validContentTypes.some(type => contentType.includes(type));
      
      if (!isValidContentType) {
        throw new Error(`The URL does not point to a PDF file. Content type: ${contentType}`);
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
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unknown error occurred while fetching the PDF.');
    }
  }

  /**
   * Checks if a URL is from arXiv
   */
  isArxivUrl(url: string): boolean {
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
  }

  /**
   * Validates if a file is a PDF
   */
  validatePdf(file: File | Blob): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Validates if a URL is well-formed and potentially points to a PDF
   * Now includes special handling for arXiv URLs in various formats
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      
      // Special case for arXiv URLs
      if (this.isArxivUrl(url)) {
        return true;
      }
      
      // Standard PDF URL validation
      return url.trim() !== '' && (
        url.toLowerCase().endsWith('.pdf') || 
        !url.includes('.')
      );
    } catch (e) {
      return false;
    }
  }

  /**
   * Extracts a filename from a URL
   */
  private extractFileNameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Check if it's an arXiv URL
      if (this.isArxivUrl(url)) {
        // Extract paper ID from /abs/, /pdf/, or /html/ URLs
        const arxivPattern = /\/(abs|pdf|html)\/([\w.-]+\/?\d+|\d+\.\d+)/;
        const match = pathname.match(arxivPattern);
        
        if (match) {
          return `arxiv-${match[2]}.pdf`;
        }
      }
      
      // Regular URL handling
      const segments = pathname.split('/');
      const lastSegment = segments[segments.length - 1];
      
      if (lastSegment && lastSegment.toLowerCase().endsWith('.pdf')) {
        return lastSegment;
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
