// AI Summary: Anthropic-specific implementation of the image description service.
// Handles API communication with Anthropic's Claude models for image analysis using the official SDK.
// Includes model validation, error handling, and response processing.
// Uses Claude 3.7 Sonnet and 3.5 Haiku models with appropriate API formatting.

import Anthropic from '@anthropic-ai/sdk';
import { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages';
import { ApiProvider, OcrImage, VisionModelInfo } from "../../types/interfaces";
import { formatImagePrompt } from "../templates/image-prompt-template";
import { BaseImageService, ImageProcessingError } from "./base-image-service";

/**
 * AnthropicImageService implements image description using Anthropic's Claude Vision API
 */
export class AnthropicImageService extends BaseImageService {
  private readonly ANTHROPIC_API_VERSION: string = "2023-06-01";
  private anthropicClient: Anthropic | null = null;

  // Available Anthropic Vision models
  private readonly modelInfos: VisionModelInfo[] = [
    {
      id: "claude-3-7-sonnet-latest",
      name: "Claude 3.7 Sonnet",
      description: "Intelligence and speed for high-quality image analysis",
      provider: "anthropic",
      maxTokens: this.DEFAULT_PREMIUM_MODEL_TOKENS,
    },
    {
      id: "claude-3-5-haiku-latest",
      name: "Claude 3.5 Haiku",
      description: "Fastest model for efficient image understanding",
      provider: "anthropic",
      maxTokens: this.DEFAULT_FAST_MODEL_TOKENS,
    },
  ];

  constructor() {
    super();
  }

  /**
   * Returns the available Anthropic vision models
   */
  getAvailableModels(provider: ApiProvider): VisionModelInfo[] {
    if (provider !== "anthropic") {
      return [];
    }
    return this.modelInfos;
  }

  /**
   * Returns the default Anthropic vision model
   */
  getDefaultModel(provider: ApiProvider): string {
    if (provider !== "anthropic") {
      return "";
    }
    return "claude-3-5-haiku-latest"; // Use haiku as the default model (balance of speed/quality)
  }

  /**
   * Builds a prompt for the Vision API based on the context
   * Uses the standardized template from image-prompt-template.ts
   */
  protected buildImagePrompt(
    contextText?: string,
    provider?: ApiProvider
  ): string {
    return formatImagePrompt(contextText);
  }

  /**
   * Properly formats image data for the Anthropic Vision API
   * Returns the base64 data without data URI prefix
   */
  protected formatImageUrl(base64Data: string, provider: ApiProvider): string {
    // Only handle Anthropic formatting
    if (provider !== "anthropic") {
      return base64Data;
    }

    // For Anthropic, we need to strip any data URI prefix if present
    if (base64Data.startsWith("data:image/")) {
      // Extract only the base64 content without the prefix
      const base64Content = base64Data.split(",")[1];
      return base64Content;
    }

    return base64Data;
  }

  /**
   * Determines the media type of the image data
   * Ensures it's one of the allowed media types for Anthropic API
   * Default to image/jpeg if unable to detect or if detected type is not supported
   */
  private getImageMediaType(base64Data: string): "image/jpeg" | "image/png" | "image/gif" | "image/webp" {
    if (base64Data.startsWith("data:image/")) {
      const mediaTypeMatch = base64Data.match(/^data:(image\/[^;]+);/);
      if (mediaTypeMatch && mediaTypeMatch[1]) {
        const detectedType = mediaTypeMatch[1];
        // Check if the detected type is one of the allowed types
        if (["image/jpeg", "image/png", "image/gif", "image/webp"].includes(detectedType)) {
          return detectedType as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        }
      }
    }
    return "image/jpeg"; // Default to JPEG if not specified or not supported
  }

  /**
   * Validates the provided model name or falls back to default
   */
  protected validateModel(
    model: string | undefined,
    provider: ApiProvider
  ): string {
    if (provider !== "anthropic") {
      return "";
    }

    // Get valid model IDs
    const validModelIds = this.modelInfos.map((m) => m.id);

    // If no model provided or provided model is not in the list of available models, use default
    if (!model || !validModelIds.includes(model)) {
      return this.getDefaultModel(provider);
    }

    return model;
  }

  /**
   * Describes an image using Anthropic's Claude Vision API
   */
  async describeImage(
    image: OcrImage,
    apiKey: string,
    provider: ApiProvider,
    contextText?: string,
    model?: string,
    retryCount: number = 0
  ): Promise<string> {
    // Only process requests for Anthropic provider
    if (provider !== "anthropic") {
      throw new ImageProcessingError(
        "Provider not supported by this service implementation",
        "provider_error",
        false
      );
    }

    try {
      // Validate input parameters
      this.validateImageParameters(image, apiKey);

      // Create abort controller for request cancellation
      this.abortController = new AbortController();

      // Build the prompt for the image description
      const promptText = this.buildImagePrompt(contextText);

      // Prepare the image data, ensuring proper formatting
      const base64Image = this.formatImageUrl(image.base64, provider);
      
      // Get a validated media type
      const mediaType = this.getImageMediaType(image.base64);

      // Validate model if provided, otherwise use default
      const selectedModel = this.validateModel(model, provider);

      // Find the model info to get max tokens
      const modelInfo = this.modelInfos.find((m) => m.id === selectedModel);
      const maxTokens =
        modelInfo?.maxTokens || this.DEFAULT_PREMIUM_MODEL_TOKENS;
        
      // Initialize the Anthropic client with the provided API key
      // Use dangerouslyAllowBrowser flag as we're running in a browser environment
      this.anthropicClient = new Anthropic({
        apiKey: apiKey,
        defaultHeaders: {
          'anthropic-version': this.ANTHROPIC_API_VERSION
        },
        dangerouslyAllowBrowser: true // Required for browser environments
      });

      // Prepare the message content with text and image using correct ContentBlockParam structure
      const messageContent: ContentBlockParam[] = [
        {
          type: "text" as const,
          text: promptText,
        },
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: mediaType,
            data: base64Image,
          },
        },
      ];

      // Create the request message using the SDK format
      const response = await this.anthropicClient.messages.create({
        model: selectedModel,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: messageContent,
          },
        ],
      }, {
        signal: this.abortController.signal,
      });

      // Extract and return the description from the response
      if (response && response.content && Array.isArray(response.content)) {
        // Extract text from the response - Anthropic returns content array
        let textContent = "";

        for (const part of response.content) {
          if (part.type === "text") {
            textContent += part.text;
          }
        }

        const rawDescription = textContent.trim();
        return this.processDescriptionResponse(
          rawDescription,
          image.id,
          retryCount
        );
      } else {
        throw new ImageProcessingError(
          "Invalid response format from Anthropic API",
          "response_format",
          retryCount < this.maxRetries
        );
      }
    } catch (error: any) {
      // Handle request cancellation
      if (error.name === 'AbortError') {
        throw new ImageProcessingError(
          "Image description request was cancelled",
          "cancelled",
          false
        );
      }

      // Handle authentication errors
      if (error.status === 401 || error.status === 403) {
        throw new ImageProcessingError(
          "Invalid or unauthorized Anthropic API key",
          "auth_error",
          false
        );
      }
      
      // Handle rate limiting
      if (error.status === 429) {
        const retryable = retryCount < this.maxRetries;
        throw new ImageProcessingError(
          `Anthropic API rate limit exceeded. ${
            retryable
              ? "Will retry after cooling period."
              : "Maximum retries reached."
          }`,
          "rate_limit",
          retryable
        );
      }
      
      // Handle server errors (potentially retryable)
      if (error.status && error.status >= 500) {
        const retryable = retryCount < this.maxRetries;
        throw new ImageProcessingError(
          `Anthropic API server error (${error.status})`,
          "server_error",
          retryable
        );
      }

      // Handle network errors (potentially retryable)
      if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
        const retryable = retryCount < this.maxRetries;
        throw new ImageProcessingError(
          `Network timeout while contacting Anthropic API: ${error.message}`,
          "timeout",
          retryable
        );
      }

      // Handle retryable errors
      if (error instanceof ImageProcessingError && error.retryable) {
        const isRateLimit = error.type === "rate_limit";
        const delay = this.getRetryDelay(error.type, retryCount);

        console.log(
          `Retrying image ${image.id} description (attempt ${
            retryCount + 1
          } of ${this.maxRetries})${
            isRateLimit
              ? " - Rate limit exceeded, waiting longer before retry"
              : ""
          }`
        );

        // Wait before retry with appropriate delay
        await new Promise((resolve) => setTimeout(resolve, delay));

        return this.describeImage(
          image,
          apiKey,
          provider,
          contextText,
          model,
          retryCount + 1
        );
      }

      // Re-throw any other errors
      throw new ImageProcessingError(
        `API request failed: ${error.message || "Unknown error"}`,
        "request_error",
        retryCount < this.maxRetries
      );
    } finally {
      this.abortController = null;
      this.anthropicClient = null;
    }
  }

  /**
   * Cancels an ongoing operation if possible
   */
  cancelOperation(): void {
    super.cancelOperation();
    this.anthropicClient = null;
  }
}
