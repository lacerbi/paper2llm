// AI Summary: Utility for generating BibTeX citations from academic paper titles.
// Interfaces with Semantic Scholar API to search for matching papers or generates mock citations.
// Provides functions for extracting paper metadata, formatting BibTeX entries, and sanitizing text.

import { extractTitle } from "./markdown-splitter";

/**
 * Represents a BibTeX entry with required and optional fields
 */
export interface BibTeXEntry {
  // Required fields
  key: string;
  type: string;
  title: string;

  // Author information
  authors: string[];

  // Optional fields
  year?: string;
  journal?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  publisher?: string;
  doi?: string;
  url?: string;
  abstract?: string;

  // Additional fields can be added as needed
  [key: string]: any;
}

/**
 * Response from Semantic Scholar API for paper search
 */
interface SemanticScholarPaperResponse {
  paperId?: string;
  externalIds?: {
    DOI?: string;
    ArXiv?: string;
    ACL?: string;
    PubMed?: string;
  };
  title: string;
  authors: {
    authorId?: string;
    name: string;
  }[];
  venue?: string;
  year?: number;
  abstract?: string;
  referenceCount?: number;
  citationCount?: number;
  url?: string;
}

/**
 * Parameters for configuring BibTeX generation
 */
export interface BibTeXGenerationOptions {
  /**
   * Whether to use the Semantic Scholar API (true) or just generate mock entries (false)
   * Default: true
   */
  useApi?: boolean;

  /**
   * Maximum number of results to fetch from Semantic Scholar
   * Default: 3
   */
  maxResults?: number;

  /**
   * Whether to include the abstract in the BibTeX entry
   * Default: false
   */
  includeAbstract?: boolean;

  /**
   * Custom entry type to use for mock entries (e.g., "article", "inproceedings")
   * Default: "article"
   */
  mockEntryType?: string;
}

/**
 * Default options for BibTeX generation
 */
const DEFAULT_OPTIONS: BibTeXGenerationOptions = {
  useApi: true,
  maxResults: 3,
  includeAbstract: false,
  mockEntryType: "article",
};

/**
 * Safely extracts a year from a date string or returns the current year
 *
 * @param dateStr The date string to extract year from
 * @returns The extracted year or current year as fallback
 */
function extractYearFromDate(dateStr?: string): string {
  if (!dateStr) {
    return new Date().getFullYear().toString();
  }

  try {
    const date = new Date(dateStr);
    return date.getFullYear().toString();
  } catch (e) {
    return new Date().getFullYear().toString();
  }
}

/**
 * Sanitizes text for use in BibTeX entries by escaping special characters
 *
 * @param text The text to sanitize
 * @returns Sanitized text safe for BibTeX
 */
function sanitizeBibTeXText(text: string): string {
  if (!text) return "";

  // Replace special characters that need to be escaped in BibTeX
  return (
    text
      .replace(/[&%$#_{}~^\\\s]/g, (match) => {
        if (match === " ") return " ";
        return `\\${match}`;
      })
      // Replace Unicode characters with LaTeX equivalents where possible
      .replace(/[""]/g, "``")
      .replace(/['']/g, "''")
      .replace(/—/g, "---")
      .replace(/–/g, "--")
  );
}

/**
 * Generates a unique BibTeX key from title and authors
 *
 * @param title Paper title
 * @param authors List of author names
 * @param year Publication year
 * @returns A unique BibTeX key
 */
