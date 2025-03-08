// AI Summary: React component for rendering and interacting with converted Markdown.
// Features include syntax highlighting, copying, downloading, and metadata display.
// Uses Material UI for modern styling and improved user experience.

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Box,
  Paper,
  Typography,
  Button,
  Tabs,
  Tab,
  Chip,
  Stack,
  Divider,
  Snackbar,
  Alert,
  IconButton,
  useTheme
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  FileDownload as DownloadIcon,
  AddCircleOutline as NewIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  CalendarToday as DateIcon,
  DescriptionOutlined as MarkdownIcon,
  Code as CodeIcon,
  AutoStories as PageIcon
} from '@mui/icons-material';
import { PdfToMdResult } from '../../types/interfaces';

interface MarkdownPreviewProps {
  result: PdfToMdResult | null;
  onNewConversion: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`markdown-tabpanel-${index}`}
      aria-labelledby={`markdown-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  result,
  onNewConversion
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'error'>('success');
  
  if (!result) {
    return null;
  }
  
  const { markdown, sourceFile, timestamp, markdownResult } = result;
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(markdown)
      .then(() => {
        setSnackbarMessage('Copied to clipboard!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      })
      .catch(() => {
        setSnackbarMessage('Failed to copy');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      });
  };
  
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
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
        <Box 
          component="blockquote"
          sx={{
            pl: 2,
            borderLeft: isImageDescription 
              ? `4px solid ${theme.palette.info.main}`
              : `4px solid ${theme.palette.primary.main}`,
            bgcolor: isImageDescription 
              ? 'rgba(41, 182, 246, 0.1)'
              : 'rgba(0, 0, 0, 0.03)',
            borderRadius: '0 4px 4px 0',
            py: 1,
            px: 2,
            my: 2
          }}
          {...props}
        />
      );
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      return inline ? (
        <Box 
          component="code"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: 'monospace'
          }}
          {...props}
        >
          {children}
        </Box>
      ) : (
        <Box 
          component="pre"
          sx={{
            bgcolor: 'rgba(0, 0, 0, 0.05)',
            p: 2,
            borderRadius: 1,
            overflowX: 'auto',
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            my: 2
          }}
          {...props}
        >
          <code className={className}>{children}</code>
        </Box>
      );
    },
    table: ({ node, ...props }: any) => (
      <Box 
        component="div"
        sx={{ 
          overflowX: 'auto', 
          my: 2 
        }}
      >
        <Box 
          component="table"
          sx={{
            borderCollapse: 'collapse',
            width: '100%',
            '& th, & td': {
              border: `1px solid ${theme.palette.divider}`,
              p: 1,
              textAlign: 'left'
            },
            '& th': {
              bgcolor: 'rgba(0, 0, 0, 0.04)',
              fontWeight: 'bold'
            }
          }}
          {...props}
        />
      </Box>
    )
  };
  
  return (
    <Paper 
      elevation={2} 
      sx={{ 
        p: 3, 
        borderRadius: 2,
        overflow: 'hidden'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center' }}>
          <MarkdownIcon sx={{ mr: 1 }} />
          Converted Markdown
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<CopyIcon />}
            onClick={handleCopyToClipboard}
            size="small"
          >
            Copy
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={handleDownload}
            size="small"
          >
            Download
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<NewIcon />}
            onClick={onNewConversion}
            size="small"
          >
            New Conversion
          </Button>
        </Stack>
      </Box>
      
      <Paper 
        variant="outlined" 
        sx={{ p: 2, mb: 3, bgcolor: 'background.default' }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} flexWrap="wrap">
          <Chip 
            icon={<DocumentIcon />} 
            label={`${sourceFile.name} (${formatFileSize(sourceFile.size)})`}
            size="small"
            color="default"
            variant="outlined"
          />
          <Chip 
            icon={<DateIcon />} 
            label={`Converted: ${formatTimestamp(timestamp)}`}
            size="small"
            color="default"
            variant="outlined"
          />
          <Chip 
            icon={<PageIcon />} 
            label={`Pages: ${markdownResult.pageCount}`}
            size="small"
            color="default"
            variant="outlined"
          />
          <Chip 
            icon={<CodeIcon />} 
            label={`OCR Model: ${markdownResult.model}`}
            size="small"
            color="default"
            variant="outlined"
          />
        </Stack>
        
        {(imageMetrics.originalImageCount > 0 || imageMetrics.describedImageCount > 0) && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              icon={<ImageIcon />} 
              label={
                imageMetrics.hasProcessedImages
                  ? `Images: ${imageMetrics.describedImageCount}/${imageMetrics.originalImageCount} with AI descriptions`
                  : `Images: ${imageMetrics.originalImageCount} detected (no AI descriptions)`
              }
              size="small"
              color={imageMetrics.hasProcessedImages ? "info" : "default"}
              variant="outlined"
            />
          </Box>
        )}
      </Paper>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="markdown view tabs"
          indicatorColor="primary"
        >
          <Tab label="Rendered View" id="markdown-tab-0" aria-controls="markdown-tabpanel-0" />
          <Tab label="Source View" id="markdown-tab-1" aria-controls="markdown-tabpanel-1" />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Paper
          variant="outlined"
          sx={{ 
            p: 3, 
            bgcolor: 'background.default', 
            maxHeight: '72vh', /* Increased height by 20% (from 60vh to 72vh) */
            overflow: 'auto',
            borderRadius: 1
          }}
        >
          <ReactMarkdown components={components}>
            {markdown}
          </ReactMarkdown>
        </Paper>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Paper
          variant="outlined"
          sx={{ 
            p: 2, 
            bgcolor: 'rgba(0, 0, 0, 0.03)', 
            maxHeight: '72vh', /* Increased height by 20% (from 60vh to 72vh) */
            overflow: 'auto',
            borderRadius: 1,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word'
          }}
        >
          {markdown}
        </Paper>
      </TabPanel>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleSnackbarClose} 
          severity={snackbarSeverity} 
          sx={{ width: '100%' }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MarkdownPreview;
