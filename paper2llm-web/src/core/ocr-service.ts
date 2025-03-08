// AI Summary: Implements OCR service client for Mistral API integration.
// Handles PDF processing with progress tracking, error handling, and supports both file and URL inputs.

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { 
  OcrService, 
  OcrOptions, 
  OcrResult, 
  ProgressReporter, 
  PdfFile,
  ProgressUpdate
} from '../types/interfaces';

export class MistralOcrService implements OcrService {
  private readonly apiBaseUrl: string = 'https://api.mistral.ai/v1';
  private readonly defaultModel: string = 'mistral-ocr-latest';
  private axiosInstance: AxiosInstance;
  private abortController: AbortController | null = null;
  
  /**
   * Creates a new MistralOcrService instance
   */
  constructor() {
    this.axiosInstance = axios.create({
      baseURL: this.apiBaseUrl,
      timeout: 60000, // 60 seconds default timeout
    });
  }

  /**
   * Processes a PDF file with OCR
   */
  public async processPdf(
    file: PdfFile, 
    apiKey: string, 
    options: OcrOptions = {}, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult> {
    if (!apiKey) {
      throw new Error('API key is required');
    }

    // If there was a previous operation, cancel it
    if (this.abortController) {
      this.abortController.abort();
    }
    
    // Create a new abort controller for this operation
    this.abortController = new AbortController();
    
    try {
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'preparing',
          progress: 5,
          message: 'Preparing PDF for OCR processing'
        });
      }
      
