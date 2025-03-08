// AI Summary: Implements a unified domain handler with configuration-based approach for academic repositories.
// Handles URL normalization, validation, and filename generation based on repository-specific patterns
// and transformations, reducing code duplication and improving maintainability.

import { BaseDomainHandler } from './base-handler';

/**
 * Configuration interface for repository-specific URL handling
 */
interface RepositoryConfig {
  /** Domain identifier for this repository */
  domain: string;
  
  /** Hostname patterns that identify this repository */
  hostPatterns: string[];
  
  /** RegExp patterns to validate repository-specific URLs */
  urlPatterns: RegExp[];
  
  /** Rules for transforming abstract/landing page URLs to PDF URLs */
  pdfTransformRules: {
    /** Pattern to match in URL for transformation */
    pattern: RegExp;
    /** Replacement to apply when pattern matches */
    replacement: string | ((match: RegExpMatchArray, urlObj: URL) => string);
  }[];
  
  /** Rules for extracting paper ID for filename generation */
  filenameRules: {
    /** Pattern to match paper ID or components */
    pattern: RegExp;
    /** Template or function to generate filename */
    template: string | ((match: RegExpMatchArray, urlObj: URL) => string);
  }[];
}

/**
 * Generic domain handler that can process URLs from multiple academic repositories
 * based on repository-specific configurations
 */
export class GenericDomainHandler extends BaseDomainHandler {
  protected domain: string;
  protected hostPatterns: string[];
  private config: RepositoryConfig;
  
  /**
   * Creates a new generic domain handler with a specific repository configuration
   * @param config The repository configuration to use
   */
  constructor(config: RepositoryConfig) {
    super();
    this.domain = config.domain;
    this.hostPatterns = config.hostPatterns;
    this.config = config;
  }
  
  /**
   * Determines if this handler can process a given URL based on hostname and URL patterns
   * @param url The URL to check
   * @returns true if this handler can process the URL
   */
  canHandle(url: string): boolean {
    if (!this.matchesHostPatterns(url)) {
      return false;
    }
    
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Check if the URL matches any of the repository-specific patterns
      return this.config.urlPatterns.some(pattern => pattern.test(pathname));
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Normalizes a URL to ensure it properly points to a PDF using repository-specific transform rules
   * @param url The URL to normalize
   * @returns The normalized URL that directly points to the PDF
   */
  normalizePdfUrl(url: string): string {
    try {
      let urlObj = new URL(url);
      let pathname = urlObj.pathname;
      
      // If already a PDF URL, return as is
      if (pathname.toLowerCase().endsWith('.pdf')) {
        return url;
      }
      
      // Apply each transform rule in sequence until one matches
      for (const rule of this.config.pdfTransformRules) {
        const match = pathname.match(rule.pattern);
        if (match) {
          if (typeof rule.replacement === 'string') {
            urlObj.pathname = pathname.replace(rule.pattern, rule.replacement);
          } else {
            urlObj.pathname = rule.replacement(match, urlObj);
          }
          
          // Check if we need to ensure the URL ends with .pdf
          return this.ensurePdfExtension(urlObj.toString());
        }
      }
      
      // If no rule matches, just ensure the URL ends with .pdf
      return this.ensurePdfExtension(url);
    } catch (e) {
      return url;
    }
  }
  
  /**
   * Extracts a paper ID from a URL to generate a descriptive filename
   * based on repository-specific filename rules
   * @param url The URL to extract from
   * @returns A filename based on the paper ID or repository domain
   */
  getFileName(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      
      // Apply each filename rule in sequence until one matches
      for (const rule of this.config.filenameRules) {
        const match = pathname.match(rule.pattern);
        if (match) {
          if (typeof rule.template === 'string') {
            // Replace placeholders like $1, $2 with captured groups
            return rule.template.replace(/\$(\d+)/g, (_, index) => {
              return match[parseInt(index)] || '';
            });
          } else {
            return rule.template(match, urlObj);
          }
        }
      }
      
      // If no rule matches, use a fallback filename
      return this.generateFallbackFilename();
    } catch (e) {
      return this.generateFallbackFilename();
    }
  }
  
  /**
   * Gets the repository configuration
   * @returns The current repository configuration
   */
  getConfig(): RepositoryConfig {
    return this.config;
  }
}

/**
 * Creates a handler configuration for arXiv URLs
 * @returns Repository configuration for arXiv
 */
export function createArxivConfig(): RepositoryConfig {
  return {
    domain: 'arxiv',
    hostPatterns: ['arxiv.org'],
    urlPatterns: [
      /\/(abs|pdf|html)\/(\d+\.\d+|[\w-]+\/\d+)/
    ],
    pdfTransformRules: [
      {
        // Convert /abs/ or /html/ to /pdf/
        pattern: /\/(abs|html)\//,
        replacement: '/pdf/'
      }
    ],
    filenameRules: [
      {
        // Extract paper ID from URL
        pattern: /\/(abs|pdf|html)\/([\w.-]+\/?\d+|\d+\.\d+)/,
        template: 'arxiv-$2.pdf'
      }
    ]
  };
}

/**
 * Creates a handler configuration for OpenReview URLs
 * @returns Repository configuration for OpenReview
 */
