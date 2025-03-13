// AI Summary: Utility for splitting Markdown documents into main, backmatter, and appendix sections.
// Detects section boundaries using regex patterns for different heading formats.
// Provides functions to extract metadata and handle various academic paper formats.

/**
 * Represents the sections of a split Markdown document
 */
export interface MarkdownSections {
  /**
   * The main content of the document (excluding backmatter and appendix)
   */
  mainContent: string;
  
  /**
   * The backmatter section (acknowledgments, author contributions, etc.)
   * May be null if not present in the document
   */
  backmatter: string | null;
  
  /**
   * The appendix section (supplementary materials, additional data, etc.)
   * May be null if not present in the document
   */
  appendix: string | null;
  
  /**
   * The original title of the document
   */
  title: string;
}

/**
 * Represents metadata about the sections of a Markdown document
 */
export interface MarkdownSectionsMetadata {
  /**
   * Whether the document has a backmatter section
   */
  hasBackmatter: boolean;
  
  /**
   * Whether the document has an appendix section
   */
  hasAppendix: boolean;
  
  /**
   * Approximate word count for each section
   */
  wordCount: {
    mainContent: number;
    backmatter: number | null;
    appendix: number | null;
    total: number;
  };
  
  /**
   * The original title of the document
   */
  title: string;
}

/**
 * Extracts the title from the Markdown content
 * First tries to find title from level-1 header, then from BibTeX citation
 * 
 * @param content The Markdown content
 * @returns The extracted title or "Untitled_Paper" if no title found
 */
export function extractTitle(content: string): string {
  // First try to find title from level-1 header
  const titleMatch = content.match(/^# (.+?)$/m);
  if (titleMatch) {
    return titleMatch[1].trim();
  }
  
  // If no header title found, try to extract from BibTeX citation
  const bibtexMatch = content.match(/title={([^}]*)}/);
  if (bibtexMatch) {
    return bibtexMatch[1].trim();
  }
  
  // If no title can be found, use a placeholder
  return "Untitled_Paper";
}

/**
 * Find the boundaries for main content, backmatter, and appendix
 * 
 * @param content The Markdown content
 * @returns A tuple of [backmatterStart, appendixStart] indices or null if not found
 */
