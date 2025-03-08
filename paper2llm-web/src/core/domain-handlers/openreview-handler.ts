// AI Summary: Handles OpenReview URLs, supporting both PDF direct links and forum pages.
// Extracts paper IDs from URLs and converts forum pages to direct PDF download links.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for OpenReview.net URLs
 * 
 * Supports URL patterns:
 * - https://openreview.net/forum?id=abc123
 * - https://openreview.net/pdf?id=abc123
 * - https://openreview.net/attachment?id=abc123&name=pdf
 */
export class OpenReviewHandler extends BaseDomainHandler {
  protected domain = 'openreview';
  protected hostPatterns = ['openreview.net'];
  
  /**
   * Determines if this handler can process a given OpenReview URL
   * @param url The URL to check
   * @returns true if this is a valid OpenReview URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const params = urlObj.searchParams;
      
      // Must be a forum, pdf, or attachment page with an ID parameter
      return (
        (pathname === '/forum' || pathname === '/pdf' || pathname === '/attachment') &&
        params.has('id')
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes OpenReview URLs to ensure they point to the PDF version
   * @param url The OpenReview URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const id = urlObj.searchParams.get('id');
      
      if (!id) {
        return url;
      }
      
      // If it's a forum URL, convert to PDF URL
      if (pathname === '/forum') {
        urlObj.pathname = '/pdf';
        return urlObj.toString();
      }
      
      // If already a PDF URL, just return it
      if (pathname === '/pdf' || pathname === '/attachment') {
        return urlObj.toString();
      }
      
      return url;
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from an OpenReview URL to generate a filename
   * @param url The OpenReview URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const id = urlObj.searchParams.get('id');
      
      if (id) {
        return `openreview-${id}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
