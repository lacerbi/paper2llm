// AI Summary: Exports template string and utilities for image description prompts.
// Includes XML tag formatting requirements and extraction functions.
// Supports context text insertion and robust tag-based response processing.

/**
 * Template for generating image description prompts
 * Used by the Vision API to analyze images
 *
 * The template contains a placeholder for context:
 * {contextText} - Will be replaced with context if available
 */
export const IMAGE_PROMPT_TEMPLATE = `# Task

Please describe the visual content of this image in detail, focusing on all visible elements, text, and relevant information.

- Focus primarily on visual elements directly observable in the image: shapes, colors, objects, arrangements, and any visible text. When appropriate, include reasonable interpretation of what these elements represent based on their visual context.
- For academic or technical visuals: Identify the specific type (bar chart, line graph, flow diagram, etc.). Describe axes, labels, data points, and visual patterns exactly as they appear in the image.
- For any text visible in the image: Provide an accurate transcription, maintaining the original layout where meaningful.
- For images with multiple panels: Describe each panel separately based on its visual appearance. Note any panel labels if present. If the composition is unusual or the panels interact in a non-standard way, explain their relationship.
{contextText}

# Format

- Begin with a concise overview sentence identifying the type of image (e.g., "A line graph showing...", "A diagram illustrating...", "A photograph of...").
- Then provide specific details in a well-structured format. Use multiple paragraphs if necessary to organize different aspects of complex images.
- For complex visuals, you may use bullet points or numbered lists to clearly separate distinct elements.
- Adjust the length of your description based on the complexity of the image - simple images may need only a paragraph, while complex diagrams might require more detailed explanations.

IMPORTANT: You must wrap your entire description inside <img_desc> and </img_desc> XML tags like this:

<img_desc>Your detailed description goes here.</img_desc>

Do not include anything else outside these tags.`;

/**
 * Formats the image prompt template with the provided context text
 *
 * @param contextText Optional context text to include in the prompt
 * @returns Formatted prompt string
 */
export function formatImagePrompt(contextText?: string): string {
  if (!contextText) {
    // If no context is provided, remove the placeholder
    return IMAGE_PROMPT_TEMPLATE.replace("{contextText}", "");
  }

  // Insert the context text with formatting
  const formattedContext = `#Context\n\nContext for reference:\n\n<context>\n${contextText}\n</context>\n\nUse this to correctly identify technical terms and provide reasonable interpretations of what you can see in the image.\nYour image description should still focus primarily on the visual aspects of the figure and not be a mere repetition of the image caption or provided context.\n`;

  return IMAGE_PROMPT_TEMPLATE.replace("{contextText}", formattedContext);
}

/**
 * Extracts the image description from within XML tags
 *
 * @param response The raw response string from the Vision API
 * @returns The extracted description or null if no valid description found
 * @throws Error if the response format is invalid (no opening tag)
 */
export function extractDescriptionFromTags(response: string): string | null {
  if (!response || typeof response !== "string") {
    return null;
  }

  // Trim the response to remove any leading/trailing whitespace
  const trimmedResponse = response.trim();

  // Check for opening tag
  const openingTagIndex = trimmedResponse.indexOf("<img_desc>");
  if (openingTagIndex === -1) {
    // No opening tag found, return null indicating invalid format
    return null;
  }

  // Extract content after opening tag
  const contentStart = openingTagIndex + "<img_desc>".length;

  // Look for closing tag
  const closingTagIndex = trimmedResponse.indexOf("</img_desc>", contentStart);

  // If closing tag exists, extract content between tags
  // Otherwise, take everything after opening tag (handling incomplete tagging)
  const content =
    closingTagIndex !== -1
      ? trimmedResponse.substring(contentStart, closingTagIndex)
      : trimmedResponse.substring(contentStart);

  return content.trim();
}
