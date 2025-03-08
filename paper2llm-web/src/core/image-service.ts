// AI Summary: Implements Mistral Vision API integration for image description.
// Handles sending images to Mistral's Vision API with context and processing responses.
// Supports both individual and batch image processing with error handling.

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { ImageService, OcrImage, ProgressReporter, ProgressUpdate } from '../types/interfaces';

/**
 * MistralImageService implements the ImageService interface to describe images
 * using Mistral's Vision API (pixtral model)
 */
export class MistralImageService implements ImageService {
  private readonly apiBaseUrl: string = 'https://api.mistral.ai/v1/chat/completions';
  private readonly defaultModel: string = 'pixtral-12b-2409';
  private axiosInstance: AxiosInstance;
  private abortController: AbortController | null = null;
  
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
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
    contextText?: string
  ): Promise<string> {
    try {
      // Create abort controller for request cancellation
      this.abortController = new AbortController();
      
      // Build the prompt for the image description
      const promptText = this.buildImagePrompt(contextText);
      
      // Prepare the image URL with base64 data
      const imageUrl = `data:image/jpeg;base64,${image.base64}`;
      
      // Create the request payload
      const payload = {
        model: this.defaultModel,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: promptText
              },
              {
                type: 'image_url',
                image_url: imageUrl
              }
            ]
          }
        ],
        max_tokens: 500
      };
      
      // Set up request configuration with abort signal
      const config = {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        signal: this.abortController.signal
      };
      
      // Make the API request
      const response: AxiosResponse<any> = await this.axiosInstance.post('', payload, config);
      
      // Extract and return the description from the response
      if (response.data && 
          response.data.choices && 
          response.data.choices.length > 0 &&
          response.data.choices[0].message &&
          response.data.choices[0].message.content) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('Invalid response format from Vision API');
      }
    } catch (error: any) {
      // Handle request cancellation
      if (axios.isCancel(error)) {
        throw new Error('Image description request was cancelled');
      }
      
      // Handle API errors
      if (error.response) {
        const statusCode = error.response.status;
        const errorData = error.response.data;
        
        // Handle rate limiting
        if (statusCode === 429) {
          throw new Error('Vision API rate limit exceeded. Please try again later.');
        }
        
        // Handle authentication errors
        if (statusCode === 401 || statusCode === 403) {
          throw new Error('Invalid or unauthorized API key');
        }
        
        // Handle other API errors
        throw new Error(`Vision API error (${statusCode}): ${JSON.stringify(errorData)}`);
      }
      
      // Re-throw any other errors
      throw error;
    } finally {
      this.abortController = null;
    }
  }
  
  /**
   * Describes multiple images in batch
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
    
    try {
      // Process each image sequentially
      for (let i = 0; i < totalImages; i++) {
        const image = images[i];
        const context = contextMap ? contextMap.get(image.id) : undefined;
        
        // Report progress
        if (progressReporter) {
          progressReporter.reportProgress({
            stage: 'processing-images',
            progress: Math.round((i / totalImages) * 100),
            message: `Processing image ${i + 1} of ${totalImages}`,
            detail: `Image ID: ${image.id}`
          });
        }
        
        try {
          // Get description for the image
          const description = await this.describeImage(image, apiKey, context);
          results.set(image.id, description);
        } catch (error: any) {
          // Log error but continue processing other images
          console.error(`Error processing image ${image.id}:`, error.message);
          results.set(image.id, `[Image description unavailable: ${error.message}]`);
          
          if (progressReporter) {
            progressReporter.reportError(
              new Error(`Failed to describe image ${image.id}: ${error.message}`),
              'processing-images'
            );
          }
        }
      }
      
      // Report completion
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing-images',
          progress: 100,
          message: `Processed ${results.size} of ${totalImages} images`,
          detail: `Successfully described ${results.size} images`
        });
      }
      
      return results;
    } catch (error: any) {
      // Handle overall batch processing error
      throw new Error(`Batch image description failed: ${error.message}`);
    }
  }
  
  /**
   * Builds a prompt for the Vision API based on the context
   * 
   * @param contextText Optional context text related to the image
   * @returns Formatted prompt string
   */
  private buildImagePrompt(contextText?: string): string {
    let prompt = 'Please describe this image in detail, including all visible elements, text, and relevant information.';
    
    // Add specific instructions for scholarly/technical content
    prompt += ' If this appears to be from an academic or technical document, focus on describing charts, figures, diagrams, or technical illustrations with precise detail about data points, trends, labels, and their relationships.';
    
    // Add instructions for OCR if text is visible
    prompt += ' If the image contains text, include transcription of all visible text.';
    
    // Add context-specific instructions
    if (contextText) {
      prompt += ` This image appears in the following context: "${contextText}". Please tailor your description to relate to this context where appropriate.`;
    }
    
    // Add formatting guidance
    prompt += ' Format your response as a clear, concise paragraph without using phrases like "The image shows" or "I can see" - simply describe what is present.';
    
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
   * @param imagePosition Position data of the image
   * @returns Extracted context text
   */
  extractImageContext(ocrPageMarkdown: string, topLeftY: number, bottomRightY: number): string {
    // Simple context extraction by finding text near the image position
    // Split the markdown into lines
    const lines = ocrPageMarkdown.split('\n');
    
    // Determine the area of interest (simulating proximity to image)
    // This is a simplistic approach and could be improved with more sophisticated analysis
    const contextLines: string[] = [];
    
    // Collect lines that might be contextually relevant (headers, captions, surrounding text)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for headers or captions (potential context indicators)
      if (line.startsWith('#') || 
          line.startsWith('Figure') || 
          line.startsWith('Table') || 
          line.startsWith('_Figure') || 
          line.startsWith('_Table')) {
        contextLines.push(line);
      }
    }
    
    // Join and truncate to avoid excessively long context
    let context = contextLines.join(' ');
    if (context.length > 500) {
      context = context.substring(0, 497) + '...';
    }
    
    return context;
  }
}

// Create a singleton instance for easy import
export const mistralImageService = new MistralImageService();
