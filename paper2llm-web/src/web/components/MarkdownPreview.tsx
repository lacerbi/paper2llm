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
  
  return (
    <div className="markdown-preview">
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
      </div>
      
      <div className="markdown-container">
        <div className="rendered-markdown">
          <ReactMarkdown>{markdown}</ReactMarkdown>
        </div>
        
        <div className="markdown-source">
          <h3>Markdown Source</h3>
          <pre>{markdown}</pre>
        </div>
      </div>
    </div>
  );
};

export default MarkdownPreview;
