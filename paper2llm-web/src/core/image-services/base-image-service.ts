// AI Summary: Abstract base class for vision API implementations.
// Defines common functionality and error handling for image description services.
// Enforces consistent provider interface implementation across different vision APIs.

import axios, { AxiosInstance } from "axios";
import {
  ApiProvider,
  ImageService,
  OcrImage,
  ProgressReporter,
  VisionModelInfo
} from "../../types/interfaces";

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
 * Abstract base class for image service implementations
 * Provides common functionality and enforces consistent interface
 */
export abstract class BaseImageService implements ImageService {
  // Standard token limits based on model type
  protected readonly DEFAULT_FAST_MODEL_TOKENS: number = 3000;  // Higher token limit for fast/cheaper models
  protected readonly DEFAULT_PREMIUM_MODEL_TOKENS: number = 1200; // Lower token limit for premium/expensive models
  
  protected maxRetries: number = 2;
  protected retryDelay: number = 1000; // 1 second
  protected abortController: AbortController | null = null;
  
  /**
   * Create an axios instance with proper configuration
   */
  protected createAxiosInstance(baseUrl: string): AxiosInstance {
    return axios.create({
      baseURL: baseUrl,
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 60000, // 60 second timeout
    });
  }

  /**
   * Validates basic image parameters
   */
  protected validateImageParameters(image: OcrImage, apiKey: string): void {
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
   * Implements core functionality for describing multiple images in batch
   * with progress reporting and error handling
   */
  async describeImages(
    images: OcrImage[],
    apiKey: string,
    provider: ApiProvider,
    contextMap?: Map<string, string>,
    progressReporter?: ProgressReporter,
    model?: string
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
          detail: `Preparing to process ${totalImages} images with Vision AI (${provider})`,
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
          const description = await this.describeImage(image, apiKey, provider, context, model);
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
   * Build a prompt for the Vision API based on the context and provider
   */
  protected abstract buildImagePrompt(contextText?: string, provider?: ApiProvider): string;

  /**
   * Format an image URL with proper base64 encoding for the specific provider
   */
  protected abstract formatImageUrl(base64Data: string, provider: ApiProvider): string;

  /**
   * Validate the model name against available models for the provider
   */
  protected abstract validateModel(model: string | undefined, provider: ApiProvider): string;

  /**
   * Abstract method to be implemented by provider-specific subclasses
   */
  abstract describeImage(
    image: OcrImage,
    apiKey: string,
    provider: ApiProvider,
    contextText?: string,
    model?: string,
    retryCount?: number
  ): Promise<string>;

  /**
   * Get available models for a specific provider
   */
  abstract getAvailableModels(provider: ApiProvider): VisionModelInfo[];

  /**
   * Get the default model for a specific provider
   */
  abstract getDefaultModel(provider: ApiProvider): string;

  /**
   * Cancels an ongoing operation if possible
   */
  cancelOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }
}
