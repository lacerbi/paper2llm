// AI Summary: Main orchestration pipeline for converting PDFs to Markdown.
// Coordinates file handling, OCR processing, and Markdown generation with progress tracking.

import { 
  PdfFile, 
  OcrOptions, 
  MarkdownOptions, 
  PdfToMdResult,
  ProgressReporter
} from '../types/interfaces';
import { mistralOcrService } from './ocr-service';
import { markdownProcessor } from './markdown-processor';

export class PdfToMdService {
  /**
   * Converts a PDF file to enhanced Markdown
   */
  public async convertPdfToMarkdown(
    file: PdfFile,
    apiKey: string,
    ocrOptions: OcrOptions = {},
    markdownOptions: MarkdownOptions = {},
    progressReporter?: ProgressReporter
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
        apiKey,
        ocrOptions,
        progressReporter
      );
      
      // Step 2: Process the OCR result into enhanced Markdown
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing-markdown',
          progress: 95,
          message: 'Processing OCR results into enhanced Markdown'
        });
      }
      
      const markdownResult = markdownProcessor.processMarkdown(
        ocrResult,
        markdownOptions
      );
      
      // Step 3: Return the combined result
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'completed',
          progress: 100,
          message: 'PDF to Markdown conversion complete'
        });
      }
      
      return {
        markdown: markdownResult.markdown,
        ocrResult,
        markdownResult,
        sourceFile: {
          name: file.name,
          size: file.size,
          source: file.source,
          originalUrl: file.originalUrl
        },
        timestamp: new Date().toISOString()
      };
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
  }
}

// Create a singleton instance for easy import
export const pdfToMdService = new PdfToMdService();
