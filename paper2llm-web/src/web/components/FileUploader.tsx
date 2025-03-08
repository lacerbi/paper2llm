// AI Summary: React component for PDF file uploading with drag-and-drop support.
// Handles both file uploads and URL inputs with validation and error messaging.
// Now uses Material UI components for consistent styling.

import React, { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  TextField, 
  Button, 
  Divider, 
  Card, 
  CardContent,
  Alert,
  IconButton, 
  useTheme
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  InsertDriveFile as FileIcon
} from '@mui/icons-material';
import { FileUploaderState, PdfFile } from '../../types/interfaces';
import { webFileHandler } from '../../adapters/web/file-handler';

interface FileUploaderProps {
  onFileSelected: (file: PdfFile) => void;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelected }) => {
  const theme = useTheme();
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
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" component="h2" sx={{ mb: 2 }}>
        Upload PDF
      </Typography>
      
      {/* Drag and Drop Area */}
      <Paper 
        elevation={0}
        sx={{
          border: '2px dashed',
          borderColor: state.isDragging ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 3,
          textAlign: 'center',
          cursor: 'pointer',
          bgcolor: state.isDragging ? 'action.hover' : 'background.paper',
          transition: 'all 0.2s ease',
          mb: 3
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onClick={handleSelectFile}
      >
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          gap: 2 
        }}>
          <UploadIcon 
            color="primary" 
            sx={{ 
              fontSize: 48,
              opacity: state.isDragging ? 1 : 0.8
            }} 
          />
          <Typography>
            {state.isDragging 
              ? 'Drop your PDF here' 
              : 'Drag & drop your PDF here or click to browse'
            }
          </Typography>
          <input 
            type="file" 
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="application/pdf"
            style={{ display: 'none' }}
          />
        </Box>
      </Paper>

      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        my: 3,
        color: 'text.secondary',
        '&::before, &::after': {
          content: '""',
          flex: 1,
          borderBottom: '1px solid',
          borderColor: 'divider'
        }
      }}>
        <Typography 
          variant="overline" 
          component="span" 
          sx={{ 
            px: 2, 
            textTransform: 'uppercase',
            fontWeight: 600,
            fontSize: '0.75rem'
          }}
        >
          OR
        </Typography>
      </Box>

      {/* URL Input Form */}
      <Box 
        component="form" 
        onSubmit={handleUrlSubmit} 
        sx={{ mb: 3 }}
      >
        <Box sx={{ 
          display: 'flex', 
          gap: 1,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            fullWidth
            placeholder="Enter URL to a PDF file"
            value={state.url}
            onChange={handleUrlChange}
            disabled={state.loading}
            variant="outlined"
            size="medium"
            InputProps={{
              sx: { borderTopRightRadius: { sm: 0 }, borderBottomRightRadius: { sm: 0 } }
            }}
          />
          <Button 
            type="submit" 
            variant="contained" 
            disabled={state.loading || !state.url.trim()}
            sx={{ 
              px: 3,
              borderTopLeftRadius: { sm: 0 },
              borderBottomLeftRadius: { sm: 0 },
              minWidth: { sm: '120px' }
            }}
          >
            {state.loading ? 'Loading...' : 'Fetch'}
          </Button>
        </Box>
      </Box>

      {/* Error Message */}
      {state.error && (
        <Alert 
          severity="error" 
          sx={{ mb: 3 }}
          variant="outlined"
        >
          {state.error}
        </Alert>
      )}

      {/* File Info */}
      {state.file && (
        <Card variant="outlined" sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Selected File
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <FileIcon sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="body1">
                <strong>Name:</strong> {state.file.name}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Size:</strong> {(state.file.size / 1024 / 1024).toFixed(2)} MB
            </Typography>
            <Typography variant="body2">
              <strong>Source:</strong> {state.file.source === 'upload' ? 'Local Upload' : 'URL'}
              {state.file.originalUrl && (
                <Typography 
                  component="span" 
                  sx={{ 
                    display: 'block',
                    color: 'text.secondary',
                    fontSize: '0.875rem',
                    mt: 0.5,
                    wordBreak: 'break-all'
                  }}
                >
                  {state.file.originalUrl}
                </Typography>
              )}
            </Typography>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default FileUploader;
