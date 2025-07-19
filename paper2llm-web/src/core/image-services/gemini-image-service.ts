// AI Summary: Gemini-specific implementation of the image description service.
// Handles API communication with Google's Gemini vision models for image analysis.
// Includes model validation, error handling, and response processing.

import axios, { AxiosInstance, AxiosResponse } from "axios";
import { ApiProvider, OcrImage, VisionModelInfo } from "../../types/interfaces";
import { formatImagePrompt } from "../templates/image-prompt-template";
import { BaseImageService, ImageProcessingError } from "./base-image-service";

/**
 * GeminiImageService implements image description using Google's Gemini Vision API
 */
export class GeminiImageService extends BaseImageService {
  private readonly apiBaseUrl: string =
    "https://generativelanguage.googleapis.com/v1beta/models";
  private axiosInstance: AxiosInstance;

  // Available Gemini Vision models
  private readonly modelInfos: VisionModelInfo[] = [
    {
      id: "gemini-2.5-pro",
      name: "Gemini 2.5 Pro",
      description:
        "Most advanced Gemini model for complex reasoning and multimodal tasks",
      provider: "gemini",
      maxTokens: 65536,
    },
    {
      id: "gemini-2.5-flash",
      name: "Gemini 2.5 Flash",
      description:
        "Fast, efficient model with large context and reasoning capabilities",
      provider: "gemini",
      maxTokens: 65536,
    },
    {
      id: "gemini-2.5-flash-lite-preview-06-17",
      name: "Gemini 2.5 Flash-Lite Preview",
      description:
        "Smallest and most cost effective model, built for at scale usage",
      provider: "gemini",
      maxTokens: 64000,
    },
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      description: "High-performance model with multimodal capabilities",
      provider: "gemini",
      maxTokens: 8192,
    },
    {
      id: "gemini-2.0-flash-lite",
      name: "Gemini 2.0 Flash Lite",
      description: "Lightweight version of Gemini 2.0 Flash",
      provider: "gemini",
      maxTokens: 8192,
    },
  ];

  constructor() {
    super();
    this.axiosInstance = this.createAxiosInstance(this.apiBaseUrl);
  }

  /**
   * Returns the available Gemini vision models
   */
  getAvailableModels(provider: ApiProvider): VisionModelInfo[] {
    if (provider !== "gemini") {
      return [];
    }
    return this.modelInfos;
  }

  /**
   * Returns the default Gemini vision model
   */
  getDefaultModel(provider: ApiProvider): string {
    if (provider !== "gemini") {
      return "";
    }
    return "gemini-2.5-flash"; // Use flash 2.5 as the default model
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
   * Properly formats image data for the Gemini Vision API
   */
  protected formatImageUrl(base64Data: string, provider: ApiProvider): string {
    // Only handle Gemini formatting
    if (provider !== "gemini") {
      return base64Data;
    }

    // For Gemini, we need to strip any data URI prefix if present
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
    if (provider !== "gemini") {
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
   * Describes an image using Gemini's Vision API
   */
  async describeImage(
    image: OcrImage,
    apiKey: string,
    provider: ApiProvider,
    contextText?: string,
    model?: string,
    retryCount: number = 0
  ): Promise<string> {
    // Only process requests for Gemini provider
    if (provider !== "gemini") {
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
      const maxTokens =
        modelInfo?.maxTokens || this.DEFAULT_PREMIUM_MODEL_TOKENS;

      // Create the request URL - Gemini requires model in URL
      const requestUrl = `/${selectedModel}:generateContent?key=${apiKey}`;

      // Create the request payload - structure specific to Gemini
      const payload = {
        contents: [
          {
            parts: [
              {
                text: promptText,
              },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Image,
                },
              },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature: 0.4,
          topP: 0.95,
        },
      };

      // Set up request configuration with abort signal
      const config = {
        headers: {
          "Content-Type": "application/json",
        },
        signal: this.abortController.signal,
      };

      // Make the API request
      let response: AxiosResponse<any>;
      try {
        response = await this.axiosInstance.post(requestUrl, payload, config);
      } catch (apiError: any) {
        // Handle specific API errors
        if (apiError.response) {
          const statusCode = apiError.response.status;
          const errorData = apiError.response.data?.error;

          // Handle rate limiting
          if (statusCode === 429) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              `Gemini API rate limit exceeded. ${
                retryable
                  ? "Will retry after cooling period."
                  : "Maximum retries reached."
              }`,
              "rate_limit",
              retryable
            );
          }

          // Handle authentication errors
          if (statusCode === 401 || statusCode === 403) {
            throw new ImageProcessingError(
              "Invalid or unauthorized Gemini API key",
              "auth_error",
              false
            );
          }

          // Handle server errors (potentially retryable)
          if (statusCode >= 500) {
            const retryable = retryCount < this.maxRetries;
            throw new ImageProcessingError(
              `Gemini API server error (${statusCode})`,
              "server_error",
              retryable
            );
          }

          // Handle other API errors
          throw new ImageProcessingError(
            `Gemini API error (${statusCode}): ${JSON.stringify(errorData)}`,
            "api_error",
            false
          );
        }

        // Handle network errors (potentially retryable)
        if (apiError.code === "ECONNABORTED" || apiError.code === "ETIMEDOUT") {
          const retryable = retryCount < this.maxRetries;
          throw new ImageProcessingError(
            `Network timeout while contacting Gemini API: ${apiError.message}`,
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
      // Gemini response structure is different from OpenAI/Mistral
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates.length > 0 &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts.length > 0
      ) {
        // Extract text from the response - Gemini returns parts array
        let textParts = response.data.candidates[0].content.parts
          .filter((part: any) => part.text)
          .map((part: any) => part.text)
          .join("\n");

        const rawDescription = textParts.trim();
        return this.processDescriptionResponse(
          rawDescription,
          image.id,
          retryCount
        );
      } else {
        throw new ImageProcessingError(
          "Invalid response format from Gemini API",
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
      throw error;
    } finally {
      this.abortController = null;
    }
  }
}
