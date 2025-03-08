// AI Summary: Implements Mistral Vision API integration for image description.
// Handles sending images to Mistral's Vision API with context and processing responses.
// Supports both individual and batch image processing with comprehensive error handling and retry logic.

import axios, { AxiosInstance, AxiosResponse } from "axios";
import {
  ImageService,
  OcrImage,
  ProgressReporter,
  ProgressUpdate,
} from "../types/interfaces";

/**
 * Custom error types for image processing failures
 */
export class ImageProcessingError extends Error {
  type: string;
  retryable: boolean;

  constructor(message: string, type: string, retryable: boolean = false) {
    super(message);
    this.name = "ImageProcessingError";
    this.type = type;
    this.retryable = retryable;
  }
}

/**
 * MistralImageService implements the ImageService interface to describe images
 * using Mistral's Vision API (pixtral model)
 */
export class MistralImageService implements ImageService {
  private readonly apiBaseUrl: string =
    "https://api.mistral.ai/v1/chat/completions";
  private readonly defaultModel: string = "pixtral-12b-2409";
  private axiosInstance: AxiosInstance;
  private abortController: AbortController | null = null;
  private maxRetries: number = 2;
  private retryDelay: number = 1000; // 1 second

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout
    });
  }

  /**
   * Describes an image using Mistral's Vision API
   *
   * @param image OcrImage object containing the image data and metadata
   * @param apiKey Mistral API key
   * @param contextText Optional context to include with the image
   * @returns Promise resolving to the image description
   */
  async describeImage(
    image: OcrImage,
    apiKey: string,
    contextText?: string,
    retryCount: number = 0
  ): Promise<string> {
    try {
      // Validate input parameters
      this.validateImageParameters(image, apiKey);

      // Create abort controller for request cancellation
      this.abortController = new AbortController();

      // Build the prompt for the image description
      const promptText = this.buildImagePrompt(contextText);

      // Prepare the image URL with base64 data, ensuring proper formatting
      const imageUrl = this.formatImageUrl(image.base64);

      // Create the request payload
      const payload = {
        model: this.defaultModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: promptText,
              },
              {
                type: "image_url",
                image_url: imageUrl,
              },
            ],
          },
        ],
        max_tokens: 500,
      };

      // Set up request configuration with abort signal
      const config = {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        signal: this.abortController.signal,
      };

      // Make the API request
      let response: AxiosResponse<any>;
      try {
        response = await this.axiosInstance.post("", payload, config);
      } catch (apiError: any) {
        // Handle specific API errors
        if (apiError.response) {
          const statusCode = apiError.response.status;
          const errorData = apiError.response.data?.error;

          // Check for specific error related to image formatting
          if (statusCode === 422) {
            const errorMessage = errorData?.message || "Unknown API error";
            console.error(
              `Vision API rejected request with 422 error: ${errorMessage}`
            );
            throw new ImageProcessingError(
              `Image format error: ${errorMessage}`,
              "format_error",
              false
            );
          }

          // Handle rate limiting
          if (statusCode === 429) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              "Vision API rate limit exceeded. Please try again later.",
              "rate_limit",
              retryable
            );
          }

          // Handle authentication errors
          if (statusCode === 401 || statusCode === 403) {
            throw new ImageProcessingError(
              "Invalid or unauthorized API key",
              "auth_error",
              false
            );
          }

          // Handle server errors (potentially retryable)
          if (statusCode >= 500) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              `Vision API server error (${statusCode})`,
              "server_error",
              retryable
            );
          }

          // Handle other API errors
          throw new ImageProcessingError(
            `Vision API error (${statusCode}): ${JSON.stringify(errorData)}`,
            "api_error",
            false
          );
        }

        // Handle network errors (potentially retryable)
        if (apiError.code === "ECONNABORTED" || apiError.code === "ETIMEDOUT") {
          const retryable = retryCount < this.maxRetries;
          throw new ImageProcessingError(
            `Network timeout while contacting Vision API: ${apiError.message}`,
            "timeout",
            retryable
          );
        }

        throw new ImageProcessingError(
          `API request failed: ${apiError.message}`,
          "request_error",
          retryCount < this.maxRetries
        );
      }

      // Extract and return the description from the response
      if (
        response.data &&
        response.data.choices &&
        response.data.choices.length > 0 &&
        response.data.choices[0].message &&
        response.data.choices[0].message.content
      ) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new ImageProcessingError(
          "Invalid response format from Vision API",
          "response_format",
          retryCount < this.maxRetries
        );
      }
    } catch (error: any) {
      // Handle request cancellation
      if (axios.isCancel(error)) {
        throw new ImageProcessingError(
          "Image description request was cancelled",
          "cancelled",
          false
        );
      }

      // Handle retryable errors
      if (error instanceof ImageProcessingError && error.retryable) {
        console.log(
          `Retrying image ${image.id} description (attempt ${
            retryCount + 1
          } of ${this.maxRetries})`
        );
        // Wait before retry
        await new Promise((resolve) =>
          setTimeout(resolve, this.retryDelay * (retryCount + 1))
        );
        return this.describeImage(image, apiKey, contextText, retryCount + 1);
      }

      // Re-throw any other errors
      throw error;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Properly formats image data for the Mistral Vision API
   * Ensures the base64 prefix is included correctly without duplication
   *
   * @param base64Data Base64 encoded image data
   * @returns Properly formatted image URL string
   */
  private formatImageUrl(base64Data: string): string {
    // Check if the base64 data already includes the data URI prefix
    if (base64Data.startsWith("data:image/")) {
      // Already has proper format, return as is
      return base64Data;
    }

    // Add the proper prefix for JPEG images
    return `data:image/jpeg;base64,${base64Data}`;
  }

  /**
   * Validates input parameters for image processing
   * Throws appropriate errors for invalid inputs
   */
  private validateImageParameters(image: OcrImage, apiKey: string): void {
    // Check for valid image object
    if (!image || !image.id) {
      throw new ImageProcessingError(
        "Invalid image object",
        "validation_error",
        false
      );
    }

    // Check for valid base64 data
    if (!image.base64 || typeof image.base64 !== "string") {
      throw new ImageProcessingError(
        `Invalid base64 data for image ${image.id}`,
        "validation_error",
        false
      );
    }

    // Check for valid API key
    if (!apiKey || typeof apiKey !== "string" || apiKey.trim() === "") {
      throw new ImageProcessingError(
        "Missing or invalid API key",
        "auth_error",
        false
      );
    }

    // Check base64 data length
    const estimatedSize = Math.ceil((image.base64.length * 3) / 4);
    if (estimatedSize > 10 * 1024 * 1024) {
      // 10MB limit
      throw new ImageProcessingError(
        `Image ${image.id} exceeds maximum size of 10MB`,
        "size_error",
        false
      );
    }
  }

  /**
   * Describes multiple images in batch with improved error handling
   *
   * @param images Array of OcrImage objects
   * @param apiKey Mistral API key
   * @param contextMap Optional map of image IDs to context text
   * @param progressReporter Optional progress reporter
   * @returns Promise resolving to a map of image IDs to descriptions
   */
  async describeImages(
    images: OcrImage[],
    apiKey: string,
    contextMap?: Map<string, string>,
    progressReporter?: ProgressReporter
  ): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    const totalImages = images.length;
    const errors: { imageId: string; error: Error }[] = [];

    try {
      // Validate input parameters
      if (!images || !Array.isArray(images)) {
        throw new ImageProcessingError(
          "Invalid images array",
          "validation_error",
          false
        );
      }

      if (images.length === 0) {
        return new Map<string, string>();
      }

      // Report starting the image processing
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: "processing-images",
          progress: 0,
          message: `Starting image description for ${totalImages} images`,
          detail: `Preparing to process ${totalImages} images with Vision AI`,
        });
      }

      // Process each image sequentially with better error tracking
      for (let i = 0; i < totalImages; i++) {
        const image = images[i];
        const context = contextMap ? contextMap.get(image.id) : undefined;

        // Report progress
        if (progressReporter) {
          progressReporter.reportProgress({
            stage: "processing-images",
            progress: Math.round((i / totalImages) * 100),
            message: `Processing image ${i + 1} of ${totalImages}`,
            detail: `Image ID: ${image.id}${context ? " (with context)" : ""}`,
          });
        }

        try {
          // Get description for the image
          const description = await this.describeImage(image, apiKey, context);
          results.set(image.id, description);

          // Add a small delay between API calls to avoid rate limiting
          if (i < totalImages - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: any) {
          // Log error but continue processing other images
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          const errorType =
            error instanceof ImageProcessingError ? error.type : "unknown";

          console.error(
            `Error processing image ${image.id} (${errorType}):`,
            errorMessage
          );

          // Store the error details
          errors.push({ imageId: image.id, error });

          // Add placeholder in results
          results.set(
            image.id,
            `[Image description unavailable: ${errorMessage}]`
          );

          // Report error through progress reporter
          if (progressReporter) {
            progressReporter.reportError(
              error instanceof Error ? error : new Error(errorMessage),
              "processing-images"
            );
          }
        }
      }

      // Report completion with error summary if needed
      if (progressReporter) {
        const successCount = totalImages - errors.length;

        progressReporter.reportProgress({
          stage: "processing-images",
          progress: 100,
          message: `Processed ${successCount} of ${totalImages} images successfully`,
          detail:
            errors.length > 0
              ? `Failed to process ${errors.length} images. Check logs for details.`
              : `All images processed successfully`,
        });
      }

      return results;
    } catch (error: any) {
      // Handle overall batch processing error
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      // Report batch failure
      if (progressReporter) {
        progressReporter.reportError(
          error instanceof Error ? error : new Error(errorMessage),
          "processing-images"
        );
      }

      throw new Error(`Batch image description failed: ${errorMessage}`);
    }
  }

  /**
   * Builds a prompt for the Vision API based on the context
   *
   * @param contextText Optional context text related to the image
   * @returns Formatted prompt string
   */
  private buildImagePrompt(contextText?: string): string {
    let prompt =
      "Please describe this image in detail, focusing on all visible elements, text, and relevant information.\n";

    // Add specific instructions for scholarly/technical content
    prompt +=
      "If this appears to be from an academic or technical document, focus on describing charts, figures, diagrams, or technical illustrations with precise detail about data points, trends, labels, and their relationships.\n";

    // Add instructions for OCR if text is visible
    prompt +=
      "If the image contains text, include a complete transcription of all visible text, preserving the layout and structure where relevant.\n";

    // Add specific guidance for common academic figure types
    prompt +=
      "For graphs, describe the axes, data series, trends, and key findings. For diagrams, explain the components, connections, and overall meaning. For tables, describe the structure and summarize key information.\n";

    // Add instruction for figures with multiple panels
    prompt +=
      "If the figure has multiple panels, describe each panel separately. If the composition is unusual or the panels interact in a non-standard way, explain their relationship.\n";

    // Add context-specific instructions
    if (contextText) {
      prompt += `This image appears in the following context:\n<context>\n"${contextText}"\n</context>\nPlease tailor your description to relate to this context where appropriate.\n`;
    }

    // Add formatting guidance
    prompt +=
      'Format your response as a clear, concise paragraph. Start with a overview sentence identifying the type of image (e.g., "A line graph showing...", "A diagram illustrating...", "A photograph of..."), then provide specific details.';

    return prompt;
  }

  /**
   * Cancels an ongoing operation if possible
   */
  cancelOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Extracts context for an image based on OCR page data
   * Returns text surrounding the image position
   *
   * @param ocrPageMarkdown Markdown content of the page
   * @param topLeftY Position data of the image
   * @param bottomRightY Position data of the image
   * @returns Extracted context text
   */
  extractImageContext(
    ocrPageMarkdown: string,
    topLeftY: number,
    bottomRightY: number
  ): string {
    // Simple context extraction by finding text near the image position
    // Split the markdown into lines
    const lines = ocrPageMarkdown.split("\n");

    // Determine the area of interest (simulating proximity to image)
    // This is a simplistic approach and could be improved with more sophisticated analysis
    const contextLines: string[] = [];

    // Collect lines that might be contextually relevant (headers, captions, surrounding text)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check for headers or captions (potential context indicators)
      if (
        line.startsWith("#") ||
        line.includes("Figure") ||
        line.includes("Table") ||
        line.includes("Chart") ||
        line.includes("Graph") ||
        line.includes("Diagram") ||
        line.includes("Image") ||
        line.includes("Photo") ||
        line.includes("Caption") ||
        line.includes("illustrat")
      ) {
        contextLines.push(line);
      }
    }

    // Join and truncate to avoid excessively long context
    let context = contextLines.join(" ");
    if (context.length > 500) {
      context = context.substring(0, 497) + "...";
    }

    return context;
  }
}

// Create a singleton instance for easy import
export const mistralImageService = new MistralImageService();
