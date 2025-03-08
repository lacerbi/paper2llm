// AI Summary: Handles ACL Anthology URLs for natural language processing papers.
// Normalizes abstract page URLs to direct PDF links and extracts paper IDs for filenames.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for ACL Anthology URLs
 * 
 * Supports URL patterns:
 * - https://aclanthology.org/2020.acl-main.1/
 * - https://aclanthology.org/2020.acl-main.1.pdf
 * - https://aclanthology.org/P19-1001/
 * - https://aclanthology.org/volumes/P19-1/
 */
export class AclAnthologyHandler extends BaseDomainHandler {
  protected domain = 'acl';
  protected hostPatterns = ['aclanthology.org'];
  
  /**
   * Determines if this handler can process a given ACL Anthology URL
   * @param url The URL to check
   * @returns true if this is a valid ACL Anthology URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // ACL papers follow patterns like 2020.acl-main.1 or P19-1001
      // We exclude volume pages which have "volumes" in the path
      return (
        pathname.length > 1 &&
        !pathname.includes('volumes') &&
        (
          /\/\d{4}\.\w+-\w+\.\d+/.test(pathname) ||
          /\/[A-Z]\d{2}-\d{4}/.test(pathname)
        )
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes ACL Anthology URLs to ensure they point to the PDF version
   * @param url The ACL URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      let urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Remove trailing slash if present
      if (pathname.endsWith('/')) {
        pathname = pathname.slice(0, -1);
      }
      
      // If already a PDF URL, return as is
      if (pathname.endsWith('.pdf')) {
        return url;
      }
      
      // Otherwise add .pdf extension
      urlObj.pathname = pathname + '.pdf';
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from an ACL Anthology URL to generate a filename
   * @param url The ACL URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Remove trailing slash and .pdf extension if present
      pathname = pathname.replace(/\/$/, '').replace(/\.pdf$/, '');
      
      // Extract the paper ID from the pathname
      const segments = pathname.split('/');
      const paperId = segments[segments.length - 1];
      
      if (paperId && paperId.trim() !== '') {
        return `acl-${paperId}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