function generateBibTeXKey(
  title: string,
  authors: string[],
  year?: string
): string {
  // Use the first author's last name, or "Unknown" if no authors
  let authorPart = "Unknown";
  if (authors && authors.length > 0) {
    const firstAuthor = authors[0];
    // Get last name (assuming the last word is the last name)
    const authorWords = firstAuthor.split(" ");
    authorPart = authorWords[authorWords.length - 1].toLowerCase();
  }

  // Get first substantive word from title (skip articles like "the", "a", etc.)
  const skipWords = ["a", "an", "the", "on", "in", "of", "for", "and", "or"];
  const titleWords = title.split(" ");
  let titlePart = "";
  for (const word of titleWords) {
    const cleanWord = word.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (cleanWord.length > 2 && !skipWords.includes(cleanWord)) {
      titlePart = cleanWord;
      break;
    }
  }
  // If no suitable word found, use the first word
  if (!titlePart && titleWords.length > 0) {
    titlePart = titleWords[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  // Use year if available, or current year
  const yearPart = year || new Date().getFullYear().toString();

  // Combine parts to form key
  return `${authorPart}${yearPart}${titlePart}`;
}

/**
 * Converts a BibTeX entry object to a formatted BibTeX string
 *
 * @param entry The BibTeX entry object
 * @returns Formatted BibTeX string
 */
function formatBibTeXEntry(entry: BibTeXEntry): string {
  let bibtex = `@${entry.type}{${entry.key},\n`;

  // Add title (required)
  bibtex += `  title={${sanitizeBibTeXText(entry.title)}},\n`;

  // Add authors
  if (entry.authors && entry.authors.length > 0) {
    const authorStr = entry.authors
      .map((author) => sanitizeBibTeXText(author))
      .join(" and ");
    bibtex += `  author={${authorStr}},\n`;
  } else {
    bibtex += `  author={Unknown},\n`;
  }

  // Add optional fields
  if (entry.year) bibtex += `  year={${entry.year}},\n`;
  if (entry.journal)
    bibtex += `  journal={${sanitizeBibTeXText(entry.journal)}},\n`;
  if (entry.booktitle)
    bibtex += `  booktitle={${sanitizeBibTeXText(entry.booktitle)}},\n`;
  if (entry.volume) bibtex += `  volume={${entry.volume}},\n`;
  if (entry.issue) bibtex += `  number={${entry.issue}},\n`;
  if (entry.pages) bibtex += `  pages={${entry.pages}},\n`;
  if (entry.publisher)
    bibtex += `  publisher={${sanitizeBibTeXText(entry.publisher)}},\n`;
  if (entry.doi) bibtex += `  doi={${entry.doi}},\n`;
  if (entry.url) bibtex += `  url={${entry.url}},\n`;
  if (entry.abstract)
    bibtex += `  abstract={${sanitizeBibTeXText(entry.abstract)}},\n`;

  // Add any additional fields
  for (const [key, value] of Object.entries(entry)) {
    const skipFields = [
      "key",
      "type",
      "title",
      "authors",
      "year",
      "journal",
      "booktitle",
      "volume",
      "issue",
      "pages",
      "publisher",
      "doi",
      "url",
      "abstract",
    ];
    if (!skipFields.includes(key) && value !== undefined) {
      const formattedValue =
        typeof value === "string" ? sanitizeBibTeXText(value) : value;
      bibtex += `  ${key}={${formattedValue}},\n`;
    }
  }

  // Remove the last comma and close the entry
  bibtex = bibtex.slice(0, -2) + "\n}";

  return bibtex;
}

/**
 * Generates a mock BibTeX entry for a paper based on its title
 *
 * @param title Paper title
 * @param options Options for configuring the mock entry
 * @returns BibTeX entry object
 */
function generateMockBibTeXEntry(
  title: string,
  options: BibTeXGenerationOptions = DEFAULT_OPTIONS
): BibTeXEntry {
  const currentYear = new Date().getFullYear().toString();
  const entryType = options.mockEntryType || "article";

  // Create mock authors (placeholder)
  const authors = ["Author, Example"];

  // Generate a key from title
  const key = generateBibTeXKey(title, authors, currentYear);

  // Create the entry with minimal fields
  const entry: BibTeXEntry = {
    key,
    type: entryType,
    title,
    authors,
    year: currentYear,
    journal: "Journal of Important Research",
    volume: "1",
    issue: "1",
    pages: "1--10",
  };

  // Add abstract if requested
  if (options.includeAbstract) {
    entry.abstract =
      `This is a placeholder abstract for the paper titled "${title}". ` +
      "The actual abstract could not be retrieved automatically. " +
      "Please replace this with the actual abstract if available.";
  }

  return entry;
}

/**
 * Searches for a paper on Semantic Scholar API by title
 *
 * @param title Paper title to search for
 * @param maxResults Maximum number of results to fetch
 * @returns Promise resolving to array of paper results
 */
async function searchSemanticScholar(
  title: string,
  maxResults: number = 3
): Promise<SemanticScholarPaperResponse[]> {
  try {
    // Format the query URL
    const encodedTitle = encodeURIComponent(title);
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedTitle}&limit=${maxResults}&fields=title,authors,venue,year,abstract,externalIds,url`;

    // Make the request
    const response = await fetch(apiUrl);

    if (!response.ok) {
      throw new Error(
        `Semantic Scholar API error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error searching Semantic Scholar:", error);
    return [];
  }
}

/**
 * Converts a Semantic Scholar paper to a BibTeX entry
 *
 * @param paper Semantic Scholar paper object
 * @param options BibTeX generation options
 * @returns BibTeX entry object
 */
function semanticScholarToBibTeX(
  paper: SemanticScholarPaperResponse,
  options: BibTeXGenerationOptions = DEFAULT_OPTIONS
): BibTeXEntry {
  // Extract authors
  const authors = paper.authors.map((author) => author.name);

  // Generate BibTeX key
  const key = generateBibTeXKey(paper.title, authors, paper.year?.toString());

  // Create the entry
  const entry: BibTeXEntry = {
    key,
    type: "article", // Default to article, could be more specific based on venue
    title: paper.title,
    authors,
    year: paper.year?.toString(),
    journal: paper.venue,
    url: paper.url,
  };

  // Add DOI if available
  if (paper.externalIds?.DOI) {
    entry.doi = paper.externalIds.DOI;
  }

  // Add abstract if requested
  if (options.includeAbstract && paper.abstract) {
    entry.abstract = paper.abstract;
  }

  return entry;
}

/**
 * Generates BibTeX entries for a paper based on its title
 * Uses Semantic Scholar API if available, otherwise generates mock entries
 *
 * @param title Paper title
 * @param options Options for BibTeX generation
 * @returns Promise resolving to a string with the BibTeX entry or empty string to indicate failure
 */
export async function generateBibTeXFromTitle(
  title: string,
  options: BibTeXGenerationOptions = DEFAULT_OPTIONS
): Promise<string> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  let entry: BibTeXEntry;
  let usedMockEntry = false;

  // Try to use Semantic Scholar API if enabled
  if (mergedOptions.useApi) {
    try {
      const results = await searchSemanticScholar(
        title,
        mergedOptions.maxResults
      );

      if (results && results.length > 0) {
        // Use the first (best) match
        entry = semanticScholarToBibTeX(results[0], mergedOptions);
      } else {
        // No results, use mock entry
        entry = generateMockBibTeXEntry(title, mergedOptions);
        usedMockEntry = true;
      }
    } catch (error) {
      console.error("Error generating BibTeX from API:", error);
      // Fallback to mock entry
      entry = generateMockBibTeXEntry(title, mergedOptions);
      usedMockEntry = true;
    }
  } else {
    // Use mock entry directly if API is disabled
    entry = generateMockBibTeXEntry(title, mergedOptions);
    usedMockEntry = true;
  }

  // Format the entry to BibTeX string
  const formattedEntry = formatBibTeXEntry(entry);
  
  // Return empty string if we used a mock entry to indicate failure in the UI
  // but still provide the mock entry for content-utils.ts to use as fallback
  return usedMockEntry ? "" : formattedEntry;
}

/**
 * Generates a BibTeX citation from markdown content
 * First extracts the title, then generates BibTeX based on that title
 *
 * @param markdownContent The markdown content to extract title from
 * @param options Options for BibTeX generation
 * @returns Promise resolving to a string with the BibTeX entry
 */
export async function generateBibTeXFromMarkdown(
  markdownContent: string,
  options: BibTeXGenerationOptions = DEFAULT_OPTIONS
): Promise<string> {
  // Extract title from markdown
  const title = extractTitle(markdownContent);

  // Generate BibTeX
  return generateBibTeXFromTitle(title, options);
}
