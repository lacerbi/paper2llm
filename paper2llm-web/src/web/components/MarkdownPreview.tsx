// AI Summary: React component for rendering and interacting with converted Markdown.
// Features include syntax highlighting, copying, downloading, and metadata display.
// Uses Material UI for modern styling and improved user experience.

import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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
  Tooltip,
} from "@mui/material";
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
  Info as BackmatterIcon,
  MoreVert as MoreIcon,
  ViewModule as AllPartsIcon,
} from "@mui/icons-material";
import { PdfToMdResult } from "../../types/interfaces";
import {
  splitMarkdownContent,
  MarkdownSections,
  getMarkdownSectionsMetadata,
  MarkdownSectionsMetadata,
} from "../../core/utils/markdown-splitter";

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
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  result,
  onNewConversion,
}) => {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<"success" | "error">(
    "success"
  );
  const [copyAnchorEl, setCopyAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  const [markdownSections, setMarkdownSections] =
    useState<MarkdownSections | null>(null);
  const [sectionMetadata, setSectionMetadata] =
    useState<MarkdownSectionsMetadata | null>(null);

  // Parse the markdown into sections when the component renders or when the markdown changes
  useEffect(() => {
    if (result && result.markdown) {
      try {
        const sections = splitMarkdownContent(result.markdown);
        setMarkdownSections(sections);

        const metadata = getMarkdownSectionsMetadata(result.markdown);
        setSectionMetadata(metadata);
      } catch (error) {
        console.error("Error splitting markdown:", error);
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
    navigator.clipboard
      .writeText(markdown)
      .then(() => {
        setSnackbarMessage("Copied to clipboard!");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch(() => {
        setSnackbarMessage("Failed to copy");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
  };

  const handleSnackbarClose = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleCopyMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setCopyAnchorEl(event.currentTarget);
  };

  const handleCopyMenuClose = () => {
    setCopyAnchorEl(null);
  };

  const handleDownloadMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadAnchorEl(event.currentTarget);
  };

  const handleDownloadMenuClose = () => {
    setDownloadAnchorEl(null);
  };

  const getSectionContent = (
    section: "full" | "main" | "appendix" | "backmatter" | "allparts",
    addTitle: boolean = false
  ): string | null => {
    if (!markdownSections) return null;

    let content: string | null;
    switch (section) {
      case "full":
        content = markdown;
        break;
      case "main":
        content = markdownSections.mainContent;
        break;
      case "appendix":
        content = markdownSections.appendix;
        break;
      case "backmatter":
        content = markdownSections.backmatter;
        break;
      case "allparts":
        // Get all parts with titles and concatenate them
        const parts: string[] = [];
        
        // Add main content first (always present)
        if (markdownSections.mainContent) {
          parts.push(markdownSections.mainContent);
        }
        
        // Add appendix if present
        if (markdownSections.appendix) {
          const title = markdownSections.title;
          const appendixContent = addTitle 
            ? `# ${title} - Appendix\n\n---\n\n${markdownSections.appendix}`
            : markdownSections.appendix;
          parts.push(appendixContent);
        }
        
        // Add backmatter if present
        if (markdownSections.backmatter) {
          const title = markdownSections.title;
          const backmatterContent = addTitle 
            ? `# ${title} - Backmatter\n\n---\n\n${markdownSections.backmatter}`
            : markdownSections.backmatter;
          parts.push(backmatterContent);
        }
        
        content = parts.join("\n\n");
        break;
      default:
        return null;
    }

    if (!content) return null;

    // Add title header for appendix and backmatter if requested
    if (addTitle && (section === "appendix" || section === "backmatter") && markdownSections) {
      const title = markdownSections.title;
      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
      const headerContent = `# ${title} - ${sectionTitle}\n\n---\n\n`;
      content = headerContent + content;
    }

    return content;
  };

  const getSectionDisplayName = (
    section: "full" | "main" | "appendix" | "backmatter" | "allparts"
  ): string => {
    switch (section) {
      case "full":
        return "Full document";
      case "main":
        return "Main content";
      case "appendix":
        return "Appendix";
      case "backmatter":
        return "Backmatter";
      case "allparts":
        return "All Parts";
      default:
        return "Document";
    }
  };

  const handleCopySection = (section: "main" | "appendix" | "backmatter" | "allparts") => {
    const content = getSectionContent(section, true);

    if (!content) {
      setSnackbarMessage(
        `This document does not contain a ${getSectionDisplayName(
          section
        ).toLowerCase()} section`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    navigator.clipboard
      .writeText(content)
      .then(() => {
        setSnackbarMessage(
          `${getSectionDisplayName(section)} copied to clipboard!`
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      })
      .catch(() => {
        setSnackbarMessage("Failed to copy");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      });
  };

  const handleDownload = (
    section: "full" | "main" | "appendix" | "backmatter" | "allparts" = "full"
  ) => {
    // Special handling for "allparts" to download all three separate files
    if (section === "allparts") {
      const mainContent = getSectionContent("main", true);
      const appendixContent = getSectionContent("appendix", true);
      const backmatterContent = getSectionContent("backmatter", true);
      const baseFileName = sourceFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
      let downloadCount = 0;
      let successCount = 0;
      
      // Download main content (should always exist)
      if (mainContent) {
        downloadCount++;
        const blob = new Blob([mainContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}-main.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      }
      
      // Download appendix if it exists
      if (appendixContent) {
        downloadCount++;
        const blob = new Blob([appendixContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}-appendix.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      }
      
      // Download backmatter if it exists
      if (backmatterContent) {
        downloadCount++;
        const blob = new Blob([backmatterContent], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${baseFileName}-backmatter.md`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        successCount++;
      }
      
      // Show success message
      setSnackbarMessage(`${successCount} of ${downloadCount} parts downloaded successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
      return;
    }
    
    // Regular download handling for other section types
    const contentToDownload = getSectionContent(section, true);
    let sectionName = "";
    const sectionDisplayName = getSectionDisplayName(section);

    if (!contentToDownload) {
      setSnackbarMessage(
        `This document does not contain a ${sectionDisplayName.toLowerCase()} section`
      );
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    // Add section suffix to filename
    if (section !== "full") {
      sectionName = `-${section}`;
    }

    const blob = new Blob([contentToDownload], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;

    // Create a filename based on the source file and section
    const baseFileName = sourceFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
    link.download = `${baseFileName}${sectionName}.md`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Show success message
    setSnackbarMessage(`${sectionDisplayName} downloaded successfully`);
    setSnackbarSeverity("success");
    setSnackbarOpen(true);
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
    const markdownImageCount = (markdown.match(/!\[.*?\]\(.*?\)/g) || [])
      .length;

    // Count all images with descriptions
    const describedImageCount = (
      markdown.match(/> \*\*Image Description:\*\*/g) || []
    ).length;

    // Use the larger of the two counts for total images, ensuring describedImageCount is never > originalImageCount
    // This handles cases where images were processed but aren't in markdown syntax
    const originalImageCount = Math.max(
      markdownImageCount,
      describedImageCount
    );

    return {
      originalImageCount,
      describedImageCount,
      hasProcessedImages: describedImageCount > 0,
    };
  };

  const imageMetrics = calculateImageMetrics();

  // Custom components for ReactMarkdown
  const components = {
    blockquote: ({ node, ...props }: any) => {
      // Check if this is an image description blockquote
      const isImageDescription =
        props.children &&
        props.children.toString().includes("Image Description");

      return (
        <Box
          component="blockquote"
          sx={{
            pl: 2,
            borderLeft: isImageDescription
              ? `4px solid ${theme.palette.info.main}`
              : `4px solid ${theme.palette.primary.main}`,
            bgcolor: isImageDescription
              ? "rgba(41, 182, 246, 0.1)"
              : "rgba(0, 0, 0, 0.03)",
            borderRadius: "0 4px 4px 0",
            py: 1,
            px: 2,
            my: 2,
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
            bgcolor: "rgba(0, 0, 0, 0.05)",
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: "monospace",
          }}
          {...props}
        >
          {children}
        </Box>
      ) : (
        <Box
          component="pre"
          sx={{
            bgcolor: "rgba(0, 0, 0, 0.05)",
            p: 2,
            borderRadius: 1,
            overflowX: "auto",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            my: 2,
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
          overflowX: "auto",
          my: 2,
        }}
      >
        <Box
          component="table"
          sx={{
            borderCollapse: "collapse",
            width: "100%",
            "& th, & td": {
              border: `1px solid ${theme.palette.divider}`,
              p: 1,
              textAlign: "left",
            },
            "& th": {
              bgcolor: "rgba(0, 0, 0, 0.04)",
              fontWeight: "bold",
            },
          }}
          {...props}
        />
      </Box>
    ),
  };

  return (
    <Paper
      elevation={2}
      sx={{
        p: 3,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Typography
          variant="h5"
          component="h2"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <MarkdownIcon sx={{ mr: 1 }} />
          Converted Markdown
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Full Document Actions */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
            >
              Full Document
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                startIcon={<CopyIcon />}
                onClick={handleCopyToClipboard}
                size="small"
              >
                Copy All
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload("full")}
                size="small"
              >
                Download All
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

          {/* Document Parts Dropdown Buttons */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
            >
              Document Parts
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                endIcon={<DropDownIcon />}
                onClick={handleCopyMenuOpen}
                size="small"
                startIcon={<CopyIcon />}
              >
                Copy
              </Button>
              <Menu
                anchorEl={copyAnchorEl}
                open={Boolean(copyAnchorEl)}
                onClose={handleCopyMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    handleCopySection("allparts");
                    handleCopyMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <AllPartsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="All Parts"
                    secondary={
                      sectionMetadata?.wordCount.total
                        ? `${sectionMetadata.wordCount.total} words total`
                        : undefined
                    }
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleCopySection("main");
                    handleCopyMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <MainContentIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Main Content"
                    secondary={
                      sectionMetadata?.wordCount.mainContent
                        ? `${sectionMetadata.wordCount.mainContent} words`
                        : undefined
                    }
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleCopySection("appendix");
                    handleCopyMenuClose();
                  }}
                  disabled={!sectionMetadata?.hasAppendix}
                >
                  <ListItemIcon>
                    <AppendixIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Appendix"
                    secondary={
                      sectionMetadata?.hasAppendix &&
                      sectionMetadata?.wordCount.appendix
                        ? `${sectionMetadata.wordCount.appendix} words`
                        : "Not available"
                    }
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleCopySection("backmatter");
                    handleCopyMenuClose();
                  }}
                  disabled={!sectionMetadata?.hasBackmatter}
                >
                  <ListItemIcon>
                    <BackmatterIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backmatter"
                    secondary={
                      sectionMetadata?.hasBackmatter &&
                      sectionMetadata?.wordCount.backmatter
                        ? `${sectionMetadata.wordCount.backmatter} words`
                        : "Not available"
                    }
                  />
                </MenuItem>
              </Menu>

              <Button
                variant="outlined"
                color="secondary"
                endIcon={<DropDownIcon />}
                onClick={handleDownloadMenuOpen}
                size="small"
                startIcon={<DownloadIcon />}
              >
                Download
              </Button>
              <Menu
                anchorEl={downloadAnchorEl}
                open={Boolean(downloadAnchorEl)}
                onClose={handleDownloadMenuClose}
              >
                <MenuItem
                  onClick={() => {
                    handleDownload("allparts");
                    handleDownloadMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <AllPartsIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="All Parts"
                    secondary="Download all sections as separate files"
                  />
                </MenuItem>
                <Divider />
                <MenuItem
                  onClick={() => {
                    handleDownload("main");
                    handleDownloadMenuClose();
                  }}
                >
                  <ListItemIcon>
                    <MainContentIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Main Content"
                    secondary={
                      sectionMetadata?.wordCount.mainContent
                        ? `${sectionMetadata.wordCount.mainContent} words`
                        : undefined
                    }
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleDownload("appendix");
                    handleDownloadMenuClose();
                  }}
                  disabled={!sectionMetadata?.hasAppendix}
                >
                  <ListItemIcon>
                    <AppendixIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Appendix"
                    secondary={
                      sectionMetadata?.hasAppendix &&
                      sectionMetadata?.wordCount.appendix
                        ? `${sectionMetadata.wordCount.appendix} words`
                        : "Not available"
                    }
                  />
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleDownload("backmatter");
                    handleDownloadMenuClose();
                  }}
                  disabled={!sectionMetadata?.hasBackmatter}
                >
                  <ListItemIcon>
                    <BackmatterIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary="Backmatter"
                    secondary={
                      sectionMetadata?.hasBackmatter &&
                      sectionMetadata?.wordCount.backmatter
                        ? `${sectionMetadata.wordCount.backmatter} words`
                        : "Not available"
                    }
                  />
                </MenuItem>
              </Menu>
            </Stack>
          </Box>
        </Box>
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "background.default" }}
      >
        {/* Add a new row to display section information */}
        {sectionMetadata && (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
            >
              Document Sections
            </Typography>
            <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap" }}>
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
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
            >
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
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <PageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`${markdownResult.pageCount} pages`}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItem>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <DateIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`Converted: ${formatTimestamp(timestamp)}`}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItem>
            </List>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography
              variant="subtitle2"
              sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
            >
              Processing Information
            </Typography>
            <List dense disablePadding>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <CodeIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`OCR Model: ${markdownResult.model}`}
                  primaryTypographyProps={{ variant: "body2" }}
                />
              </ListItem>

              {/* Image count - use the actual count from OCR result */}
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ImageIcon fontSize="small" color="primary" />
                </ListItemIcon>
                <ListItemText
                  primary={`Images: ${result.ocrResult.pages.reduce(
                    (total, page) => total + page.images.length,
                    0
                  )} detected`}
                  secondary={
                    imageMetrics.describedImageCount > 0
                      ? `${imageMetrics.describedImageCount} images with AI descriptions`
                      : null
                  }
                  primaryTypographyProps={{ variant: "body2" }}
                  secondaryTypographyProps={{ variant: "caption" }}
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
                    secondary={
                      result.visionModelProvider
                        ? `Provider: ${result.visionModelProvider}`
                        : null
                    }
                    primaryTypographyProps={{ variant: "body2" }}
                    secondaryTypographyProps={{ variant: "caption" }}
                  />
                </ListItem>
              )}
            </List>
          </Grid>
        </Grid>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
aria-label="markdown view tabs"
          indicatorColor="primary"
        >
          <Tab
            label="Rendered View"
            id="markdown-tab-0"
            aria-controls="markdown-tabpanel-0"
          />
          <Tab
            label="Source View"
            id="markdown-tab-1"
            aria-controls="markdown-tabpanel-1"
          />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Paper
          variant="outlined"
          sx={{
            p: 3,
            bgcolor: "background.default",
            maxHeight: "72vh" /* Increased height by 20% (from 60vh to 72vh) */,
            overflow: "auto",
            borderRadius: 1,
          }}
        >
          <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            bgcolor: "rgba(0, 0, 0, 0.03)",
            maxHeight: "72vh" /* Increased height by 20% (from 60vh to 72vh) */,
            overflow: "auto",
            borderRadius: 1,
            fontFamily: "monospace",
            fontSize: "0.875rem",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {markdown}
        </Paper>
      </TabPanel>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbarSeverity}
          sx={{ width: "100%" }}
          variant="filled"
        >
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default MarkdownPreview;
