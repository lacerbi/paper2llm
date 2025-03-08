// AI Summary: Main application component that integrates file uploader, API key management,
// processing status, and Markdown preview into a complete PDF-to-Markdown workflow.

import React, { useState, useCallback } from 'react';
import FileUploader from './components/FileUploader';
import ApiKeyManager from './components/ApiKeyManager';
import ProcessingStatus from './components/ProcessingStatus';
import MarkdownPreview from './components/MarkdownPreview';
import { 
  PdfFile, 
  ProgressUpdate, 
  PdfToMdResult 
} from '../types/interfaces';
import { webProgressReporter } from '../adapters/web/progress-reporter';
import { pdfToMdService } from '../core/pdf-to-md';
import '../styles/App.css';

const App: React.FC = () => {
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [apiKey, setApiKey] = useState<string>('');
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(null);
  const [conversionResult, setConversionResult] = useState<PdfToMdResult | null>(null);

  // Handle API key changes
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    setIsApiKeyValid(key.length > 0);
  };

  // Handle file selection
  const handleFileSelected = useCallback((file: PdfFile) => {
    setPdfFile(file);
    setConversionResult(null);
    setProcessingError(null);
  }, []);

  // Set up progress reporting
  const setupProgressReporting = useCallback(() => {
    // Clear any existing listeners
    webProgressReporter.removeProgressListener(setProgressUpdate);
    webProgressReporter.removeErrorListener(handleProcessingError);
    
    // Add new listeners
    webProgressReporter.addProgressListener(setProgressUpdate);
    webProgressReporter.addErrorListener(handleProcessingError);
  }, []);

  // Handle processing errors
  const handleProcessingError = useCallback((error: Error) => {
    setProcessingError(error);
    setIsProcessing(false);
  }, []);

  // Start the conversion process
  const startConversion = useCallback(async () => {
    if (!pdfFile || !isApiKeyValid) {
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingError(null);
      setConversionResult(null);
      setupProgressReporting();
      
      const result = await pdfToMdService.convertPdfToMarkdown(
        pdfFile,
        apiKey,
        { includeImageBase64: true },
        { 
          addPageNumbers: true, 
          addPageSeparators: true,
          normalizeLineBreaks: true,
          extractImageReferences: true
        },
        webProgressReporter
      );
      
      setConversionResult(result);
      setIsProcessing(false);
    } catch (error) {
      setProcessingError(error as Error);
      setIsProcessing(false);
    }
  }, [pdfFile, apiKey, isApiKeyValid, setupProgressReporting]);

  // Cancel the conversion process
  const cancelConversion = useCallback(() => {
    pdfToMdService.cancelOperation();
    setIsProcessing(false);
  }, []);

  // Reset for a new conversion
  const handleNewConversion = useCallback(() => {
    setPdfFile(null);
    setConversionResult(null);
    setProcessingError(null);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>paper2llm</h1>
        <p>Convert papers (as PDFs) into LLM-friendly Markdown files</p>
      </header>
      
      <main className="app-main">
        <div className="container">
          <section className="api-section">
            <ApiKeyManager onApiKeyChange={handleApiKeyChange} />
          </section>
          
          {isApiKeyValid && !conversionResult && (
            <section className="upload-section">
              <FileUploader onFileSelected={handleFileSelected} />
              
              {pdfFile && !isProcessing && (
                <div className="file-actions">
                  <button 
                    className="process-button"
                    onClick={startConversion}
                  >
                    Process PDF
                  </button>
                  <div className="file-info">
                    <strong>File:</strong> {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
                  </div>
                </div>
              )}
            </section>
          )}
          
          {!isApiKeyValid && (
            <div className="instructions">
              <p>
                To get started, please enter your Mistral API key above.
                You'll need a valid API key to use the OCR service.
              </p>
            </div>
          )}
          
          <section className="processing-section">
            <ProcessingStatus 
              isProcessing={isProcessing}
              currentProgress={progressUpdate}
              error={processingError}
              onCancel={cancelConversion}
              onRetry={startConversion}
            />
          </section>
          
          {conversionResult && (
            <section className="preview-section">
              <MarkdownPreview 
                result={conversionResult}
                onNewConversion={handleNewConversion}
              />
            </section>
          )}
        </div>
      </main>
      
      <footer className="app-footer">
        <p>© 2025 paper2llm - MIT License</p>
      </footer>
    </div>
  );
};

export default App;
