// AI Summary: Handles ArXiv paper URLs in various formats (/abs/, /pdf/, /html/).
// Normalizes URLs to direct PDF links and extracts paper IDs for filename generation.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for arXiv.org URLs
 * 
 * Supports URL patterns:
 * - https://arxiv.org/abs/2101.12345
 * - https://arxiv.org/pdf/2101.12345
 * - https://arxiv.org/pdf/2101.12345.pdf
 * - https://arxiv.org/html/2101.12345
 * - https://arxiv.org/abs/hep-th/9901001
 */
export class ArxivHandler extends BaseDomainHandler {
  protected domain = 'arxiv';
  protected hostPatterns = ['arxiv.org'];
  
  /**
   * Determines if this handler can process a given arXiv URL
   * @param url The URL to check
   * @returns true if this is a valid arXiv URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Check for /abs/, /pdf/, or /html/ format with valid paper ID
      return /\/(abs|pdf|html)\/(\d+\.\d+|[\w-]+\/\d+)/.test(pathname);
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes arXiv URLs to ensure they point to the PDF version
   * @param url The arXiv URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Convert /abs/ or /html/ to /pdf/
      if (pathname.includes('/abs/') || pathname.includes('/html/')) {
        const newPath = pathname.replace(/\/(abs|html)\//, '/pdf/');
        urlObj.pathname = newPath;
        return this.ensurePdfExtension(urlObj.toString());
      }
      
      // If already a PDF URL, just ensure it ends with .pdf
      if (pathname.includes('/pdf/')) {
        return this.ensurePdfExtension(urlObj.toString());
      }
      
      // If none of the above, return the original URL
      return url;
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from an arXiv URL to generate a filename
   * @param url The arXiv URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract paper ID from /abs/, /pdf/, or /html/ URLs
      const arxivPattern = /\/(abs|pdf|html)\/([\w.-]+\/?\d+|\d+\.\d+)/;
      const match = pathname.match(arxivPattern);
      
      if (match) {
        return `arxiv-${match[2].replace('/', '-')}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
