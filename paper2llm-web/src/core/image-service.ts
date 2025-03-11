// AI Summary: Main image service interface that uses the factory pattern.
// Delegates to provider-specific implementations through a factory.
// Maintains backward compatibility while supporting multiple providers.

import { 
 ApiProvider, 
 ImageService, 
 OcrImage, 
 ProgressReporter, 
 VisionModelInfo 
} from "../types/interfaces";
import { imageServiceFactory } from "./image-services/image-service-factory";
import { ImageProcessingError } from "./image-services/base-image-service";

/**
* Re-export the custom error class
*/
export { ImageProcessingError } from "./image-services/base-image-service";

/**
* MultiProviderImageService implements the ImageService interface
* and delegates to provider-specific implementations
*/
export class MultiProviderImageService implements ImageService {
 /**
  * Describes an image using the selected provider's Vision API
  */
 async describeImage(
   image: OcrImage,
   apiKey: string,
   provider: ApiProvider = 'mistral',
   contextText?: string,
   model?: string
 ): Promise<string> {
   return imageServiceFactory.describeImage(
     image, 
     apiKey, 
     provider, 
     contextText, 
     model
   );
 }

 /**
  * Describes multiple images in batch using the selected provider
  */
 async describeImages(
   images: OcrImage[],
   apiKey: string,
   provider: ApiProvider = 'mistral',
   contextMap?: Map<string, string>,
   progressReporter?: ProgressReporter,
   model?: string
 ): Promise<Map<string, string>> {
   return imageServiceFactory.describeImages(
     images, 
     apiKey, 
     provider, 
     contextMap, 
     progressReporter, 
     model
   );
 }

 /**
  * Gets the available vision models for a provider
  */
 getAvailableModels(provider: ApiProvider = 'mistral'): VisionModelInfo[] {
   return imageServiceFactory.getAvailableModels(provider);
 }

 /**
  * Gets all available models across all providers
  */
 getAllModels(): VisionModelInfo[] {
   return imageServiceFactory.getAvailableModels();
 }

 /**
  * Gets the default vision model for a provider
  */
 getDefaultModel(provider: ApiProvider = 'mistral'): string {
   return imageServiceFactory.getDefaultModel(provider);
 }

 /**
  * Cancels an ongoing operation if possible
  */
 cancelOperation(): void {
   imageServiceFactory.cancelOperation();
 }
}

// Create a singleton instance for easy import
export const multiProviderImageService = new MultiProviderImageService();

// For backward compatibility, export the multiProviderImageService as mistralImageService
export const mistralImageService = multiProviderImageService;
