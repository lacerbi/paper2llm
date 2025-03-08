// AI Summary: React component for PDF file uploading with drag-and-drop support.
// Handles both file uploads and URL inputs with validation and error messaging.

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { FileUploaderState, PdfFile } from '../../types/interfaces';
import { webFileHandler } from '../../adapters/web/file-handler';

interface FileUploaderProps {
  onFileSelected: (file: PdfFile) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected }) => {
  const [state, setState] = useState<FileUploaderState>({
    file: null,
    loading: false,
    error: null,
    isDragging: false,
    url: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle drag events
  const handleDragEnter = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: true }));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState(prev => ({ ...prev, isDragging: false }));
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setState(prev => ({ ...prev, isDragging: true }));
    }
  }, []);

  // Process dropped files
  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    setState(prev => ({ ...prev, isDragging: false, loading: true, error: null }));
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      
      try {
        const pdfFile = await webFileHandler.readFile(file);
        setState(prev => ({ ...prev, file: pdfFile, loading: false }));
        onFileSelected(pdfFile);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to process file' 
        }));
      }
    }
  }, [onFileSelected]);

  // Handle file input change
  const handleFileChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      try {
        const pdfFile = await webFileHandler.readFile(e.target.files[0]);
        setState(prev => ({ ...prev, file: pdfFile, loading: false }));
        onFileSelected(pdfFile);
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: error instanceof Error ? error.message : 'Failed to process file' 
        }));
      }
    }
  }, [onFileSelected]);

  // Handle URL input
  const handleUrlChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setState(prev => ({ ...prev, url: e.target.value }));
  }, []);

  // Process URL submission
  const handleUrlSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!state.url.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a URL' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const pdfFile = await webFileHandler.fetchFromUrl(state.url);
      setState(prev => ({ ...prev, file: pdfFile, loading: false }));
      onFileSelected(pdfFile);
    } catch (error) {
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error instanceof Error ? error.message : 'Failed to fetch PDF from URL' 
      }));
    }
  }, [state.url, onFileSelected]);

  // Trigger file selection dialog
  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="file-uploader">
      <h2>Upload PDF</h2>
      
      {/* Drag and Drop Area */}
      <div 
        className={`drag-drop-area ${state.isDragging ? 'dragging' : ''}`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelectFile}
      >
        <div className="drag-drop-content">
          <div className="upload-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 16V4M12 4L8 8M12 4L16 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M3 16V18C3 19.1046 3.89543 20 5 20H19C20.1046 20 21 19.1046 21 18V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p>
            {state.isDragging 
              ? 'Drop your PDF here' 
              : 'Drag & drop your PDF here or click to browse'
            }
          </p>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            style={{ display: 'none' }}
          />
        </div>
      </div>

      <div className="separator">
        <span>OR</span>
      </div>

      {/* URL Input Form */}
      <form onSubmit={handleUrlSubmit} className="url-form">
        <div className="input-group">
          <input
            type="text"
            placeholder="Enter URL to a PDF file"
            value={state.url}
            onChange={handleUrlChange}
            disabled={state.loading}
          />
          <button type="submit" disabled={state.loading || !state.url.trim()}>
            {state.loading ? 'Loading...' : 'Fetch'}
          </button>
        </div>
      </form>

      {/* Error Message */}
      {state.error && (
        <div className="error-message">
          {state.error}
        </div>
      )}

      {/* File Info */}
      {state.file && (
        <div className="file-info">
          <h3>Selected File</h3>
          <p>
            <strong>Name:</strong> {state.file.name}
          </p>
          <p>
            <strong>Size:</strong> {(state.file.size / 1024 / 1024).toFixed(2)} MB
          </p>
          <p>
            <strong>Source:</strong> {state.file.source === 'upload' ? 'Local Upload' : 'URL'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
