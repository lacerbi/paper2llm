// AI Summary: Manages domain-specific URL handlers for PDF processing.
// Provides a registry system for handlers to normalize URLs and generate filenames
// based on academic repository patterns using the new generic handler approach.

import { DomainHandler, DomainHandlerRegistry } from '../types/interfaces';
import { handlers } from './domain-handlers';

/**
 * Implements a registry for domain-specific URL handlers
 */
export class DefaultDomainHandlerRegistry implements DomainHandlerRegistry {
  private handlers: DomainHandler[] = [];
  
  constructor() {
    this.initializeDefaultHandlers();
  }
  
  /**
   * Initializes the default set of domain handlers
   */
  private initializeDefaultHandlers() {
    // Register all domain handlers from the handlers module
    // These are now created using the generic handler with repository configurations
    handlers.forEach(handler => this.registerHandler(handler));
  }
  
  /**
   * Registers a new domain handler
   * @param handler The domain handler to register
   */
  public registerHandler(handler: DomainHandler): void {
    this.handlers.push(handler);
  }
  
  /**
   * Returns a domain handler that can process the given URL
   * @param url The URL to find a handler for
   * @returns The first handler that can process the URL, or null if none found
   */
  public getHandler(url: string): DomainHandler | null {
    return this.handlers.find(handler => handler.canHandle(url)) || null;
  }
  
  /**
   * Gets all registered handlers
   * @returns Array of all registered domain handlers
   */
  public getAllHandlers(): DomainHandler[] {
    return [...this.handlers];
  }
}

// Export a singleton instance for convenience
export const domainHandlerRegistry = new DefaultDomainHandlerRegistry();