      // Determine method based on file source and direct processing capability
      if (file.directProcessUrl === true && file.originalUrl) {
        // Direct URL processing for arXiv and similar academic URLs
        return await this.processDirectUrl(file.originalUrl, apiKey, options, progressReporter);
      } else if (file.source === 'upload') {
        return await this.processUploadedPdf(file, apiKey, options, progressReporter);
      } else if (file.source === 'url' && file.originalUrl) {
        return await this.processPdfUrl(file.originalUrl, apiKey, options, progressReporter);
      } else {
        throw new Error('Invalid file source or missing URL');
      }
    } catch (error) {
      // Handle and transform error
      const processedError = this.handleError(error as Error | AxiosError);
      
      if (progressReporter) {
        progressReporter.reportError(processedError, 'ocr-processing');
      }
      
      throw processedError;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Process a PDF from a URL
   * Implementation of interface method for direct URL processing
   */
  public async processPdfUrl(
    url: string, 
    apiKey: string, 
    options: OcrOptions = {}, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult> {
    if (!url) {
      throw new Error('URL is required');
    }
    
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    // If there was a previous operation, cancel it
    if (this.abortController) {
      this.abortController.abort();
    }
    
    // Create a new abort controller for this operation
    this.abortController = new AbortController();
    
    try {
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'submitting',
          progress: 10,
          message: 'Submitting URL to OCR service'
        });
      }
      
      const response = await this.axiosInstance.post(
        '/ocr',
        {
          model: options.model || this.defaultModel,
          document: {
            type: 'document_url',
            document_url: url
          },
          include_image_base64: options.includeImageBase64 !== false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: this.abortController.signal,
          onDownloadProgress: (progressEvent) => {
            if (progressReporter && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 70) + 20;
              progressReporter.reportProgress({
                stage: 'downloading',
                progress: progress,
                message: 'Downloading OCR results',
                detail: `${Math.round(progressEvent.loaded / 1024)} KB of ${Math.round(progressEvent.total / 1024)} KB`
              });
            }
          }
        }
      );

      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing',
          progress: 90,
          message: 'Processing OCR results'
        });
      }
      
      const ocrResult = this.processResponse(response);
      
      if (progressReporter) {
        progressReporter.reportComplete(ocrResult);
      }
      
      return ocrResult;
    } catch (error) {
      // Handle and transform error
      const processedError = this.handleError(error as Error | AxiosError);
      
      if (progressReporter) {
        progressReporter.reportError(processedError, 'ocr-processing');
      }
      
      throw processedError;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Cancels an ongoing OCR operation if possible
   */
  public cancelOperation(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Processes an uploaded PDF file
   * First uploads to the API, then processes with OCR
   */
  private async processUploadedPdf(
    file: PdfFile, 
    apiKey: string, 
    options: OcrOptions, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult> {
    if (progressReporter) {
      progressReporter.reportProgress({
        stage: 'uploading',
        progress: 10,
        message: 'Uploading PDF for OCR processing'
      });
    }
    
    // Convert the file content to a Blob if it's not already
    let fileBlob: Blob;
    if (file.content instanceof Blob) {
      fileBlob = file.content;
    } else if (file.content instanceof ArrayBuffer) {
      fileBlob = new Blob([file.content], { type: 'application/pdf' });
    } else {
      throw new Error('Unsupported file content type');
    }
    
    // Create FormData for file upload
    const formData = new FormData();
    formData.append('purpose', 'ocr');
    formData.append('file', fileBlob, file.name);
    
    try {
      // Step 1: Upload the file
      const uploadResponse = await this.axiosInstance.post(
        '/files',
        formData,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data'
          },
          signal: this.abortController?.signal,
          onUploadProgress: (progressEvent) => {
            if (progressReporter && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 20) + 10;
              progressReporter.reportProgress({
                stage: 'uploading',
                progress: progress,
                message: 'Uploading PDF',
                detail: `${Math.round(progressEvent.loaded / 1024)} KB of ${Math.round(progressEvent.total / 1024)} KB`
              });
            }
          }
        }
      );
      
      const fileId = uploadResponse.data.id;
      
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing',
          progress: 30,
          message: 'PDF uploaded, retrieving file URL'
        });
      }
      
      // Step 2: Get a signed URL for the file
      const urlResponse = await this.axiosInstance.get(
        `/files/${fileId}/url`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          },
          signal: this.abortController?.signal
        }
      );
      
      const fileUrl = urlResponse.data.url;
      
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing',
          progress: 40,
          message: 'Starting OCR processing'
        });
      }
      
      // Step 3: Process the file with OCR
      return await this.processPdfUrl(
        fileUrl, 
        apiKey, 
        options, 
        {
          reportProgress: (update: ProgressUpdate) => {
            if (progressReporter) {
              // Adjust progress to fit in the 40-100 range
              const adjustedProgress = (update.progress / 100) * 60 + 40;
              progressReporter.reportProgress({
                ...update,
                progress: adjustedProgress
              });
            }
          },
          reportError: (error: Error, stage: string) => {
            if (progressReporter) {
              progressReporter.reportError(error, stage);
            }
          },
          reportComplete: (result: OcrResult) => {
            if (progressReporter) {
              progressReporter.reportComplete(result);
            }
          },
          addProgressListener: () => {},
          removeProgressListener: () => {},
          addErrorListener: () => {},
          removeErrorListener: () => {},
          addCompleteListener: () => {},
          removeCompleteListener: () => {}
        }
      );
    } catch (error) {
      // Handle and transform error
      const processedError = this.handleError(error as Error | AxiosError);
      
      if (progressReporter) {
        progressReporter.reportError(processedError, 'file-upload');
      }
      
      throw processedError;
    }
  }

  /**
   * Directly processes a PDF URL using Mistral API without downloading
   * Optimized for arXiv and academic URLs
   */
  private async processDirectUrl(
    url: string, 
    apiKey: string, 
    options: OcrOptions = {}, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult> {
    if (!url) {
      throw new Error('URL is required');
    }
    
    if (!apiKey) {
      throw new Error('API key is required');
    }
    
    // If there was a previous operation, cancel it
    if (this.abortController) {
      this.abortController.abort();
    }
    
    // Create a new abort controller for this operation
    this.abortController = new AbortController();
    
    try {
      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'submitting',
          progress: 10,
          message: 'Submitting URL directly to OCR service'
        });
      }
      
      // For arXiv URLs, ensure we're using the PDF version
      let processUrl = url;
      if (url.includes('arxiv.org') && !url.includes('/pdf/')) {
        // Convert /abs/ or /html/ to /pdf/
        processUrl = url.replace(/\/(abs|html)\//, '/pdf/');
        console.log(`Direct processing with converted arXiv URL: ${processUrl}`);
      }
      
      const response = await this.axiosInstance.post(
        '/ocr',
        {
          model: options.model || this.defaultModel,
          document: {
            type: 'document_url',
            document_url: processUrl
          },
          include_image_base64: options.includeImageBase64 !== false
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          signal: this.abortController.signal,
          onDownloadProgress: (progressEvent) => {
            if (progressReporter && progressEvent.total) {
              const progress = Math.round((progressEvent.loaded / progressEvent.total) * 70) + 20;
              progressReporter.reportProgress({
                stage: 'downloading',
                progress: progress,
                message: 'Downloading OCR results',
                detail: `${Math.round(progressEvent.loaded / 1024)} KB of ${Math.round(progressEvent.total / 1024)} KB`
              });
            }
          }
        }
      );

      if (progressReporter) {
        progressReporter.reportProgress({
          stage: 'processing',
          progress: 90,
          message: 'Processing OCR results'
        });
      }
      
      const ocrResult = this.processResponse(response);
      
      if (progressReporter) {
        progressReporter.reportComplete(ocrResult);
      }
      
      return ocrResult;
    } catch (error) {
      // Handle and transform error
      const processedError = this.handleError(error as Error | AxiosError);
      
      if (progressReporter) {
        progressReporter.reportError(processedError, 'ocr-processing');
      }
      
      throw processedError;
    } finally {
      this.abortController = null;
    }
  }

  /**
   * Processes the API response into a standardized OcrResult
   */
  private processResponse(response: AxiosResponse): OcrResult {
    const data = response.data;
    
    // Basic validation of response format
    if (!data || !Array.isArray(data.pages)) {
      throw new Error('Invalid OCR response format');
    }
    
    // Transform the response to match our internal format
    const ocrResult: OcrResult = {
      pages: data.pages.map((page: any) => ({
        index: page.index,
        markdown: page.markdown,
        images: (page.images || []).map((image: any) => ({
          id: image.id,
          base64: image.image_base64 || '',
          topLeftX: image.top_left_x,
          topLeftY: image.top_left_y,
          bottomRightX: image.bottom_right_x,
          bottomRightY: image.bottom_right_y
        })),
        dimensions: {
          width: page.dimensions?.width || 0,
          height: page.dimensions?.height || 0,
          dpi: page.dimensions?.dpi || 0
        }
      })),
      model: data.model || this.defaultModel
    };
    
    return ocrResult;
  }
  
  /**
   * Handles and transforms API errors into user-friendly errors
   */
  private handleError(error: Error | AxiosError): Error {
    if (axios.isAxiosError(error)) {
      // Handle Axios errors (API errors)
      if (error.response) {
        // The request was made and the server responded with an error status
        const statusCode = error.response.status;
        const responseData = error.response.data as any;
        
        if (statusCode === 401) {
          return new Error('Invalid API key or unauthorized access');
        } else if (statusCode === 400) {
          return new Error(`Bad request: ${responseData.error?.message || 'Invalid parameters'}`);
        } else if (statusCode === 413) {
          return new Error('File too large for OCR processing');
        } else if (statusCode === 429) {
          return new Error('Rate limit exceeded. Please try again later');
        } else if (statusCode >= 500) {
          return new Error('OCR service temporarily unavailable. Please try again later');
        }
        
        return new Error(`OCR processing failed: ${responseData.error?.message || 'Unknown API error'}`);
      } else if (error.request) {
        // The request was made but no response was received
        if (error.code === 'ECONNABORTED') {
          return new Error('OCR request timed out. Please try with a smaller file or check your network connection');
        }
        
        return new Error('No response from OCR service. Please check your network connection');
      }
      
      // Something else happened in setting up the request
      return new Error(`OCR request failed: ${error.message}`);
    }
    
    // For non-Axios errors, just pass through
    return error;
  }
}

// Create a singleton instance for easy import
export const mistralOcrService = new MistralOcrService();
