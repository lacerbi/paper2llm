// AI Summary: Placeholder for future image description service using Mistral Vision API.
// Will handle sending images to Mistral's Vision API and processing responses.

import { ImageService, OcrImage } from '../types/interfaces';

export class MistralImageService implements ImageService {
  private readonly apiBaseUrl: string = 'https://api.mistral.ai/v1';
  private readonly defaultModel: string = 'pixtral-12b-2409';
  
  /**
   * Describes an image using Mistral's Vision API
   * 
   * @param imageBase64 Base64 encoded image data
   * @param apiKey Mistral API key
   * @param contextText Optional context to include with the image
   * @returns Promise resolving to the image description
   */
  async describeImage(
    imageBase64: string,
    apiKey: string,
    contextText?: string
  ): Promise<string> {
    // This is a placeholder for future implementation
    // Will be implemented in a later phase with Mistral Vision API integration
    throw new Error('Image description service not yet implemented');
  }
  
  /**
   * Describes multiple images in batch
   * 
   * @param images Array of OcrImage objects
   * @param apiKey Mistral API key
   * @param contextMap Optional map of image IDs to context text
   * @returns Promise resolving to a map of image IDs to descriptions
   */
  async describeImages(
    images: OcrImage[],
    apiKey: string,
    contextMap?: Map<string, string>
  ): Promise<Map<string, string>> {
    // This is a placeholder for future implementation
    // Will be implemented in a later phase with Mistral Vision API integration
    throw new Error('Batch image description not yet implemented');
  }
}

// Create a singleton instance for easy import
export const mistralImageService = new MistralImageService();
