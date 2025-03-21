// AI Summary: Main orchestration pipeline for converting PDFs to Markdown.
// Coordinates file handling, OCR processing, image description, and Markdown generation with progress tracking.

import { 
  PdfFile, 
  OcrOptions, 
  MarkdownOptions, 
  PdfToMdResult,
  ProgressReporter,
  ApiProvider,
  BibTeXTitleValidation
} from '../types/interfaces';
import { mistralOcrService } from './ocr-service';
import { markdownProcessor } from './markdown-processor';
import { multiProviderImageService } from './image-service';
import { generateBibTeXFromMarkdown, BibTeXGenerationResult } from './utils/bibtex-generator';

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
      
      // Check if there are any images to process
      const hasImages = ocrResult.pages.some(page => page.images.length > 0);
      
      if (hasImages) {
        // Determine if we should process images with AI or use placeholder text
        if (markdownOptions.processImages && visionApiKey && visionProvider && visionModel) {
          // Process images with vision AI
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
        } else {
          // Replace images with placeholder text instead
          if (progressReporter) {
            progressReporter.reportProgress({
              stage: 'enhancing-markdown',
              progress: 85,
              message: 'Replacing images with placeholder text',
              detail: 'No image processing required'
            });
          }
          
          // Use the same enhanceImageReferences method but with special option
          enhancedMarkdown = markdownProcessor.enhanceImageReferences(
            markdownResult.markdown,
            new Map(), // Empty map since we're not using descriptions
            {
              ...markdownOptions,
              replaceImagesWithPlaceholder: true // Special flag to use placeholder text
            }
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
        visionModel: visionModel, // Can be undefined if "None" option was selected
        visionModelProvider: visionProvider, // Can be undefined if "None" option was selected
        bibtex: undefined // Will be populated asynchronously
      };
      
      // Generate BibTeX citation asynchronously without blocking the main conversion
      this.generateBibTeXAsync(enhancedMarkdown, finalResult, progressReporter);
      
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
  
  /**
   * Generates BibTeX citation asynchronously and updates the result object
   * @param markdown The markdown content to generate BibTeX from
   * @param result The result object to update with the generated BibTeX
   * @param progressReporter Optional progress reporter
   */
  private async generateBibTeXAsync(
    markdown: string, 
    result: PdfToMdResult,
    progressReporter?: ProgressReporter
  ): Promise<void> {
    try {
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'generating-bibtex',
          progress: 100, // Main conversion is already complete
          message: 'Generating BibTeX citation in background',
          detail: 'Extracting document metadata for citation'
        });
      }
      
      // Generate BibTeX from the markdown
      const bibtexResult = await generateBibTeXFromMarkdown(markdown);
      
      // Update the result object with the generated BibTeX and validation info
      result.bibtex = bibtexResult.bibtex;
      result.bibtexTitleValidation = bibtexResult.titleValidation;
      
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'bibtex-complete',
          progress: 100,
          message: 'BibTeX citation generated successfully',
        });
      }
    } catch (error) {
      // Log but don't affect the main conversion result
      console.warn('Failed to generate BibTeX citation:', error);
      
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'bibtex-error',
          progress: 100,
          message: 'BibTeX generation failed, may need to be generated on demand',
          detail: (error as Error).message
        });
      }
      
      // Set to empty string to indicate generation was attempted but failed
      result.bibtex = '';
    }
  }
}

// Create a singleton instance for easy import
export const pdfToMdService = new PdfToMdService();
