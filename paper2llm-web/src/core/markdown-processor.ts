// AI Summary: Processes OCR-generated Markdown with additional enhancements.
// Handles format normalization, image references, and content cleanup.

import { OcrResult, MarkdownOptions, MarkdownResult } from '../types/interfaces';

export class MarkdownProcessor {
  /**
   * Processes OCR-generated markdown with additional enhancements
   */
  public processMarkdown(ocrResult: OcrResult, options: MarkdownOptions = {}): MarkdownResult {
    try {
      // Initialize markdown content array to collect all pages
      const markdownParts: string[] = [];
      
      // Track all image references for potential future enhancement
      const imageReferences: string[] = [];
      
      // Process each page from the OCR result
      ocrResult.pages.forEach(page => {
        let pageContent = page.markdown;
        
        // Extract image references if needed for future enhancement
        if (options.extractImageReferences) {
          const imgRegex = /!\[.*?\]\((.*?)\)/g;
          let match;
          while ((match = imgRegex.exec(pageContent)) !== null) {
            if (match[1]) {
              imageReferences.push(match[1]);
            }
          }
        }
        
        // Add page separator if configured and not the first page
        if (options.addPageSeparators && markdownParts.length > 0) {
          markdownParts.push('\n\n---\n\n');
        }
        
        // Add page number as heading if configured
        if (options.addPageNumbers) {
          markdownParts.push(`## Page ${page.index + 1}\n\n`);
        }
        
        // Remove double line breaks if configured
        if (options.normalizeLineBreaks) {
          pageContent = pageContent.replace(/\n{3,}/g, '\n\n');
        }
        
        // Add the processed page content
        markdownParts.push(pageContent);
      });
      
      // Combine all parts into a single markdown string
      const combinedMarkdown = markdownParts.join('');
      
      // Return the formatted result
      return {
        markdown: combinedMarkdown,
        imageReferences,
        pageCount: ocrResult.pages.length,
        model: ocrResult.model
      };
    } catch (error) {
      throw new Error(`Markdown processing failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Replaces image references in markdown with enhanced versions
   * (Placeholder for future image description enhancement)
   */
  public enhanceImageReferences(markdown: string, imageDescriptions: Record<string, string>): string {
    // Placeholder for future implementation
    // This will be enhanced in a future phase to add image descriptions
    return markdown;
  }
}

// Create a singleton instance for easy import
export const markdownProcessor = new MarkdownProcessor();
