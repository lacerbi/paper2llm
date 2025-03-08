// AI Summary: Defines core TypeScript interfaces for the PDF-to-Markdown converter.
// Includes file handling, API communication, progress tracking, and API key management interfaces.

/**
 * Represents a PDF file that can be processed by the application.
 */
export interface PdfFile {
  name: string;
  size: number;
  type: string;
  content: File | Blob | ArrayBuffer;
  source: 'upload' | 'url';
  originalUrl?: string;
  directProcessUrl?: boolean; // indicates if URL can be processed directly by Mistral OCR
}

/**
 * Interface for handling file operations in different environments.
 */
export interface FileHandler {
  /**
   * Reads a File object and returns a PdfFile
   */
  readFile(file: File): Promise<PdfFile>;
  
  /**
   * Fetches a PDF from a URL and returns a PdfFile
   */
  fetchFromUrl(url: string): Promise<PdfFile>;
  
  /**
   * Validates if a file is a PDF
   */
  validatePdf(file: File | Blob): boolean;
  
  /**
   * Validates if a URL points to a PDF
   */
  validateUrl(url: string): boolean;
}

/**
 * Represents a callback function for handling errors
 */
export type ErrorHandler = (error: Error) => void;

/**
 * Represents the state of the file uploader
 */
export interface FileUploaderState {
  file: PdfFile | null;
  loading: boolean;
  error: string | null;
  isDragging: boolean;
  url: string;
}

/**
 * Interface for API key storage and management
 */
export interface ApiKeyStorage {
  /**
   * Securely stores an API key
   */
  storeApiKey(apiKey: string, password?: string): Promise<void>;
  
  /**
   * Retrieves a stored API key
   */
  retrieveApiKey(password?: string): Promise<string | null>;
  
  /**
   * Checks if an API key is stored
   */
  hasApiKey(): boolean;
  
  /**
   * Validates if an API key has the correct format
   */
  validateApiKey(apiKey: string): boolean;
  
  /**
   * Removes the stored API key
   */
  clearApiKey(): void;
}

/**
 * Represents the state of the API key manager
 */
export interface ApiKeyManagerState {
  apiKey: string;
  password: string;
  showPassword: boolean;
  isStored: boolean;
  isValid: boolean;
  error: string | null;
  isAuthenticated: boolean;
}

/**
 * Represents options for OCR processing
 */
export interface OcrOptions {
  model?: string;
  includeImageBase64?: boolean;
}

/**
 * Represents an image extracted during OCR processing
 */
export interface OcrImage {
  id: string;
  base64: string;
  topLeftX: number;
  topLeftY: number;
  bottomRightX: number;
  bottomRightY: number;
}

/**
 * Represents a page from OCR processing
 */
export interface OcrPage {
  index: number;
  markdown: string;
  images: OcrImage[];
  dimensions: {
    width: number;
    height: number;
    dpi: number;
  };
}

/**
 * Represents the result of OCR processing
 */
export interface OcrResult {
  pages: OcrPage[];
  model: string;
}

/**
 * Represents a progress update during processing
 */
export interface ProgressUpdate {
  stage: string;
  progress: number;
  message: string;
  detail?: string;
}

/**
 * Callback type for progress updates
 */
export type ProgressListener = (update: ProgressUpdate) => void;

/**
 * Callback type for error reporting
 */
export type ErrorListener = (error: Error, stage: string) => void;

/**
 * Callback type for completion reporting
 */
export type CompleteListener = (result: OcrResult) => void;

/**
 * Interface for progress reporting during processing
 */
export interface ProgressReporter {
  reportProgress(update: ProgressUpdate): void;
  reportError(error: Error, stage: string): void;
  reportComplete(result: OcrResult): void;
  addProgressListener(listener: ProgressListener): void;
  removeProgressListener(listener: ProgressListener): void;
  addErrorListener(listener: ErrorListener): void;
  removeErrorListener(listener: ErrorListener): void;
  addCompleteListener(listener: CompleteListener): void;
  removeCompleteListener(listener: CompleteListener): void;
}

/**
 * Interface for OCR service to convert PDFs to text
 */
export interface OcrService {
  processPdf(
    file: PdfFile, 
    apiKey: string, 
    options?: OcrOptions, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult>;
  
  processPdfUrl(
    url: string, 
    apiKey: string, 
    options?: OcrOptions, 
    progressReporter?: ProgressReporter
  ): Promise<OcrResult>;
  
  cancelOperation(): void;
}

/**
 * Options for markdown processing
 */
export interface MarkdownOptions {
  addPageNumbers?: boolean;
  addPageSeparators?: boolean;
  normalizeLineBreaks?: boolean;
  extractImageReferences?: boolean;
  processImages?: boolean;
  keepOriginalImages?: boolean;
  debugMode?: boolean;
}

/**
 * Result of markdown processing
 */
export interface MarkdownResult {
  markdown: string;
  imageReferences: string[];
  pageCount: number;
  model: string;
}

/**
 * Final result of the PDF to Markdown conversion
 */
export interface PdfToMdResult {
  markdown: string;
  ocrResult: OcrResult;
  markdownResult: MarkdownResult;
  sourceFile: {
    name: string;
    size: number;
    source: 'upload' | 'url';
    originalUrl?: string;
  };
  timestamp: string;
}

/**
 * Interface for image description service
 */
export interface ImageService {
  /**
   * Describes an image using the Vision API
   * 
   * @param image OcrImage object containing image data
   * @param apiKey Mistral API key
   * @param contextText Optional context to include with the image
   * @returns Promise resolving to the image description
   */
  describeImage(
    image: OcrImage,
    apiKey: string,
    contextText?: string
  ): Promise<string>;
  
  /**
   * Describes multiple images in batch
   * 
   * @param images Array of OcrImage objects
   * @param apiKey Mistral API key
   * @param contextMap Optional map of image IDs to context text
   * @param progressReporter Optional progress reporter
   * @returns Promise resolving to a map of image IDs to descriptions
   */
  describeImages(
    images: OcrImage[],
    apiKey: string,
    contextMap?: Map<string, string>,
    progressReporter?: ProgressReporter
  ): Promise<Map<string, string>>;
  
  /**
   * Cancels an ongoing operation if possible
   */
  cancelOperation(): void;
}
