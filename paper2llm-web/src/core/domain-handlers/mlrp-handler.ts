// AI Summary: Handles MLRP/PMLR (Proceedings of Machine Learning Research) URLs.
// Provides direct links to PDFs from conference proceeding pages with volume and paper ID extraction.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for MLRP (Proceedings of Machine Learning Research) URLs
 * 
 * Supports URL patterns:
 * - https://proceedings.mlr.press/v162/wang22c.html
 * - https://proceedings.mlr.press/v162/wang22c/wang22c.pdf
 * - http://proceedings.mlr.press/v119/lee20g/lee20g.pdf
 */
export class MlrpHandler extends BaseDomainHandler {
  protected domain = 'mlrp';
  protected hostPatterns = ['proceedings.mlr.press'];
  
  /**
   * Determines if this handler can process a given MLRP URL
   * @param url The URL to check
   * @returns true if this is a valid MLRP URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // MLRP URLs typically have a pattern of /v<volume_number>/<paper_id>
      return /\/v\d+\/[a-z0-9]+/.test(pathname);
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes MLRP URLs to ensure they point to the PDF version
   * @param url The MLRP URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // If already a PDF URL, return as is
      if (pathname.endsWith('.pdf')) {
        return url;
      }
      
      // Extract volume and paper ID
      const match = pathname.match(/\/v(\d+)\/([a-z0-9]+)/);
      if (match) {
        const volume = match[1];
        const paperId = match[2].replace(/\.html$/, '');
        
        // Construct the PDF URL pattern
        urlObj.pathname = `/v${volume}/${paperId}/${paperId}.pdf`;
        return urlObj.toString();
      }
      
      return url;
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from an MLRP URL to generate a filename
   * @param url The MLRP URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract volume and paper ID
      const match = pathname.match(/\/v(\d+)\/([a-z0-9]+)/);
      if (match) {
        const volume = match[1];
        const paperId = match[2].replace(/\.html$/, '').replace(/\.pdf$/, '');
        
        return `mlrp-v${volume}-${paperId}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