export function findSectionBoundaries(content: string): [number | null, number | null] {
  // Define regex patterns for different section headers
  // Match variations of acknowledgment sections and impact statements (different heading levels and spellings)
  const ackPatterns = [
    /^#+\s+(Acknowledgments?)\b/mi,
    /^#+\s+(Acknowledgements?)\b/mi,
    /^#+\s+Author\s+(Contributions|contributions)/mi,
    /^#+\s+Funding/mi,
    /^#+\s+Impact\s+(Statement|statement)/mi,
    /^#+\s+Broader\s+(Impact|impact)/mi,
    /^#+\s+Societal\s+(Impact|impact)/mi,
    /^#+\s+Ethical\s+(Considerations|considerations)/mi
  ];
  
  // Match variations of appendix/supplementary sections (including lowercase variants)
  const appendixPatterns = [
    /^#+\s+(Appendix|Appendices|appendix|appendices)\b/mi,
    /^#+\s+(Supplementary|Supporting|supplementary|supporting)\s+(Material|Materials|Information|Data|material|materials|information|data)/mi,
    /^#+\s+(Supplemental|supplemental)\s+/mi,
    /^#+\s+SI\s+/mi,
    /^#+\s+S\d+\.\s+/mi, // Matches S1., S2., etc. (common in supplementary sections)
    /^#+\s+A\s+/mi,      // Matches headings starting with "A " (common appendix format)
    /^#+\s+A\.\s+/mi     // Matches headings starting with "A. " (common appendix format)
  ];
  
  // Pattern for page markers
  const pageMarkerPattern = /^#{3,4}\s+Page\s+\d+\s*$/mi;
  
  // Find acknowledgment section
  let ackStart: number | null = null;
  let ackMatch: RegExpExecArray | null = null;
  
  for (const pattern of ackPatterns) {
    const match = pattern.exec(content);
    if (match && (!ackMatch || match.index < ackMatch.index)) {
      ackMatch = match;
      ackStart = match.index;
    }
  }
  
  // Find appendix section
  let appendixStart: number | null = null;
  let appendixMatch: RegExpExecArray | null = null;
  
  for (const pattern of appendixPatterns) {
    const match = pattern.exec(content);
    if (match && (!appendixMatch || match.index < appendixMatch.index)) {
      // For "A " or "A. " patterns, verify they occur after acknowledgments to avoid false positives
      if ((pattern.source === '^#+\\s+A\\s+' || pattern.source === '^#+\\s+A\\.\\s+') && ackStart !== null) {
        // Only accept the match if it occurs after acknowledgments
        if (match.index > ackStart) {
          appendixMatch = match;
          appendixStart = match.index;
        }
      } else {
        // For all other patterns, accept the match as normal
        appendixMatch = match;
        appendixStart = match.index;
      }
    }
  }
  
  // Check for page markers before sections
  if (ackStart !== null) {
    // Look for page marker before backmatter section
    const contentBeforeAck = content.substring(0, ackStart);
    const linesBeforeAck = contentBeforeAck.split('\n');
    
    // Start from the end and look for page marker
    for (let i = linesBeforeAck.length - 1; i >= Math.max(0, linesBeforeAck.length - 5); i--) {
      if (pageMarkerPattern.test(linesBeforeAck[i])) {
        // Found a page marker, adjust ackStart to include it
        const linePos = contentBeforeAck.lastIndexOf(linesBeforeAck[i]);
        if (linePos >= 0) {
          ackStart = linePos;
        }
        break;
      }
    }
  }
  
  if (appendixStart !== null) {
    // Look for page marker before appendix section
    const contentBeforeAppendix = content.substring(0, appendixStart);
    const linesBeforeAppendix = contentBeforeAppendix.split('\n');
    
    // Start from the end and look for page marker
    for (let i = linesBeforeAppendix.length - 1; i >= Math.max(0, linesBeforeAppendix.length - 5); i--) {
      if (pageMarkerPattern.test(linesBeforeAppendix[i])) {
        // Found a page marker, adjust appendixStart to include it
        const linePos = contentBeforeAppendix.lastIndexOf(linesBeforeAppendix[i]);
        if (linePos >= 0) {
          appendixStart = linePos;
        }
        break;
      }
    }
  }
  
  // If both ack and appendix are found, ensure they're in the right order
  if (ackStart !== null && appendixStart !== null) {
    // If ack appears after appendix, we probably found a mention of acknowledgments in the appendix
    // In this case, ignore the ack we found and look for one before the appendix
    if (ackStart > appendixStart) {
      const ackContent = content.substring(0, appendixStart);
      ackStart = null;
      
      for (const pattern of ackPatterns) {
        const match = pattern.exec(ackContent);
        if (match) {
          ackStart = match.index;
          
          // Check for page marker before this ack section
          const contentBeforeNewAck = content.substring(0, ackStart);
          const linesBeforeNewAck = contentBeforeNewAck.split('\n');
          
          for (let i = linesBeforeNewAck.length - 1; i >= Math.max(0, linesBeforeNewAck.length - 5); i--) {
            if (pageMarkerPattern.test(linesBeforeNewAck[i])) {
              const linePos = contentBeforeNewAck.lastIndexOf(linesBeforeNewAck[i]);
              if (linePos >= 0) {
                ackStart = linePos;
              }
              break;
            }
          }
          break;
        }
      }
    }
  }
  
  return [ackStart, appendixStart];
}

/**
 * Splits a Markdown document into main content, backmatter, and appendix
 * 
 * @param content The full Markdown content to split
 * @returns Object containing the different sections and the title
 */
