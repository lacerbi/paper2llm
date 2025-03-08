// AI Summary: Provides browser-specific file handling for PDFs. Handles reading files,
// validating PDFs, and fetching files from URLs with error handling and mime type checking.

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

    try {
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch PDF. Status: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        throw new Error('The URL does not point to a PDF file.');
      }

      const blob = await response.blob();
      const fileName = this.extractFileNameFromUrl(url);

      return {
        name: fileName,
        size: blob.size,
        type: blob.type,
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
   * Validates if a file is a PDF
   */
  validatePdf(file: File | Blob): boolean {
    return file.type === 'application/pdf';
  }

  /**
   * Validates if a URL is well-formed and potentially points to a PDF
   */
  validateUrl(url: string): boolean {
    try {
      new URL(url);
      // Basic check for PDF extension, though this isn't foolproof
      return url.trim() !== '' && (url.toLowerCase().endsWith('.pdf') || !url.includes('.'));
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
