// AI Summary: React component for rendering and interacting with converted Markdown.
// Features include syntax highlighting, copying, downloading, metadata display, and BibTeX citation generation.
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
  Checkbox,
  FormControlLabel,
  CircularProgress,
  TextField,
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
  InfoOutlined as InfoIcon,
  MoreVert as MoreIcon,
  ViewModule as AllPartsIcon,
  MenuBook as CitationIcon,
} from "@mui/icons-material";
import { PdfToMdResult } from "../../types/interfaces";
import {
  splitMarkdownContent,
  MarkdownSections,
  getMarkdownSectionsMetadata,
  MarkdownSectionsMetadata,
} from "../../core/utils/markdown-splitter";
import { generateBibTeXFromMarkdown } from "../../core/utils/bibtex-generator";

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
  const [snackbarSeverity, setSnackbarSeverity] = useState<
    "success" | "error" | "info"
  >("success");
  const [copyAnchorEl, setCopyAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(
    null
  );
  const [markdownSections, setMarkdownSections] =
    useState<MarkdownSections | null>(null);
  const [sectionMetadata, setSectionMetadata] =
    useState<MarkdownSectionsMetadata | null>(null);
  const [includeBibtex, setIncludeBibtex] = useState(false);
  const [isBibtexLoading, setIsBibtexLoading] = useState(false);
  // Default base filename from source PDF (without extension)
  const [baseFilename, setBaseFilename] = useState<string>("");
  // Keep track of original filename to restore if user sets empty
  const [originalFilename, setOriginalFilename] = useState<string>("");

  // Parse the markdown into sections when the component renders or when the markdown changes
  useEffect(() => {
    if (result && result.markdown) {
      try {
        const sections = splitMarkdownContent(result.markdown);
        setMarkdownSections(sections);

        const metadata = getMarkdownSectionsMetadata(result.markdown);
        setSectionMetadata(metadata);

        // Set default filename from source file (without extension)
        if (result.sourceFile && result.sourceFile.name) {
          const defaultName = result.sourceFile.name.replace(/\.[^/.]+$/, "");
          setBaseFilename(defaultName);
          setOriginalFilename(defaultName);
        }
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

  const handleCopyToClipboard = async () => {
    try {
      const contentToCopy = await getContentWithOptionalBibtex("full");

      if (!contentToCopy) {
        setSnackbarMessage("No content to copy");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
        return;
      }

      await navigator.clipboard.writeText(contentToCopy);
      setSnackbarMessage("Copied to clipboard!");
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      setSnackbarMessage("Failed to copy");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
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

  const handleBibtexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setIncludeBibtex(event.target.checked);

    if (event.target.checked) {
      setSnackbarMessage(
        "BibTeX citation will be included in copies and downloads"
      );
      setSnackbarSeverity("info");
      setSnackbarOpen(true);
    }
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
    if (
      addTitle &&
      (section === "appendix" || section === "backmatter") &&
      markdownSections
    ) {
      const title = markdownSections.title;
      const sectionTitle = section.charAt(0).toUpperCase() + section.slice(1);
      const headerContent = `# ${title} - ${sectionTitle}\n\n---\n\n`;
      content = headerContent + content;
    }

    return content;
  };

  // New function to get content with optional BibTeX
  const getContentWithOptionalBibtex = async (
    section: "full" | "main" | "appendix" | "backmatter" | "allparts",
    addTitle: boolean = false
  ): Promise<string | null> => {
    const content = getSectionContent(section, addTitle);

    if (!content) return null;

    // If BibTeX is not requested, return the content as is
    if (!includeBibtex) return content;

    try {
      setIsBibtexLoading(true);

      // Only add BibTeX to the full document or main content
      if (section === "full" || section === "main" || section === "allparts") {
        const bibtex = await generateBibTeXFromMarkdown(content);
        return `\`\`\`\n${bibtex}\n\`\`\`\n\n---\n\n${content}`;
      }

      return content;
    } catch (error) {
      console.error("Error generating BibTeX:", error);
      setSnackbarMessage("Failed to generate BibTeX citation");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return content;
    } finally {
      setIsBibtexLoading(false);
    }
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

  const handleCopySection = async (
    section: "main" | "appendix" | "backmatter" | "allparts"
  ) => {
    try {
      const content = await getContentWithOptionalBibtex(section, true);

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

      await navigator.clipboard.writeText(content);
      setSnackbarMessage(
        `${getSectionDisplayName(section)} copied to clipboard!`
      );
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error copying section:", error);
      setSnackbarMessage("Failed to copy");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
  };

  const handleDownload = async (
    section: "full" | "main" | "appendix" | "backmatter" | "allparts" = "full"
  ) => {
    // Special handling for "allparts" to download all three separate files
    if (section === "allparts") {
      try {
        // For allparts, we handle each section individually to prevent duplicate BibTeX
        const mainContent = await getContentWithOptionalBibtex("main", true);
        // For appendix and backmatter, we don't add BibTeX even if checkbox is checked
        const appendixContent = getSectionContent("appendix", true);
        const backmatterContent = getSectionContent("backmatter", true);

        let downloadCount = 0;
        let successCount = 0;

        // Download main content (should always exist)
        if (mainContent) {
          downloadCount++;
          const blob = new Blob([mainContent], { type: "text/markdown" });
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = `${baseFilename}_main.md`;
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
          link.download = `${baseFilename}_appendix.md`;
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
          link.download = `${baseFilename}_backmatter.md`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
          successCount++;
        }

        // Show success message
        setSnackbarMessage(
          `${successCount} of ${downloadCount} parts downloaded successfully`
        );
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
      } catch (error) {
        console.error("Error downloading parts:", error);
        setSnackbarMessage("Error downloading document parts");
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
      return;
    }

    // Regular download handling for other section types
    try {
      const contentToDownload = await getContentWithOptionalBibtex(
        section,
        true
      );
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
        sectionName = `_${section}`;
      }

      const blob = new Blob([contentToDownload], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Use the user-defined baseFilename instead of sourceFile.name
      link.download = `${baseFilename}${sectionName}.md`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      // Show success message
      setSnackbarMessage(`${sectionDisplayName} downloaded successfully`);
      setSnackbarSeverity("success");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error downloading content:", error);
      setSnackbarMessage("Error downloading content");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    }
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
        pt: 1,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 1,
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column" }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <MarkdownIcon sx={{ mr: 1 }} />
            Converted Markdown
          </Typography>

          {/* Add Filename Field */}
          <TextField
            label="Filename"
            variant="outlined"
            size="small"
            value={baseFilename}
            onChange={(e) => setBaseFilename(e.target.value)}
            onBlur={() => {
              // If user leaves the field empty, restore the original filename
              if (!baseFilename.trim()) {
                setBaseFilename(originalFilename);
              }
            }}
            sx={{ mt: 1, mb: 1, width: "250px" }}
            InputProps={{
              endAdornment: <Typography variant="caption">.md</Typography>,
            }}
          />

          {/* Add BibTeX Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={includeBibtex}
                onChange={handleBibtexChange}
                disabled={isBibtexLoading}
              />
            }
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <CitationIcon fontSize="small" sx={{ mr: 0.5 }} />
                <Typography variant="body2">Add BibTeX citation</Typography>
                {isBibtexLoading && (
                  <CircularProgress size={16} sx={{ ml: 1 }} />
                )}
              </Box>
            }
            sx={{ mt: 0.5 }}
          />
        </Box>

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
                disabled={isBibtexLoading}
              >
                Copy All
              </Button>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload("full")}
                size="small"
                disabled={isBibtexLoading}
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
              sx={{
                mb: 1,
                fontWeight: "medium",
                color: "text.secondary",
                display: "flex",
                alignItems: "center",
              }}
            >
              Document Parts
              <Tooltip
                title={
                  <React.Fragment>
                    <Typography variant="body2" component="p" sx={{ mt: 1 }}>
                      <b>Main Content:</b> The main text.
                    </Typography>
                    <Typography variant="body2" component="p">
                      <b>Appendix:</b> Supplementary material.
                    </Typography>
                    <Typography variant="body2" component="p">
                      <b>Backmatter:</b> Acknowledgments, references, and other
                      peripheral information.
                    </Typography>
                    <Typography variant="body2" component="p">
                      <b>All Parts:</b> The complete document with all sections
                      combined.
                    </Typography>
                    <Typography
                      variant="body2"
                      component="p"
                      sx={{ fontStyle: "italic", mb: 1 }}
                    >
                      Note: Sections are extracted automatically and the splits
                      may be inaccurate.
                    </Typography>
                  </React.Fragment>
                }
                arrow
                placement="top"
              >
                <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                  <InfoIcon fontSize="small" color="action" />
                </IconButton>
              </Tooltip>
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                endIcon={<DropDownIcon />}
                onClick={handleCopyMenuOpen}
                size="small"
                startIcon={<CopyIcon />}
                disabled={isBibtexLoading}
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
                <Divider />
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
              </Menu>

              <Button
                variant="outlined"
                color="secondary"
                endIcon={<DropDownIcon />}
                onClick={handleDownloadMenuOpen}
                size="small"
                startIcon={<DownloadIcon />}
                disabled={isBibtexLoading}
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
                <Divider />
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