export function splitMarkdownContent(content: string): MarkdownSections {
  // Extract title
  const title = extractTitle(content);
  
  // Find section boundaries
  const [ackStart, appendixStart] = findSectionBoundaries(content);
  
  // Split the content
  let mainContent = content;
  let backmatterContent: string | null = null;
  let appendixContent: string | null = null;
  
  // If we found an appendix section
  if (appendixStart !== null) {
    appendixContent = content.substring(appendixStart);
    mainContent = content.substring(0, appendixStart);
  }
  
  // If we found a backmatter section (acknowledgments or impact statement)
  if (ackStart !== null) {
    // Adjust indices if appendix was already extracted
    if (appendixStart !== null && ackStart > appendixStart) {
      // Acknowledgments is after appendix start, meaning it's in the appendix
      // Already handled by the boundary check in findSectionBoundaries
    } else {
      backmatterContent = mainContent.substring(ackStart);
      mainContent = mainContent.substring(0, ackStart);
    }
  }
  
  // Clean up content (remove trailing "---" and whitespace)
  mainContent = mainContent.replace(/---\s*$/, '').trim();
  
  if (backmatterContent) {
    backmatterContent = backmatterContent.replace(/---\s*$/, '').trim();
  }
  
  if (appendixContent) {
    appendixContent = appendixContent.replace(/---\s*$/, '').trim();
  }
  
  return {
    mainContent,
    backmatter: backmatterContent,
    appendix: appendixContent,
    title
  };
}

/**
 * Calculates approximate word count for a string
 * 
 * @param text The text to count words in
 * @returns The number of words (approximate)
 */
function countWords(text: string | null): number {
  if (!text) return 0;
  
  // Split by whitespace and filter out empty strings
  const words = text.split(/\s+/).filter(word => word.length > 0);
  return words.length;
}

/**
 * Gets metadata about the sections of a Markdown document
 * 
 * @param content The full Markdown content
 * @returns Object with metadata about the sections
 */
export function getMarkdownSectionsMetadata(content: string): MarkdownSectionsMetadata {
  const sections = splitMarkdownContent(content);
  
  const wordCountMain = countWords(sections.mainContent);
  const wordCountBackmatter = sections.backmatter ? countWords(sections.backmatter) : null;
  const wordCountAppendix = sections.appendix ? countWords(sections.appendix) : null;
  
  const totalWordCount = wordCountMain + 
    (wordCountBackmatter || 0) + 
    (wordCountAppendix || 0);
  
  return {
    hasBackmatter: sections.backmatter !== null,
    hasAppendix: sections.appendix !== null,
    wordCount: {
      mainContent: wordCountMain,
      backmatter: wordCountBackmatter,
      appendix: wordCountAppendix,
      total: totalWordCount
    },
    title: sections.title
  };
}

/**
 * Formats a section with a title header
 * 
 * @param content The section content
 * @param title The document title
 * @param sectionName The name of the section to append to the title
 * @returns Formatted section with title header
 */
export function formatSectionWithHeader(content: string, title: string, sectionName: string): string {
  return `# ${title} - ${sectionName}\n\n---\n\n${content}`;
}

/**
 * Prepares sections for downloading by adding appropriate headers
 * 
 * @param sections The split sections object
 * @returns Object with formatted sections ready for download
 */
export function prepareFormattedSections(sections: MarkdownSections): {
  mainContent: string;
  backmatter: string | null;
  appendix: string | null;
} {
  // Ensure main content has the title
  const mainContent = sections.mainContent.replace(/^# .*$/m, `# ${sections.title}`);
  
  // Format backmatter and appendix with section headers
  const backmatter = sections.backmatter 
    ? formatSectionWithHeader(sections.backmatter, sections.title, 'Backmatter')
    : null;
    
  const appendix = sections.appendix
    ? formatSectionWithHeader(sections.appendix, sections.title, 'Appendix')
    : null;
    
  return {
    mainContent,
    backmatter,
    appendix
  };
}
