// AI Summary: Exports a template string for image description prompts.
// Used by the image service to generate prompts for the Mistral Vision API.
// Supports context text insertion via a placeholder.

/**
 * Template for generating image description prompts
 * Used by the Mistral Vision API to analyze images
 *
 * The template contains a placeholder for context:
 * {contextText} - Will be replaced with context if available
 */
export const IMAGE_PROMPT_TEMPLATE = `Please describe the visual content of this image in detail, focusing on all visible elements, text, and relevant information.
Focus on visual elements directly observable in the image: shapes, colors, objects, arrangements, and any visible text.
For academic or technical visuals: Identify the specific type (bar chart, line graph, flow diagram, etc.). Describe axes, labels, data points, and visual patterns exactly as they appear in the image.
For any text visible in the image: Provide an accurate transcription, maintaining the original layout where meaningful.
For images with multiple panels: Describe each panel separately based on its visual appearance. Note any panel labels if present. If the composition is unusual or the panels interact in a non-standard way, explain their relationship.
{contextText}
Format your response as a clear, concise paragraph. Start with a overview sentence identifying the type of image (e.g., "A line graph showing...", "A diagram illustrating...", "A photograph of..."), then provide specific details.`;

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
  const formattedContext = `Context for reference: \n<context>\n${contextText}\n</context>\n. Use this only to correctly identify technical terms for what you can see in the image.\nYour image description should focus on the visual aspects of the figure and not a mere repetition of the image caption.`;

  return IMAGE_PROMPT_TEMPLATE.replace("{contextText}", formattedContext);
}
