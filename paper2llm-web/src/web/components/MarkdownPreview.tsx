// AI Summary: React component for rendering and interacting with converted Markdown.
// Features include syntax highlighting, copying, downloading, and metadata display.
// Uses Material UI for modern styling and improved user experience.

import React, { useState, useEffect } from 'react';
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
  useTheme,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Menu,
  MenuItem,
  ListItemButton,
  Tooltip
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
  AutoStories as PageIcon,
  SmartToy as AIIcon,
  Architecture as ModelIcon,
  ArrowDropDown as DropDownIcon,
  ArrowDownward as DownloadSectionIcon,
  Subject as MainContentIcon,
  BookmarkBorder as AppendixIcon,
  Info as BackmatterIcon
} from '@mui/icons-material';
import { PdfToMdResult } from '../../types/interfaces';
import { splitMarkdownContent, MarkdownSections, getMarkdownSectionsMetadata, MarkdownSectionsMetadata } from '../../core/utils/markdown-splitter';

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
  const [downloadMenuAnchorEl, setDownloadMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [markdownSections, setMarkdownSections] = useState<MarkdownSections | null>(null);
  const [sectionMetadata, setSectionMetadata] = useState<MarkdownSectionsMetadata | null>(null);
  
  // Parse the markdown into sections when the component renders or when the markdown changes
  useEffect(() => {
    if (result && result.markdown) {
      try {
        const sections = splitMarkdownContent(result.markdown);
        setMarkdownSections(sections);
        
        const metadata = getMarkdownSectionsMetadata(result.markdown);
        setSectionMetadata(metadata);
      } catch (error) {
        console.error('Error splitting markdown:', error);
      }
    }
  }, [result]);
  
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
  
  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadMenuAnchorEl(event.currentTarget);
  };
  
  const handleDownloadMenuClose = () => {
    setDownloadMenuAnchorEl(null);
  };
  
  const handleDownload = (section: 'full' | 'main' | 'appendix' | 'backmatter' = 'full') => {
    let contentToDownload = markdown;
    let sectionName = '';
    let sectionDisplayName = 'Full document';
    
    if (section !== 'full' && markdownSections) {
      switch (section) {
        case 'main':
          contentToDownload = markdownSections.mainContent;
          sectionName = '-main';
          sectionDisplayName = 'Main content';
          break;
        case 'appendix':
          if (!markdownSections.appendix) {
            setSnackbarMessage('This document does not contain an appendix section');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            handleDownloadMenuClose();
            return;
          }
          contentToDownload = markdownSections.appendix;
          sectionName = '-appendix';
          sectionDisplayName = 'Appendix';
          break;
        case 'backmatter':
          if (!markdownSections.backmatter) {
            setSnackbarMessage('This document does not contain a backmatter section');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
            handleDownloadMenuClose();
            return;
          }
          contentToDownload = markdownSections.backmatter;
          sectionName = '-backmatter';
          sectionDisplayName = 'Backmatter';
          break;
      }
    }
    
    const blob = new Blob([contentToDownload], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create a filename based on the source file and section
    const baseFileName = sourceFile.name.replace(/\.[^/.]+$/, ''); // Remove extension
    link.download = `${baseFileName}${sectionName}.md`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Show success message
    setSnackbarMessage(`${sectionDisplayName} downloaded successfully`);
    setSnackbarSeverity('success');
    setSnackbarOpen(true);
    
    handleDownloadMenuClose();
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
          <Box sx={{ position: 'relative' }}>
            <Button
              variant="outlined"
              color="secondary"
              startIcon={<DownloadIcon />}
              endIcon={<DropDownIcon />}
              onClick={handleDownloadMenuOpen}
              size="small"
              aria-controls="download-menu"
              aria-haspopup="true"
            >
              Download
            </Button>
            <Menu
              id="download-menu"
              anchorEl={downloadMenuAnchorEl}
              open={Boolean(downloadMenuAnchorEl)}
              onClose={handleDownloadMenuClose}
              anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
              }}
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
            >
              <MenuItem onClick={() => handleDownload('full')}>
                <ListItemIcon>
                  <DownloadIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Full Document" />
              </MenuItem>
              <MenuItem onClick={() => handleDownload('main')}>
                <ListItemIcon>
                  <MainContentIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText 
                  primary="Main Content Only" 
                  secondary={sectionMetadata?.wordCount.mainContent 
                    ? `${sectionMetadata.wordCount.mainContent} words` 
                    : undefined}
                />
              </MenuItem>
              <Tooltip title={!sectionMetadata?.hasAppendix 
                ? "This document doesn't contain an appendix" 
                : "Download only the appendix section"}>
                <Box>
                  <MenuItem 
                    onClick={() => handleDownload('appendix')}
                    disabled={!sectionMetadata?.hasAppendix}
                  >
                    <ListItemIcon>
                      <AppendixIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Appendix Only" 
                      secondary={sectionMetadata?.wordCount.appendix 
                        ? `${sectionMetadata.wordCount.appendix} words` 
                        : undefined}
                    />
                  </MenuItem>
                </Box>
              </Tooltip>
              <Tooltip title={!sectionMetadata?.hasBackmatter 
                ? "This document doesn't contain backmatter" 
                : "Download only the backmatter section (acknowledgments, author contributions, etc.)"}>
                <Box>
                  <MenuItem 
                    onClick={() => handleDownload('backmatter')}
                    disabled={!sectionMetadata?.hasBackmatter}
                  >
                    <ListItemIcon>
                      <BackmatterIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText 
                      primary="Backmatter Only" 
                      secondary={sectionMetadata?.wordCount.backmatter 
                        ? `${sectionMetadata.wordCount.backmatter} words` 
                        : undefined}
                    />
                  </MenuItem>
                </Box>
              </Tooltip>
            </Menu>
          </Box>
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
        {/* Add a new row to display section information */}
        {sectionMetadata && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
              Document Sections
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
              <Chip 
                icon={<MainContentIcon />} 
                label={`Main Content (${sectionMetadata.wordCount.mainContent} words)`}
                color="primary"
                variant="outlined"
                size="small"
              />
              {sectionMetadata.hasAppendix && (
                <Chip 
                  icon={<AppendixIcon />} 
                  label={`Appendix (${sectionMetadata.wordCount.appendix} words)`}
                  color="secondary"
                  variant="outlined"
                  size="small"
                />
              )}
              {sectionMetadata.hasBackmatter && (
                <Chip 
                  icon={<BackmatterIcon />} 
                  label={`Backmatter (${sectionMetadata.wordCount.backmatter} words)`}
                  color="info"
                  variant="outlined"
                  size="small"
                />
              )}
              <Chip 
                label={`Total: ${sectionMetadata.wordCount.total} words`}
                variant="outlined"
                size="small"
              />
            </Stack>
          </Box>
        )}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
              Document Information
            </Typography>
            <List dense disablePadding>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DocumentIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={sourceFile.name} 
                  secondary={`Size: ${formatFileSize(sourceFile.size)}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={`${markdownResult.pageCount} pages`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DateIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Converted: ${formatTimestamp(timestamp)}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
            </List>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'medium', color: 'text.secondary' }}>
              Processing Information
            </Typography>
            <List dense disablePadding>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CodeIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={`OCR Model: ${markdownResult.model}`}
                  primaryTypographyProps={{ variant: 'body2' }}
                />
              </ListItem>
              
              {/* Image count - use the actual count from OCR result */}
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ImageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText 
                  primary={`Images: ${result.ocrResult.pages.reduce((total, page) => total + page.images.length, 0)} detected`}
                  secondary={
                    imageMetrics.describedImageCount > 0
                      ? `${imageMetrics.describedImageCount} images with AI descriptions`
                      : null
                  }
                  primaryTypographyProps={{ variant: 'body2' }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItem>
              
              {/* Vision model info - display if available in the result */}
              {result.visionModel && (
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <ModelIcon fontSize="small" color="info" />
                  </ListItemIcon>
                  <ListItemText 
                    primary={`Vision Model: ${result.visionModel}`}
                    secondary={result.visionModelProvider ? `Provider: ${result.visionModelProvider}` : null}
                    primaryTypographyProps={{ variant: 'body2' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>
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
