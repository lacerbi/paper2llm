// AI Summary: Handles NIPS and NeurIPS conference paper URLs.
// Normalizes both old and new URL formats to access PDF downloads directly.

import { BaseDomainHandler } from './base-handler';

/**
 * Handler for NIPS/NeurIPS URLs
 * 
 * Supports URL patterns:
 * - https://papers.nips.cc/paper/2020/hash/abc123-Abstract.html
 * - https://papers.nips.cc/paper/2020/file/abc123-Paper.pdf
 * - https://papers.neurips.cc/paper/2021/hash/abc123-Abstract.html
 * - https://papers.neurips.cc/paper/2021/file/abc123-Paper.pdf
 * - https://papers.nips.cc/paper_files/paper/2022/hash/abc123-Abstract.html
 * - https://papers.nips.cc/paper_files/paper/2022/file/abc123-Paper.pdf
 */
export class NipsHandler extends BaseDomainHandler {
  protected domain = 'neurips';
  protected hostPatterns = ['papers.nips.cc', 'papers.neurips.cc'];
  
  /**
   * Determines if this handler can process a given NIPS/NeurIPS URL
   * @param url The URL to check
   * @returns true if this is a valid NIPS/NeurIPS URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // NIPS/NeurIPS URLs have specific patterns
      return (
        // Standard pattern
        pathname.includes('/paper/') ||
        // Newer pattern with paper_files
        pathname.includes('/paper_files/paper/')
      );
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes NIPS/NeurIPS URLs to ensure they point to the PDF version
   * @param url The NIPS/NeurIPS URL to normalize
   * @returns A URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      
      // Check if this is already a file URL (which points to PDF)
      if (pathname.includes('/file/') && pathname.endsWith('-Paper.pdf')) {
        return url;
      }
      
      // Check which pattern we're dealing with
      const isPaperFiles = pathname.includes('/paper_files/');
      
      // For abstract URLs, convert to file URLs
      if (pathname.includes('/hash/')) {
        // Find the position of 'hash' in the path
        const hashIndex = segments.indexOf('hash');
        if (hashIndex > 0 && hashIndex < segments.length - 1) {
          // Get the hash
          const hash = segments[hashIndex + 1].replace('-Abstract.html', '');
          
          // Determine the base path (with or without paper_files)
          const basePath = isPaperFiles ? 
            `/paper_files/paper/${segments[hashIndex - 1]}/file/` : 
            `/paper/${segments[hashIndex - 1]}/file/`;
          
          // Build the new URL
          urlObj.pathname = `${basePath}${hash}-Paper.pdf`;
          return urlObj.toString();
        }
      }
      
      // If we can't normalize, return the original URL
      return url;
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from a NIPS/NeurIPS URL to generate a filename
   * @param url The NIPS/NeurIPS URL
   * @returns A filename based on the paper ID
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const segments = pathname.split('/');
      
      // Extract the year and hash
      let year = '';
      let hash = '';
      
      for (let i = 0; i < segments.length; i++) {
        // Look for year pattern (typically 4 digits)
        if (/^\d{4}$/.test(segments[i])) {
          year = segments[i];
        }
        
        // Look for hash or file segment which contains the paper ID
        if (segments[i] === 'hash' || segments[i] === 'file') {
          if (i + 1 < segments.length) {
            // Extract just the hash part without the suffix
            hash = segments[i + 1].replace(/-Abstract\.html$/, '').replace(/-Paper\.pdf$/, '');
          }
        }
      }
      
      // Construct a meaningful filename
      if (year && hash) {
        return `neurips-${year}-${hash}.pdf`;
      } else if (hash) {
        return `neurips-${hash}.pdf`;
      }
      
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
}
