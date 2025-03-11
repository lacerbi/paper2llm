// AI Summary: Factory class for creating provider-specific image services.
// Dynamically selects between Mistral and OpenAI implementations based on provider.
// Provides unified interface for accessing vision models across providers.

import { ApiProvider, ImageService, VisionModelInfo } from "../../types/interfaces";
import { MistralImageService } from "./mistral-image-service";
import { OpenAIImageService } from "./openai-image-service";
import { GeminiImageService } from "./gemini-image-service";

/**
* Factory for creating provider-specific image service instances
*/
export class ImageServiceFactory {
 private static instance: ImageServiceFactory;
 private mistralService: MistralImageService;
 private openaiService: OpenAIImageService;
 private geminiService: GeminiImageService;

 private constructor() {
   this.mistralService = new MistralImageService();
   this.openaiService = new OpenAIImageService();
   this.geminiService = new GeminiImageService();
 }

 /**
  * Get the singleton instance of the factory
  */
 public static getInstance(): ImageServiceFactory {
   if (!ImageServiceFactory.instance) {
     ImageServiceFactory.instance = new ImageServiceFactory();
   }
   return ImageServiceFactory.instance;
 }

 /**
  * Get service implementation for a specific provider
  */
 private getServiceForProvider(provider: ApiProvider): ImageService {
   switch (provider) {
     case 'mistral':
       return this.mistralService;
     case 'openai':
       return this.openaiService;
     case 'gemini':
       return this.geminiService;
     default:
       throw new Error(`Unsupported provider: ${provider}`);
   }
 }

 /**
  * Describe an image using the appropriate provider service
  */
 public async describeImage(
   image: any,
   apiKey: string,
   provider: ApiProvider,
   contextText?: string,
   model?: string
 ): Promise<string> {
   const service = this.getServiceForProvider(provider);
   return service.describeImage(image, apiKey, provider, contextText, model);
 }

 /**
  * Describe multiple images using the appropriate provider service
  */
 public async describeImages(
   images: any[],
   apiKey: string,
   provider: ApiProvider,
   contextMap?: Map<string, string>,
   progressReporter?: any,
   model?: string
 ): Promise<Map<string, string>> {
   const service = this.getServiceForProvider(provider);
   return service.describeImages(images, apiKey, provider, contextMap, progressReporter, model);
 }

 /**
  * Get all available models across providers or for a specific provider
  */
 public getAvailableModels(provider?: ApiProvider): VisionModelInfo[] {
   if (provider) {
     return this.getServiceForProvider(provider).getAvailableModels(provider);
   }
   
   // If no provider specified, return models from all providers
   return [
     ...this.mistralService.getAvailableModels('mistral'),
     ...this.openaiService.getAvailableModels('openai'),
     ...this.geminiService.getAvailableModels('gemini')
   ];
 }

 /**
  * Get the default model for a specific provider
  */
 public getDefaultModel(provider: ApiProvider): string {
   return this.getServiceForProvider(provider).getDefaultModel(provider);
 }

 /**
  * Cancel any ongoing operations
  */
 public cancelOperation(): void {
   this.mistralService.cancelOperation();
   this.openaiService.cancelOperation();
   this.geminiService.cancelOperation();
 }
}

// Create a singleton instance for easy import
export const imageServiceFactory = ImageServiceFactory.getInstance();
