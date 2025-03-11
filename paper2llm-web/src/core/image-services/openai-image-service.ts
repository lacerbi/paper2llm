// AI Summary: OpenAI-specific implementation of the image description service.
// Handles API communication with OpenAI's vision models for image analysis.
// Includes model validation, error handling, and response processing.

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { ApiProvider, OcrImage, VisionModelInfo } from "../../types/interfaces";
import { formatImagePrompt } from "../templates/image-prompt-template";
import { BaseImageService, ImageProcessingError } from "./base-image-service";

/**
 * OpenAIImageService implements image description using OpenAI's Vision API
 */
export class OpenAIImageService extends BaseImageService {
  private readonly apiBaseUrl: string =
    "https://api.openai.com/v1/chat/completions";
  private axiosInstance: AxiosInstance;

  // Available OpenAI Vision models
  private readonly modelInfos: VisionModelInfo[] = [
    {
      id: "gpt-4o",
      name: "GPT-4o",
      description: "Latest vision model with high-quality image understanding",
      provider: "openai",
      maxTokens: this.DEFAULT_PREMIUM_MODEL_TOKENS,
    },
  ];

  constructor() {
    super();
    this.axiosInstance = this.createAxiosInstance(this.apiBaseUrl);
  }

  /**
   * Returns the available OpenAI vision models
   */
  getAvailableModels(provider: ApiProvider): VisionModelInfo[] {
    if (provider !== "openai") {
      return [];
    }
    return this.modelInfos;
  }

  /**
   * Returns the default OpenAI vision model
   */
  getDefaultModel(provider: ApiProvider): string {
    if (provider !== "openai") {
      return "";
    }
    return "gpt-4o";
  }

  /**
   * Builds a prompt for the Vision API based on the context
   * Uses the standardized template from image-prompt-template.ts
   */
  protected buildImagePrompt(contextText?: string, provider?: ApiProvider): string {
    return formatImagePrompt(contextText);
  }

  /**
   * Properly formats image data for the OpenAI Vision API
   */
  protected formatImageUrl(base64Data: string, provider: ApiProvider): string {
    // Only handle OpenAI formatting
    if (provider !== "openai") {
      return base64Data;
    }

    // For OpenAI, we need to strip any data URI prefix if present
    if (base64Data.startsWith("data:image/")) {
      // Extract only the base64 content without the prefix
      const base64Content = base64Data.split(",")[1];
      return base64Content;
    }

    return base64Data;
  }

  /**
   * Validates the provided model name or falls back to default
   */
  protected validateModel(
    model: string | undefined,
    provider: ApiProvider
  ): string {
    if (provider !== "openai") {
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
   * Describes an image using OpenAI's Vision API
   */
  async describeImage(
    image: OcrImage,
    apiKey: string,
    provider: ApiProvider,
    contextText?: string,
    model?: string,
    retryCount: number = 0
  ): Promise<string> {
    // Only process requests for OpenAI provider
    if (provider !== "openai") {
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
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`,
                },
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
          "Content-Type": "application/json",
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

          // Handle rate limiting
          if (statusCode === 429) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              "OpenAI API rate limit exceeded. Please try again later.",
              "rate_limit",
              retryable
            );
          }

          // Handle authentication errors
          if (statusCode === 401 || statusCode === 403) {
            throw new ImageProcessingError(
              "Invalid or unauthorized OpenAI API key",
              "auth_error",
              false
            );
          }

          // Handle server errors (potentially retryable)
          if (statusCode >= 500) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              `OpenAI API server error (${statusCode})`,
              "server_error",
              retryable
            );
          }

          // Handle other API errors
          throw new ImageProcessingError(
            `OpenAI API error (${statusCode}): ${JSON.stringify(errorData)}`,
            "api_error",
            false
          );
        }

        // Handle network errors (potentially retryable)
        if (apiError.code === "ECONNABORTED" || apiError.code === "ETIMEDOUT") {
          const retryable = retryCount < this.maxRetries;
          throw new ImageProcessingError(
            `Network timeout while contacting OpenAI API: ${apiError.message}`,
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
          "Invalid response format from OpenAI API",
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
