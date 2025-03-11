// AI Summary: Main orchestration pipeline for converting PDFs to Markdown.
// Coordinates file handling, OCR processing, image description, and Markdown generation with progress tracking.

import { 
  PdfFile, 
  OcrOptions, 
  MarkdownOptions, 
  PdfToMdResult,
  ProgressReporter,
  ApiProvider
} from '../types/interfaces';
import { mistralOcrService } from './ocr-service';
import { markdownProcessor } from './markdown-processor';
import { multiProviderImageService } from './image-service';

export class PdfToMdService {
  /**
   * Converts a PDF file to enhanced Markdown
   */
  public async convertPdfToMarkdown(
    file: PdfFile,
    ocrApiKey: string,
    visionApiKey: string,
    ocrOptions: OcrOptions = {},
    markdownOptions: MarkdownOptions = {},
    progressReporter?: ProgressReporter,
    visionModel?: string,
    visionProvider: ApiProvider = 'mistral'
  ): Promise<PdfToMdResult> {
    try {
      // Step 1: Process the PDF with OCR
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'starting',
          progress: 0,
          message: 'Starting PDF to Markdown conversion'
        });
      }
      
      const ocrResult = await mistralOcrService.processPdf(
        file,
        ocrApiKey,
        ocrOptions,
        progressReporter
      );
      
      // Step 2: Process the OCR result into enhanced Markdown
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing-markdown',
          progress: 50,
          message: 'Processing OCR results into enhanced Markdown'
        });
      }
      
      const markdownResult = markdownProcessor.processMarkdown(
        ocrResult,
        markdownOptions
      );
      
      // Step 3: Process images if enabled
      let enhancedMarkdown = markdownResult.markdown;
      
      if (markdownOptions.processImages && ocrResult.pages.some(page => page.images.length > 0)) {
        if (progressReporter) {
          progressReporter.reportProgress({
            stage: 'processing-images',
            progress: 60,
            message: 'Processing images with Vision AI',
            detail: 'Extracting image contexts and preparing for description'
          });
        }
        
        // Collect all images from all pages
        const allImages = ocrResult.pages.flatMap(page => page.images);
        
        // Only proceed if there are images to process
        if (allImages.length > 0) {
          // Build context map for all images
          const contextMap = markdownProcessor.buildImageContextMap(ocrResult.pages);
          
          // Process all images to get descriptions
          const imageDescriptions = await multiProviderImageService.describeImages(
            allImages,
            visionApiKey,
            visionProvider,
            contextMap,
            progressReporter,
            visionModel
          );
          
          if (progressReporter) {
            progressReporter.reportProgress({
              stage: 'enhancing-markdown',
              progress: 85,
              message: 'Enhancing Markdown with image descriptions',
              detail: `Processed ${imageDescriptions.size} images`
            });
          }
          
          // Enhance markdown with image descriptions
          enhancedMarkdown = markdownProcessor.enhanceImageReferences(
            markdownResult.markdown,
            imageDescriptions,
            markdownOptions
          );
        }
      }
      
      // Step 4: Return the combined result
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'completed',
          progress: 100,
          message: 'PDF to Markdown conversion complete'
        });
      }
      
      // Create the final result with either the original or enhanced markdown
      const finalResult: PdfToMdResult = {
        markdown: enhancedMarkdown,
        ocrResult,
        markdownResult,
        sourceFile: {
          name: file.name,
          size: file.directProcessUrl ? ocrResult.pages.length : file.size, // Use page count for direct URLs
          source: file.source,
          originalUrl: file.originalUrl
        },
        timestamp: new Date().toISOString(),
        visionModel: visionModel,
        visionModelProvider: visionProvider
      };
      
      return finalResult;
    } catch (error) {
      // Re-throw with more context
      throw new Error(`PDF to Markdown conversion failed: ${(error as Error).message}`);
    }
  }
  
  /**
   * Cancels an ongoing conversion operation if possible
   */
  public cancelOperation(): void {
    mistralOcrService.cancelOperation();
    multiProviderImageService.cancelOperation();
  }
}

// Create a singleton instance for easy import
export const pdfToMdService = new PdfToMdService();
