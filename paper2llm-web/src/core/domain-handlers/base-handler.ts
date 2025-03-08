// AI Summary: Abstract base class for domain handlers with common URL processing methods.
// Provides utility functions and default implementations for PDF URL normalization.

import { DomainHandler } from "../../types/interfaces";

/**
 * Abstract base class for domain handlers
 * Provides common functionality and utility methods
 */
export abstract class BaseDomainHandler implements DomainHandler {
  /**
   * Domain identifier for this handler
   */
  protected abstract domain: string;
  
  /**
   * List of hostname patterns that this handler can process
   */
  protected abstract hostPatterns: string[];
  
  /**
   * Determines if this handler can process a given URL
   * @param url The URL to check
   * @returns true if this handler can process the URL
   */
  abstract canHandle(url: string): boolean;
  
  /**
   * Normalizes a URL to ensure it properly points to a PDF
   * @param url The URL to normalize
   * @returns The normalized URL
   */
  abstract normalizePdfUrl(url: string): string;
  
  /**
   * Generates a filename from the URL
   * @param url The URL to generate a filename from
   * @returns The generated filename
   */
  abstract getFileName(url: string): string;
  
  /**
   * Utility method to ensure a URL ends with .pdf
   * @param url The URL to check
   * @returns The URL with .pdf extension if needed
   */
  protected ensurePdfExtension(url: string): string {
    if (!url.toLowerCase().endsWith('.pdf')) {
      return `${url}.pdf`;
    }
    return url;
  }
  
  /**
   * Utility method to extract the hostname from a URL
   * @param url The URL to extract hostname from
   * @returns The hostname or empty string if invalid
   */
  protected getHostname(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch (e) {
      return '';
    }
  }
  
  /**
   * Utility method to check if a URL matches any of the host patterns
   * @param url The URL to check
   * @returns true if the URL matches any host pattern
   */
  protected matchesHostPatterns(url: string): boolean {
    const hostname = this.getHostname(url);
    return this.hostPatterns.some(pattern => hostname.includes(pattern));
  }
  
  /**
   * Generate a fallback filename when extraction fails
   * @returns A default filename with timestamp
   */
  protected generateFallbackFilename(): string {
    return `${this.domain}-paper-${new Date().toISOString().slice(0, 10)}.pdf`;
  }
  
  /**
   * Extracts path segments from a URL
   * @param url The URL to extract from
   * @returns Array of path segments or empty array if invalid
   */
  protected getPathSegments(url: string): string[] {
    try {
      const urlObj = new URL(url);
      // Filter out empty segments
      return urlObj.pathname.split('/').filter(segment => segment.trim() !== '');
    } catch (e) {
      return [];
    }
  }
  
  /**
   * Gets search parameters from a URL
   * @param url The URL to extract from
   * @returns URLSearchParams object or null if invalid
   */
  protected getSearchParams(url: string): URLSearchParams | null {
    try {
      const urlObj = new URL(url);
      return urlObj.searchParams;
    } catch (e) {
      return null;
    }
  }
}
