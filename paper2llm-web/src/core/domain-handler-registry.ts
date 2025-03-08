// AI Summary: Manages domain-specific URL handlers for PDF processing.
// Provides a registry system for handlers to normalize URLs and generate filenames
// based on academic repository patterns.

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
    handlers.forEach(handler => this.registerHandler(handler));
  }
  
  /**
   * Registers a new domain handler
   */
  public registerHandler(handler: DomainHandler): void {
    this.handlers.push(handler);
  }
  
  /**
   * Returns a domain handler that can process the given URL
   */
  public getHandler(url: string): DomainHandler | null {
    return this.handlers.find(handler => handler.canHandle(url)) || null;
  }
}

// Export a singleton instance for convenience
export const domainHandlerRegistry = new DefaultDomainHandlerRegistry();
