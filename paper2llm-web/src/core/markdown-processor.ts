// AI Summary: Processes OCR-generated Markdown with additional enhancements.
// Handles format normalization, image references, and content cleanup.
// Now includes image description integration to replace images with AI-generated descriptions.

import {
  OcrResult,
  MarkdownOptions,
  MarkdownResult,
  OcrImage,
  OcrPage,
} from "../types/interfaces";

export class MarkdownProcessor {
  /**
   * Processes OCR-generated markdown with additional enhancements
   */
  public processMarkdown(
    ocrResult: OcrResult,
    options: MarkdownOptions = {}
  ): MarkdownResult {
    try {
      // Initialize markdown content array to collect all pages
      const markdownParts: string[] = [];

      // Track all image references for potential future enhancement
      const imageReferences: string[] = [];

      // Process each page from the OCR result
      ocrResult.pages.forEach((page) => {
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
          markdownParts.push("\n\n---\n\n");
        }

        // Add page number as heading if configured
        if (options.addPageNumbers) {
          markdownParts.push(`## Page ${page.index + 1}\n\n`);
        }

        // Remove double line breaks if configured
        if (options.normalizeLineBreaks) {
          pageContent = pageContent.replace(/\n{3,}/g, "\n\n");
        }

        // Add the processed page content
        markdownParts.push(pageContent);
      });

      // Combine all parts into a single markdown string
      const combinedMarkdown = markdownParts.join("");

      // Return the formatted result
      return {
        markdown: combinedMarkdown,
        imageReferences,
        pageCount: ocrResult.pages.length,
        model: ocrResult.model,
      };
    } catch (error) {
      throw new Error(
        `Markdown processing failed: ${(error as Error).message}`
      );
    }
  }

  /**
   * Replaces image references in markdown with enhanced versions
   * with AI-generated descriptions
   *
   * @param markdown The original markdown content
   * @param imageDescriptions Map of image IDs to descriptions
   * @param options Formatting options for the descriptions
   * @returns Enhanced markdown with image descriptions
   */
  public enhanceImageReferences(
    markdown: string,
    imageDescriptions: Map<string, string>,
    options: MarkdownOptions = {}
  ): string {
    try {
      // If no image descriptions provided, return original markdown
      if (!imageDescriptions || imageDescriptions.size === 0) {
        if (options.debugMode) {
          console.log('No image descriptions provided, returning original markdown');
        }
        return markdown;
      }

      if (options.debugMode) {
        console.log(`Enhancing markdown with ${imageDescriptions.size} image descriptions`);
        console.log('Image IDs available:', Array.from(imageDescriptions.keys()));
      }

      let enhancedMarkdown = markdown;

      // Enhanced regex to match various image reference formats
      // This pattern matches standard markdown image syntax with various attributes
      const imgRegex = /!\[(.*?)\](?:\{.*?\})?\((.*?)(?:\s+["'].*?["'])?\)/g;
      const matches: { full: string; alt: string; src: string }[] = [];

      // First collect all matches to avoid modifying the string while matching
      let match;
      while ((match = imgRegex.exec(markdown)) !== null) {
        if (match[2]) {
          matches.push({
            full: match[0],
            alt: match[1] || "",
            src: match[2],
          });
        }
      }

      if (options.debugMode) {
        console.log(`Found ${matches.length} image references in markdown`);
        matches.forEach((m, i) => {
          console.log(`Image ${i+1}: ${m.full} (alt: "${m.alt}", src: "${m.src}")`);
        });
      }

      // Now replace each image reference with its description
      for (const match of matches) {
        // Extract the image ID from the source - handle various formats
        // Remove any path prefixes, query params, and decode URI components to match raw ID
        let imageId = match.src;
        
        // Strip any path prefixes
        imageId = imageId.split('/').pop() || imageId;
        
        // Remove query params if any
        imageId = imageId.split('?')[0];
        
        // Try direct match first
        let description = imageDescriptions.get(imageId);
        
        // If no match, try to find by partial matching (case-insensitive comparison)
        if (!description) {
          const potentialMatches = Array.from(imageDescriptions.keys()).filter(
            key => key.toLowerCase().includes(imageId.toLowerCase()) || 
                  imageId.toLowerCase().includes(key.toLowerCase())
          );
          
          if (potentialMatches.length > 0) {
            // Use the first potential match
            if (options.debugMode) {
              console.log(`No exact match for ${imageId}, using potential match: ${potentialMatches[0]}`);
            }
            description = imageDescriptions.get(potentialMatches[0]);
          }
        }

        if (options.debugMode) {
          console.log(`Looking for description for image: ${imageId}`);
          console.log(`Description found: ${description ? 'Yes' : 'No'}`);
        }

        if (description) {
          // Format the replacement based on options
          let replacement = "";

          if (options.keepOriginalImages) {
            // Keep the original image reference and add the description
            replacement = `${match.full}\n\n> **Image Description:** ${description}\n\n`;
          } else {
            // Replace the image with just the description
            const captionPrefix = match.alt
              ? `**${match.alt}:** `
              : "**Image Description:** ";
            replacement = `> ${captionPrefix}${description}\n\n`;
          }

          if (options.debugMode) {
            console.log(`Replacing image reference "${match.full}" with description`);
          }

          // Replace the image reference with the enhanced version
          enhancedMarkdown = enhancedMarkdown.replace(match.full, replacement);
        } else if (options.debugMode) {
          console.log(`No description found for image: ${imageId}`);
        }
      }

      return enhancedMarkdown;
    } catch (error) {
      console.error("Error enhancing image references:", error);
      return markdown; // Return original if enhancement fails
    }
  }

  /**
   * Builds a context map for images based on their position in the document
   *
   * @param pages Array of OCR pages
   * @returns Map of image IDs to context text
   */
  public buildImageContextMap(pages: OcrPage[]): Map<string, string> {
    const contextMap = new Map<string, string>();

    // Process each page and extract context for images
    pages.forEach((page) => {
      const pageContent = page.markdown;

      // Process each image on the page
      page.images.forEach((image) => {
        // Extract context based on image position
        let context = this.extractImageContext(pageContent, image);

        // Store the context
        contextMap.set(image.id, context);
      });
    });

    return contextMap;
  }

  /**
   * Extracts context for an image based on its position in the document
   *
   * @param pageContent Markdown content of the page
   * @param image Image object with position data
   * @returns Extracted context text
   */
  private extractImageContext(pageContent: string, image: OcrImage): string {
    // Split the markdown into lines
    const lines = pageContent.split("\n");
    
    // Position-based context extraction
    const topY = image.topLeftY;
    const bottomY = image.bottomRightY;
    
    // Look for content near the image position
    // This assumes lines in the markdown roughly correspond to vertical position
    
    // Define a window of lines to check before and after the estimated image position
    // This is a heuristic approach - we don't know exactly which lines correspond to image position
    const lineCount = lines.length;
    const estimatedPositionRatio = (topY + bottomY) / 2 / 1000; // Assuming page height normalized to 1000
    const estimatedLinePosition = Math.floor(lineCount * estimatedPositionRatio);
    
    // Get lines around the estimated position (25% of document)
    const contextWindowSize = Math.floor(lineCount * 0.25);
    const startLine = Math.max(0, estimatedLinePosition - contextWindowSize);
    const endLine = Math.min(lineCount, estimatedLinePosition + contextWindowSize);
    
    // Extract potential context lines
    const nearbyLines = lines.slice(startLine, endLine);
    
    // Look for captions and headings in nearby lines
    const captionPatterns = [
      /figure \d+/i,
      /fig\. \d+/i,
      /fig \d+/i,
      /table \d+/i,
      /diagram/i,
      /illustration/i,
      /chart/i,
      /graph/i,
      /image/i,
      /caption/i
    ];
    
    const headingPattern = /^#{1,6}\s+.+$/;
    
    // Find the closest heading before the image
    const headings = nearbyLines
      .filter(line => headingPattern.test(line))
      .map(line => line.replace(/^#{1,6}\s+/, '').trim());
    
    // Find potential captions
    const captions = nearbyLines.filter(line => 
      captionPatterns.some(pattern => pattern.test(line)) &&
      !line.includes('![') // Exclude markdown image syntax
    );
    
    // Build context string, prioritizing captions and headings
    let contextParts: string[] = [];
    
    if (headings.length > 0) {
      // Take the last heading before the image position
      contextParts.push(`Section: ${headings[headings.length - 1]}`);
    }
    
    if (captions.length > 0) {
      // Take the closest caption
      contextParts.push(`Caption: ${captions[0].trim()}`);
    } else {
      // If no caption found, include a few lines around the image for context
      const surroundingText = nearbyLines
        .filter(line => 
          line.trim().length > 20 && // Only substantial lines
          !line.startsWith('#') &&   // Not headings
          !line.includes('![')       // Not image references
        )
        .slice(0, 3)                 // Take up to 3 lines
        .join(' ');
      
      if (surroundingText) {
        contextParts.push(`Surrounding text: ${surroundingText}`);
      }
    }
    
    // Add image position information
    contextParts.push(`Image appears on page ${image.id.split('-')[0] || 'unknown'}`);
    
    return contextParts.join('. ');
  }
}

// Create a singleton instance for easy import
export const markdownProcessor = new MarkdownProcessor();
