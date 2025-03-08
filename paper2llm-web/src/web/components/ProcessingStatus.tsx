// AI Summary: React component that displays PDF conversion progress using Material UI.
// Shows stages with icons, animated progress indicators, and detailed error handling with recovery options.

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  LinearProgress, 
  Button, 
  Alert, 
  AlertTitle, 
  Stack,
  Chip,
  Divider,
  Collapse,
  IconButton
} from '@mui/material';
import { 
  CloudUpload as UploadIcon,
  Settings as ProcessingIcon,
  CloudDownload as DownloadIcon,
  FormatListBulleted as MarkdownIcon,
  Image as ImageIcon,
  AutoFixHigh as EnhanceIcon,
  TaskAlt as CompletedIcon,
  Description as PrepareIcon,
  Cancel as CancelIcon,
  Replay as RetryIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { ProgressUpdate } from '../../types/interfaces';
import { ImageProcessingError } from '../../core/image-service';

interface ProcessingStatusProps {
  isProcessing: boolean;
  currentProgress: ProgressUpdate | null;
  error: Error | null;
  onCancel: () => void;
  onRetry: () => void;
}

// Helper functions to enhance the visual indicators
const getStageIcon = (stage: string) => {
  switch (stage) {
    case 'preparing':
      return <PrepareIcon color="primary" />;
    case 'uploading':
      return <UploadIcon color="primary" />;
    case 'submitting':
      return <UploadIcon color="primary" />;
    case 'processing':
      return <ProcessingIcon color="primary" />;
    case 'downloading':
      return <DownloadIcon color="primary" />;
    case 'processing-markdown':
      return <MarkdownIcon color="primary" />;
    case 'processing-images':
      return <ImageIcon color="primary" />;
    case 'enhancing-markdown':
      return <EnhanceIcon color="primary" />;
    case 'completed':
      return <CompletedIcon color="success" />;
    default:
      return <ProcessingIcon color="primary" />;
  }
};

const getStageLabel = (stage: string): string => {
  switch (stage) {
    case 'preparing':
      return 'Preparing Document';
    case 'uploading':
      return 'Uploading to OCR Service';
    case 'submitting':
      return 'Submitting to OCR Service';
    case 'processing':
      return 'Processing Document';
    case 'downloading':
      return 'Retrieving Results';
    case 'processing-markdown':
      return 'Formatting Markdown';
    case 'processing-images':
      return 'Processing Images';
    case 'enhancing-markdown':
      return 'Enhancing Content';
    case 'completed':
      return 'Completed';
    default:
      return 'Processing';
  }
};

const getErrorSeverity = (error: Error) => {
  if (error instanceof ImageProcessingError) {
    switch ((error as ImageProcessingError).type) {
      case 'auth_error':
        return 'error';
      case 'rate_limit':
        return 'warning';
      case 'server_error':
        return 'error';
      case 'cancelled':
        return 'info';
      default:
        return 'error';
    }
  }
  return 'error';
};

const getErrorTitle = (error: Error): string => {
  if (error instanceof ImageProcessingError) {
    const errorType = (error as ImageProcessingError).type;
    switch (errorType) {
      case 'auth_error':
        return 'Authentication Error';
      case 'format_error':
        return 'Format Error';
      case 'rate_limit':
        return 'Rate Limit Exceeded';
      case 'timeout':
        return 'Request Timeout';
      case 'server_error':
        return 'Server Error';
      case 'validation_error':
        return 'Validation Error';
      case 'cancelled':
        return 'Operation Cancelled';
      case 'size_error':
        return 'File Size Error';
      default:
        return 'Processing Error';
    }
  }
  return 'Error Processing PDF';
};

const getErrorAction = (error: Error): string => {
  if (error instanceof ImageProcessingError) {
    const errorType = (error as ImageProcessingError).type;
    switch (errorType) {
      case 'auth_error':
        return 'Please check your API key and try again.';
      case 'format_error':
        return 'The image format is not supported. Try a different file.';
      case 'rate_limit':
        return 'Please wait a moment before retrying.';
      case 'timeout':
        return 'The request timed out. Try again with a smaller document.';
      case 'server_error':
        return 'There was a server error. Please try again later.';
      case 'size_error':
        return 'The file exceeds the maximum allowed size.';
      default:
        return 'Please try again or use a different file.';
    }
  }
  return 'Please try again or use a different file.';
};

const ProcessingStatus: React.FC<ProcessingStatusProps> = ({
  isProcessing,
  currentProgress,
  error,
  onCancel,
  onRetry
}) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [expanded, setExpanded] = useState(false);
  
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

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };
  
  return (
    <Card 
      variant="outlined" 
      sx={{ 
        mb: 3,
        borderRadius: 2,
        transition: 'all 0.3s ease',
        borderColor: error ? 'error.main' : 'divider'
      }}
    >
      {isProcessing && currentProgress && (
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {getStageIcon(currentProgress.stage)}
              <Typography variant="h6" component="h3" sx={{ ml: 1, flexGrow: 1 }}>
                {getStageLabel(currentProgress.stage)}
              </Typography>
              <Chip 
                label={`${formatTime(timeElapsed)}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            </Box>
            
            <Box sx={{ mt: 2, mb: 2 }}>
              <LinearProgress 
                variant="determinate" 
                value={currentProgress.progress} 
                sx={{ 
                  height: 10, 
                  borderRadius: 5,
                  '& .MuiLinearProgress-bar': {
                    transition: 'transform 0.4s ease'
                  }
                }}
              />
              {currentProgress.detail && (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <IconButton
                      size="small"
                      onClick={handleExpandClick}
                      sx={{
                        transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s'
                      }}
                    >
                      <ExpandMoreIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Collapse in={expanded}>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      {currentProgress.detail}
                    </Typography>
                  </Collapse>
                </>
              )}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined"
                color="error"
                startIcon={<CancelIcon />}
                onClick={onCancel}
                size="small"
              >
                Cancel
              </Button>
            </Box>
          </Box>
        </CardContent>
      )}
      
      {error && (
        <CardContent>
          <Alert 
            severity={getErrorSeverity(error)} 
            sx={{ mb: 2 }}
            variant="outlined"
          >
            <AlertTitle>{getErrorTitle(error)}</AlertTitle>
            {error.message}
            <Typography variant="body2" sx={{ mt: 1 }}>
              {getErrorAction(error)}
            </Typography>
          </Alert>
          
          {error instanceof ImageProcessingError && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">
                Error type: {(error as ImageProcessingError).type}
              </Typography>
            </Box>
          )}
          
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button 
              variant="contained"
              color="primary"
              startIcon={<RetryIcon />}
              onClick={onRetry}
              size="small"
            >
              Try Again
            </Button>
          </Stack>
        </CardContent>
      )}
    </Card>
  );
};

export default ProcessingStatus;
