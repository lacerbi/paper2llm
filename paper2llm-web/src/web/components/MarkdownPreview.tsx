// AI Summary: React component for rendering and interacting with converted Markdown.
// Features include syntax highlighting, copying, downloading, and metadata display.

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { PdfToMdResult } from '../../types/interfaces';

interface MarkdownPreviewProps {
  result: PdfToMdResult | null;
  onNewConversion: () => void;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  result,
  onNewConversion
}) => {
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'rendered' | 'source'>('rendered');
  
  if (!result) {
    return null;
  }
  
  const { markdown, sourceFile, timestamp, markdownResult } = result;
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => {
        setCopySuccess('Copied to clipboard!');
        setTimeout(() => setCopySuccess(null), 2000);
      })
      .catch(() => {
        setCopySuccess('Failed to copy');
        setTimeout(() => setCopySuccess(null), 2000);
      });
  };
  
  const handleDownload = () => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create a filename based on the source file
    const baseFileName = sourceFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
    link.download = `${baseFileName}.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  const formatTimestamp = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Calculate image metrics
  const calculateImageMetrics = () => {
    // Count all markdown image references (standard format)
    const markdownImageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || []).length;
    
    // Count all images with descriptions 
    const describedImageCount = (markdown.match(/> \*\*Image Description:\*\*/g) || []).length;
    
    // Use the larger of the two counts for total images, ensuring describedImageCount is never > originalImageCount
    // This handles cases where images were processed but aren't in markdown syntax
    const originalImageCount = Math.max(markdownImageCount, describedImageCount);
    
    return {
      originalImageCount,
      describedImageCount,
      hasProcessedImages: describedImageCount > 0
    };
  };
  
  const imageMetrics = calculateImageMetrics();
  
  // Custom components for ReactMarkdown
  const components = {
    blockquote: ({ node, ...props }: any) => {
      // Check if this is an image description blockquote
      const isImageDescription = props.children && 
                                props.children.toString().includes('Image Description');
      
      return (
        <blockquote 
          className={isImageDescription ? 'image-description-quote' : 'blockquote'}
          {...props}
        />
      );
    }
  };
  
  // Add some custom styles for image descriptions
  const customStyles = `
    .image-description-quote {
      background-color: #f0f8ff;
      border-left: 4px solid #4682b4;
      padding: 10px 15px;
      margin: 10px 0;
      border-radius: 0 4px 4px 0;
    }
    
    .view-mode-selector {
      display: flex;
      margin-bottom: 15px;
    }
    
    .view-mode-button {
      padding: 5px 10px;
      border: 1px solid #ddd;
      background: #f5f5f5;
      cursor: pointer;
    }
    
    .view-mode-button.active {
      background: #e0e0e0;
      font-weight: bold;
    }
    
    .view-mode-button:first-child {
      border-radius: 4px 0 0 4px;
    }
    
    .view-mode-button:last-child {
      border-radius: 0 4px 4px 0;
    }
    
    .image-metrics {
      margin-top: 10px;
      background-color: #f8f8f8;
      padding: 8px;
      border-radius: 4px;
      font-size: 0.9em;
    }
  `;
  
  return (
    <div className="markdown-preview">
      <style>{customStyles}</style>
      
      <div className="preview-header">
        <h2>Converted Markdown</h2>
        <div className="preview-actions">
          <button 
            className="copy-button"
            onClick={handleCopyToClipboard}
          >
            {copySuccess || 'Copy to Clipboard'}
          </button>
          <button 
            className="download-button"
            onClick={handleDownload}
          >
            Download Markdown
          </button>
          <button 
            className="new-button"
            onClick={onNewConversion}
          >
            New Conversion
          </button>
        </div>
      </div>
      
      <div className="metadata">
        <div className="metadata-item">
          <strong>Source:</strong> {sourceFile.name} ({formatFileSize(sourceFile.size)})
        </div>
        <div className="metadata-item">
          <strong>Converted:</strong> {formatTimestamp(timestamp)}
        </div>
        <div className="metadata-item">
          <strong>Pages:</strong> {markdownResult.pageCount}
        </div>
        <div className="metadata-item">
          <strong>OCR Model:</strong> {markdownResult.model}
        </div>
        
        {(imageMetrics.originalImageCount > 0 || imageMetrics.describedImageCount > 0) && (
          <div className="image-metrics">
            {imageMetrics.hasProcessedImages ? (
              <div>
                <strong>Images processed:</strong> {imageMetrics.describedImageCount} of {imageMetrics.originalImageCount} images have AI-generated descriptions
              </div>
            ) : (
              <div>
                <strong>Images:</strong> {imageMetrics.originalImageCount} images detected 
                {imageMetrics.originalImageCount > 0 ? " (no AI descriptions generated)" : ""}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="view-mode-selector">
        <button 
          className={`view-mode-button ${viewMode === 'rendered' ? 'active' : ''}`}
          onClick={() => setViewMode('rendered')}
        >
          Rendered View
        </button>
        <button 
          className={`view-mode-button ${viewMode === 'source' ? 'active' : ''}`}
          onClick={() => setViewMode('source')}
        >
          Source View
        </button>
      </div>
      
      <div className="markdown-container">
        {viewMode === 'rendered' ? (
          <div className="rendered-markdown">
            <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
          </div>
        ) : (
          <div className="markdown-source">
            <h3>Markdown Source</h3>
            <pre>{markdown}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default MarkdownPreview;
