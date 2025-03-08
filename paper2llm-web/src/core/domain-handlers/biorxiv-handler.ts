// AI Summary: Handles bioRxiv preprint URLs for life sciences papers.
// Converts abstract page URLs to direct PDF links and extracts identifiers for filenames.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for bioRxiv.org URLs
 * 
 * Supports URL patterns:
 * - https://www.biorxiv.org/content/10.1101/2022.01.01.123456
 * - https://www.biorxiv.org/content/10.1101/2022.01.01.123456v1
 * - https://www.biorxiv.org/content/10.1101/2022.01.01.123456.full
 * - https://www.biorxiv.org/content/10.1101/2022.01.01.123456v1.full.pdf
 */
export class BioRxivHandler extends BaseDomainHandler {
  protected domain = 'biorxiv';
  protected hostPatterns = ['biorxiv.org'];
  
  /**
   * Determines if this handler can process a given bioRxiv URL
   * @param url The URL to check
   * @returns true if this is a valid bioRxiv URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // bioRxiv URLs always have content/10.1101 in the path
      return pathname.includes('/content/10.1101/');
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes bioRxiv URLs to ensure they point to the PDF version
   * @param url The bioRxiv URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // Extract the base path (without full.pdf suffix)
      const basePath = pathname.replace(/\.full\.pdf$/, '').replace(/\.full$/, '').replace(/v\d+$/, '');
      
      // Check if the URL includes a version (e.g., v1, v2)
      const versionMatch = pathname.match(/v(\d+)($|\.)/);
      const versionSuffix = versionMatch ? `v${versionMatch[1]}` : '';
      
      // Construct the full PDF URL
      urlObj.pathname = `${basePath}${versionSuffix}.full.pdf`;
      return urlObj.toString();
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from a bioRxiv URL to generate a filename
   * @param url The bioRxiv URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Extract the DOI number from the path
      const doiMatch = pathname.match(/10\.1101\/([\d.]+)/);
      if (doiMatch && doiMatch[1]) {
        return `biorxiv-${doiMatch[1]}.pdf`;
      }
      
      // Fallback: extract the full ID from the path
      const contentMatch = pathname.match(/content\/(.+?)(?:\.full\.pdf|\.full|$)/);
      if (contentMatch && contentMatch[1]) {
        // Clean up the ID by replacing slashes
        const cleanId = contentMatch[1].replace(/\//g, '-');
        return `biorxiv-${cleanId}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
