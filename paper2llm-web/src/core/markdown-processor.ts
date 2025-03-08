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
        return markdown;
      }

      let enhancedMarkdown = markdown;

      // Process all image references in the markdown
      const imgRegex = /!\[(.*?)\]\((.*?)\)/g;
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

      // Now replace each image reference with its description
      for (const match of matches) {
        // Extract the image ID from the source
        const imageId = match.src;
        const description = imageDescriptions.get(imageId);

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

          // Replace the image reference with the enhanced version
          enhancedMarkdown = enhancedMarkdown.replace(match.full, replacement);
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

    // Look for captions (lines containing the image filename)
    const imageFilename = image.id;
    const captionLines: string[] = lines.filter(
      (line) =>
        line.includes(imageFilename) ||
        line.includes("Figure") ||
        line.includes("Table") ||
        line.includes("Chart")
    );

    // Look for nearby headers
    const headerLines: string[] = lines.filter((line) => line.startsWith("#"));

    // Combine caption and header information as context
    let context = "";

    if (headerLines.length > 0) {
      context +=
        "Document section: " +
        headerLines[headerLines.length - 1].replace(/#/g, "").trim() +
        ". ";
    }

    if (captionLines.length > 0) {
      context +=
        "Caption: " + captionLines[0].replace(/!\[.*?\]\(.*?\)/g, "").trim();
    }

    return context.trim();
  }
}

// Create a singleton instance for easy import
export const markdownProcessor = new MarkdownProcessor();