export function createOpenReviewConfig(): RepositoryConfig {
  return {
    domain: 'openreview',
    hostPatterns: ['openreview.net'],
    urlPatterns: [
      /\/(forum|pdf|attachment)/
    ],
    pdfTransformRules: [
      {
        // Convert URLs to PDF URLs while preserving query parameters
        pattern: /\/(forum|attachment)/,
        replacement: (match, urlObj) => {
          // Ensure we convert to /pdf endpoint while preserving all query parameters
          return '/pdf';
        }
      },
      {
        // Handle URLs that are already PDF URLs but may need query parameter fixing
        pattern: /\/pdf/,
        replacement: (match, urlObj) => {
          // Keep as is, already a PDF URL
          return '/pdf';
        }
      }
    ],
    filenameRules: [
      {
        // Extract paper ID from search params
        pattern: /.*/,
        template: (_, urlObj) => {
          const id = urlObj.searchParams.get('id');
          return id ? `openreview-${id}.pdf` : 'openreview-paper.pdf';
        }
      }
    ]
  };
}

/**
 * Creates a handler configuration for ACL Anthology URLs
 * @returns Repository configuration for ACL
 */
export function createAclConfig(): RepositoryConfig {
  return {
    domain: 'acl',
    hostPatterns: ['aclanthology.org'],
    urlPatterns: [
      /\/\d{4}\.\w+-\w+\.\d+/,
      /\/[A-Z]\d{2}-\d{4}/
    ],
    pdfTransformRules: [
      {
        // Ensure URL ends with .pdf
        pattern: /\/([^\/]+)$/,
        replacement: (match, urlObj) => {
          return `/${match[1]}.pdf`;
        }
      }
    ],
    filenameRules: [
      {
        // Extract paper ID from pathname
        pattern: /\/([^\/]+?)(?:\.pdf)?$/,
        template: 'acl-$1.pdf'
      }
    ]
  };
}

/**
 * Creates a handler configuration for bioRxiv URLs
 * @returns Repository configuration for bioRxiv
 */
export function createBioRxivConfig(): RepositoryConfig {
  return {
    domain: 'biorxiv',
    hostPatterns: ['biorxiv.org'],
    urlPatterns: [
      /\/content\/10\.1101\//
    ],
    pdfTransformRules: [
      {
        // Transform to full PDF URL
        pattern: /\/content\/(10\.1101\/[\d.]+)(v\d+)?(?:\.full\.pdf|\.full|$)/,
        replacement: '/content/$1$2.full.pdf'
      }
    ],
    filenameRules: [
      {
        // Extract DOI from pathname
        pattern: /10\.1101\/([\d.]+)/,
        template: 'biorxiv-$1.pdf'
      }
    ]
  };
}

/**
 * Creates a handler configuration for medRxiv URLs
 * @returns Repository configuration for medRxiv
 */
export function createMedRxivConfig(): RepositoryConfig {
  return {
    domain: 'medrxiv',
    hostPatterns: ['medrxiv.org'],
    urlPatterns: [
      /\/content\/10\.1101\//
    ],
    pdfTransformRules: [
      {
        // Transform to full PDF URL
        pattern: /\/content\/(10\.1101\/[\d.]+)(v\d+)?(?:\.full\.pdf|\.full|$)/,
        replacement: '/content/$1$2.full.pdf'
      }
    ],
    filenameRules: [
      {
        // Extract DOI from pathname
        pattern: /10\.1101\/([\d.]+)/,
        template: 'medrxiv-$1.pdf'
      }
    ]
  };
}

/**
 * Creates a handler configuration for NIPS/NeurIPS URLs
 * @returns Repository configuration for NIPS/NeurIPS
 */
export function createNipsConfig(): RepositoryConfig {
  return {
    domain: 'neurips',
    hostPatterns: ['papers.nips.cc', 'papers.neurips.cc'],
    urlPatterns: [
      /\/paper\//,
      /\/paper_files\/paper\//
    ],
    pdfTransformRules: [
      {
        // Convert hash URLs to file URLs
        pattern: /(\/paper(?:_files\/paper)?\/\d{4})\/hash\/([^\/]+)-Abstract\.html/,
        replacement: '$1/file/$2-Paper.pdf'
      }
    ],
    filenameRules: [
      {
        // Extract year and hash for filename
        pattern: /\/paper(?:_files\/paper)?\/(\d{4})\/(?:hash|file)\/([^\/\-]+)/,
        template: 'neurips-$1-$2.pdf'
      },
      {
        // Fallback pattern just for hash
        pattern: /\/(?:hash|file)\/([^\/\-]+)/,
        template: 'neurips-$1.pdf'
      }
    ]
  };
}

/**
 * Creates a handler configuration for MLRP URLs
 * @returns Repository configuration for MLRP
 */
export function createMlrpConfig(): RepositoryConfig {
  return {
    domain: 'mlrp',
    hostPatterns: ['proceedings.mlr.press'],
    urlPatterns: [
      /\/v\d+\/[a-z0-9]+/
    ],
    pdfTransformRules: [
      {
        // Convert HTML URLs to PDF URLs
        pattern: /\/(v\d+)\/([a-z0-9]+)(?:\.html)?$/,
        replacement: '/$1/$2/$2.pdf'
      }
    ],
    filenameRules: [
      {
        // Extract volume and paper ID
        pattern: /\/v(\d+)\/([a-z0-9]+)/,
        template: 'mlrp-v$1-$2.pdf'
      }
    ]
  };
}

/**
 * Creates handler instances for all supported academic repositories
 * @returns Array of generic domain handlers configured for each repository
 */
export function createAllRepositoryHandlers(): GenericDomainHandler[] {
  return [
    new GenericDomainHandler(createArxivConfig()),
    new GenericDomainHandler(createOpenReviewConfig()),
    new GenericDomainHandler(createAclConfig()),
    new GenericDomainHandler(createBioRxivConfig()),
    new GenericDomainHandler(createMedRxivConfig()),
    new GenericDomainHandler(createNipsConfig()),
    new GenericDomainHandler(createMlrpConfig())
  ];
}
