// AI Summary: React component that displays detailed conversion progress.
// Shows stages, progress bar, error handling, and allows operation cancellation.

import React, { useState, useEffect } from 'react';
import { ProgressUpdate } from '../../types/interfaces';
import { ImageProcessingError } from '../../core/image-service';

interface ProcessingStatusProps {
  isProcessing: boolean;
  currentProgress: ProgressUpdate | null;
  error: Error | null;
  onCancel: () => void;
  onRetry: () => void;
}

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  isProcessing,
  currentProgress,
  error,
  onCancel,
  onRetry
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Update time elapsed during processing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isProcessing) {
      const startTime = Date.now();
      interval = setInterval(() => {
        setTimeElapsed(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    } else {
      setTimeElapsed(0);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isProcessing]);

  if (!isProcessing && !error) {
    return null;
  }
  
  const formatTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };
  
  // Get appropriate icon based on stage
  const getStageIcon = (stage: string): string => {
    switch (stage) {
      case 'preparing':
        return '📋';
      case 'uploading':
        return '⬆️';
      case 'submitting':
        return '🔄';
      case 'processing':
        return '⚙️';
      case 'downloading':
        return '⬇️';
      case 'processing-markdown':
        return '📝';
      case 'processing-images':
        return '🖼️';
      case 'enhancing-markdown':
        return '✨';
      case 'completed':
        return '✅';
      default:
        return '🔄';
    }
  };
  
  // Get appropriate icon based on error type
  const getErrorIcon = (error: Error): string => {
    if (error instanceof ImageProcessingError) {
      const errorType = (error as ImageProcessingError).type;
      switch (errorType) {
        case 'auth_error':
          return '🔒'; // Authentication/authorization error
        case 'format_error':
          return '🖼️'; // Image format error
        case 'rate_limit':
          return '⏱️'; // Rate limiting
        case 'timeout':
          return '⌛'; // Timeout
        case 'server_error':
          return '🖥️'; // Server error
        case 'validation_error':
          return '⚠️'; // Input validation error
        case 'cancelled':
          return '🛑'; // Cancelled operation
        case 'size_error':
          return '📏'; // File size error
        default:
          return '❌'; // Generic error
      }
    }
    return '❌'; // Default error icon
  };
  
  return (
    <div className="processing-status">
      {isProcessing && currentProgress && (
        <div className="status-content">
          <h3>Processing PDF</h3>
          
          <div className="progress-container">
            <div className="progress-info">
              <span className="stage">
                {getStageIcon(currentProgress.stage)} {currentProgress.message}
              </span>
              <span className="time">{formatTime(timeElapsed)}</span>
            </div>
            
            <div className="progress-bar-container">
              <div 
                className="progress-bar" 
                style={{ width: `${currentProgress.progress}%` }}
              />
            </div>
            
            {currentProgress.detail && (
              <div className="progress-detail">
                {currentProgress.detail}
              </div>
            )}
          </div>
          
          <div className="actions">
            <button 
              className="cancel-button"
              onClick={onCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="error-container">
          <h3>
            {getErrorIcon(error)} Error Processing PDF
          </h3>
          <div className="error-message">
            {error.message}
          </div>
          {error instanceof ImageProcessingError && (
            <div className="error-details">
              Error type: {(error as ImageProcessingError).type}
            </div>
          )}
          <div className="actions">
            <button 
              className="retry-button"
              onClick={onRetry}
            >
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProcessingStatus;
