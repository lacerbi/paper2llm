// AI Summary: Mistral AI-specific implementation of the image description service.
// Handles API communication with Mistral's Pixtral models for image analysis.
// Includes model validation, error handling, and response processing.

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { ApiProvider, OcrImage, VisionModelInfo } from "../../types/interfaces";
import { formatImagePrompt } from "../templates/image-prompt-template";
import { BaseImageService, ImageProcessingError } from "./base-image-service";

/**
 * MistralImageService implements image description using Mistral's Vision API (pixtral models)
 */
export class MistralImageService extends BaseImageService {
  private readonly apiBaseUrl: string =
    "https://api.mistral.ai/v1/chat/completions";
  private axiosInstance: AxiosInstance;

  // Available Mistral Vision models
  private readonly modelInfos: VisionModelInfo[] = [
    {
      id: "pixtral-12b-2409",
      name: "Pixtral",
      description: "Standard vision model for most use cases",
      provider: "mistral",
      maxTokens: this.DEFAULT_FAST_MODEL_TOKENS,
    },
    {
      id: "pixtral-large-latest",
      name: "Pixtral Large",
      description: "Enhanced vision model with higher detail capability",
      provider: "mistral",
      maxTokens: this.DEFAULT_PREMIUM_MODEL_TOKENS,
    },
  ];

  constructor() {
    super();
    this.axiosInstance = this.createAxiosInstance(this.apiBaseUrl);
  }

  /**
   * Returns the available Mistral vision models
   */
  getAvailableModels(provider: ApiProvider): VisionModelInfo[] {
    if (provider !== "mistral") {
      return [];
    }
    return this.modelInfos;
  }

  /**
   * Returns the default Mistral vision model
   */
  getDefaultModel(provider: ApiProvider): string {
    if (provider !== "mistral") {
      return "";
    }
    return "pixtral-12b-2409";
  }

  /**
   * Properly formats image data for the Mistral Vision API
   * Ensures the base64 prefix is included correctly without duplication
   */
  protected formatImageUrl(base64Data: string, provider: ApiProvider): string {
    // Only handle Mistral formatting
    if (provider !== "mistral") {
      return base64Data;
    }

    // Check if the base64 data already includes the data URI prefix
    if (base64Data.startsWith("data:image/")) {
      // Already has proper format, return as is
      return base64Data;
    }

    // Add the proper prefix for JPEG images
    return `data:image/jpeg;base64,${base64Data}`;
  }

  /**
   * Validates the provided model name or falls back to default
   */
  protected validateModel(
    model: string | undefined,
    provider: ApiProvider
  ): string {
    if (provider !== "mistral") {
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
   * Builds a prompt for the Vision API based on the context
   * Uses the template from image-prompt-template.ts
   */
  protected buildImagePrompt(contextText?: string): string {
    return formatImagePrompt(contextText);
  }

  /**
   * Describes an image using Mistral's Vision API
   */
  async describeImage(
    image: OcrImage,
    apiKey: string,
    provider: ApiProvider,
    contextText?: string,
    model?: string,
    retryCount: number = 0
  ): Promise<string> {
    // Only process requests for Mistral provider
    if (provider !== "mistral") {
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

      // Prepare the image URL with base64 data, ensuring proper formatting
      const imageUrl = this.formatImageUrl(image.base64, provider);

      // Validate model if provided, otherwise use default
      const selectedModel = this.validateModel(model, provider);

      // Find the model info to get max tokens
      const modelInfo = this.modelInfos.find((m) => m.id === selectedModel);
      const maxTokens = modelInfo?.maxTokens || this.DEFAULT_PREMIUM_MODEL_TOKENS;

      // Create the request payload
      const payload = {
        model: selectedModel,
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
        max_tokens: maxTokens,
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
              `Mistral API rate limit exceeded. ${retryable ? 'Will retry after cooling period.' : 'Maximum retries reached.'}`,
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
        const rawDescription = response.data.choices[0].message.content.trim();
        return this.processDescriptionResponse(rawDescription, image.id, retryCount);
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
        const isRateLimit = error.type === 'rate_limit';
        const delay = this.getRetryDelay(error.type, retryCount);
        
        console.log(
          `Retrying image ${image.id} description (attempt ${
            retryCount + 1
          } of ${this.maxRetries})${
            isRateLimit ? ' - Rate limit exceeded, waiting longer before retry' : ''
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
      throw error;
    } finally {
      this.abortController = null;
    }
  }
}
