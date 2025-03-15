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
          markdownParts.push(`#### Page ${page.index + 1}\n\n`);
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
  /**
   * Ensures proper spacing around image description blocks and figure captions in markdown
   *
   * @param markdown The markdown content to process
   * @returns Processed markdown with proper spacing around image descriptions and figure captions
   */
  private ensureImageDescriptionSpacing(markdown: string): string {
    if (!markdown) {
      return markdown;
    }

    // Split the markdown into lines to process it line by line
    const lines = markdown.split("\n");
    let result = [];
    let inImageBlock = false;
    let afterImageBlock = false; // New state variable to track if we're after an image block
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // Check if this line starts a new image description block
      if (
        !inImageBlock &&
        line.match(/^> \*\*(?:Image description|Image Description|Image)\.\*\*/)
      ) {
        // We found the start of an image block
        inImageBlock = true;
        afterImageBlock = false; // Reset since we're entering a new block

        // Ensure there's an empty line before (unless at the beginning of the document)
        if (i > 0 && result.length > 0 && result[result.length - 1] !== "") {
          result.push("");
        }

        // Add the current line
        result.push(line);
      }
      // Check if we're in an image block and the current line is part of it
      else if (inImageBlock && line.startsWith(">")) {
        // Continue the image block
        result.push(line);
      }
      // Check if we're exiting an image block
      else if (inImageBlock) {
        // End of image block
        inImageBlock = false;
        afterImageBlock = true; // Mark that we just exited an image block

        // Ensure there's an empty line after the block
        if (line !== "") {
          result.push("");
        }

        // Add the current line (unless it's already an empty line)
        if (line !== "") {
          result.push(line);
        }
      }
      // Check for figure captions after image blocks (with possible empty lines in between)
      else if (afterImageBlock && line.match(/^Figure /)) {
        // This is a figure caption after an image block

        // Ensure there's an empty line before the figure caption
        if (result.length > 0 && result[result.length - 1] !== "") {
          result.push("");
        }

        // Add the figure caption
        result.push(line);

        // Ensure there's an empty line after the figure caption
        if (i < lines.length - 1 && lines[i + 1] !== "") {
          result.push("");
        }
      }
      else {
        // Regular line, not part of an image block or figure caption
        result.push(line);
        
        // If this is a non-empty line and not a figure caption, 
        // we're no longer right after an image block
        if (line !== "" && !line.match(/^Figure /)) {
          afterImageBlock = false;
        }
      }

      i++;
    }

    // If the document ends with an image block, ensure there's an empty line after
    if (inImageBlock) {
      result.push("");
    }

    // Join the lines back into a single string
    return result.join("\n");
  }

  public enhanceImageReferences(
    markdown: string,
    imageDescriptions: Map<string, string>,
    options: MarkdownOptions = {}
  ): string {
    try {
      // If no image descriptions provided and we're not in the special "no descriptions" mode,
      // return original markdown
      if (
        (!imageDescriptions || imageDescriptions.size === 0) &&
        !options.replaceImagesWithPlaceholder
      ) {
        if (options.debugMode) {
          console.log(
            "No image descriptions provided, returning original markdown"
          );
        }
        return markdown;
      }

      if (options.debugMode) {
        console.log(
          `Enhancing markdown with ${imageDescriptions.size} image descriptions`
        );
        console.log(
          "Image IDs available:",
          Array.from(imageDescriptions.keys())
        );
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
          console.log(
            `Image ${i + 1}: ${m.full} (alt: "${m.alt}", src: "${m.src}")`
          );
        });
      }

      // Now replace each image reference with its description
      for (const match of matches) {
        // Extract the image ID from the source - handle various formats
        // Remove any path prefixes, query params, and decode URI components to match raw ID
        let imageId = match.src;

        // Strip any path prefixes
        imageId = imageId.split("/").pop() || imageId;

        // Remove query params if any
        imageId = imageId.split("?")[0];

        // Try direct match first
        let description = imageDescriptions?.get(imageId);

        // If no match, try to find by partial matching (case-insensitive comparison)
        if (!description && imageDescriptions) {
          const potentialMatches = Array.from(imageDescriptions.keys()).filter(
            (key) =>
              key.toLowerCase().includes(imageId.toLowerCase()) ||
              imageId.toLowerCase().includes(key.toLowerCase())
          );

          if (potentialMatches.length > 0) {
            // Use the first potential match
            if (options.debugMode) {
              console.log(
                `No exact match for ${imageId}, using potential match: ${potentialMatches[0]}`
              );
            }
            description = imageDescriptions.get(potentialMatches[0]);
          }
        }

        if (options.debugMode) {
          console.log(`Looking for description for image: ${imageId}`);
          console.log(`Description found: ${description ? "Yes" : "No"}`);
        }

        // Format replacement based on whether we have a description or not
        let replacement = "";

        if (description) {
          // Post-process the description: only trim leading and trailing whitespace
          // but preserve internal newlines for formatting
          const trimmedDescription = description.trim();

          // Format the description as a proper markdown blockquote
          // Split by newlines, prefix each line with "> ", and add the header to the first line
          const lines = trimmedDescription.split("\n");
          const formattedLines = lines.map((line, index) => {
            if (index === 0) {
              // Add the header to the first line
              return `> **Image description.** ${line}`;
            } else {
              return `> ${line}`;
            }
          });

          // Join the lines back together with newlines
          const formattedDescription = formattedLines.join("\n");

          // Format the replacement based on options
          let replacement = "";

          if (options.keepOriginalImages) {
            // Keep the original image reference and add the description
            replacement = `${match.full}\n\n${formattedDescription}\n`;
          } else {
            // Replace the image with just the description
            replacement = `${formattedDescription}\n`;
          }

          if (options.debugMode) {
            console.log(
              `Replacing image reference "${match.full}" with description`
            );
          }

          // Replace the image reference with the enhanced version
          enhancedMarkdown = enhancedMarkdown.replace(match.full, replacement);
        } else if (options.replaceImagesWithPlaceholder) {
          // If no description is available and we're in placeholder mode,
          // replace with the default placeholder text
          replacement = "> **Image.** [not displayed]\n";

          if (options.debugMode) {
            console.log(
              `No description found for image: ${imageId}, using placeholder text`
            );
          }

          // Replace the image reference with the placeholder
          enhancedMarkdown = enhancedMarkdown.replace(match.full, replacement);
        } else if (options.debugMode) {
          console.log(`No description found for image: ${imageId}`);
        }
      }

      // Apply spacing fixes to the enhanced markdown
      enhancedMarkdown = this.ensureImageDescriptionSpacing(enhancedMarkdown);

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
   * Extracts context for an image from the page content
   *
   * Uses the entire page content as context instead of
   * position-based heuristics
   *
   * @param pageContent Markdown content of the page
   * @param image Image object with position data
   * @returns Extracted context text
   */
  private extractImageContext(pageContent: string, image: OcrImage): string {
    // Use the entire page content as context
    // This ensures we capture all relevant information including captions

    // Extract page number from image ID
    const pageNumber = image.id.split("-")[0] || "unknown";

    // Create a context summary
    const contextSummary = `This image appears on page ${pageNumber}. The surrounding page content follows.`;

    // Limit context length if too long (max ~2000 chars to avoid overwhelming the Vision API)
    let pageText = pageContent;
    if (pageText.length > 2000) {
      pageText = pageText.substring(0, 1997) + "...";
    }

    // Return combined context
    return `${contextSummary}\n\n${pageText}`;
  }
}

// Create a singleton instance for easy import
export const markdownProcessor = new MarkdownProcessor();
