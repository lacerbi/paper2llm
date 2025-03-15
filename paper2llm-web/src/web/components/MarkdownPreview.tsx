// AI Summary: Main component that displays converted markdown with actions for copying, downloading, and viewing.
// Integrates multiple subcomponents for document sections, actions, and content rendering.

import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Divider,
  Snackbar,
  Alert,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Grid,
  Tooltip,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  TextField,
} from "@mui/material";
import {
  DescriptionOutlined as MarkdownIcon,
  InfoOutlined as InfoIcon,
  Subject as MainContentIcon,
  BookmarkBorder as AppendixIcon,
  Info as BackmatterIcon,
  ViewModule as AllPartsIcon,
  MenuBook as CitationIcon,
} from "@mui/icons-material";
import { PdfToMdResult } from "../../types/interfaces";
import {
  splitMarkdownContent,
  getMarkdownSectionsMetadata,
  MarkdownSections,
  MarkdownSectionsMetadata
} from "../../core/utils/markdown-splitter";
import { 
  MarkdownPreviewProps, 
  SectionType,
  SnackbarSeverity
} from "./markdown-preview/types";
import {
  getSectionContent, 
  getContentWithOptionalBibtex, 
  getSectionDisplayName,
  calculateImageMetrics
} from "./markdown-preview/utils/content-utils";

// Import extracted components
import TabPanel from "./markdown-preview/components/TabPanel";
import DocumentInfo from "./markdown-preview/components/DocumentInfo";
import ProcessingInfo from "./markdown-preview/components/ProcessingInfo";
import DocumentSections from "./markdown-preview/components/DocumentSections";
import ActionButtons from "./markdown-preview/components/ActionButtons";
import MarkdownRenderer from "./markdown-preview/components/MarkdownRenderer";

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  result,
  onNewConversion,
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>("success");
  const [copyAnchorEl, setCopyAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(
    null
  );
  // Fix the type definitions for these state variables
  const [markdownSections, setMarkdownSections] = useState<MarkdownSections | null>(null);
  const [sectionMetadata, setSectionMetadata] = useState<MarkdownSectionsMetadata | null>(null);
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

  const { markdown, sourceFile, timestamp, markdownResult, ocrResult } = result;
  
  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
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

  // Copy/Download handlers
  const handleCopyToClipboard = async () => {
    try {
      const contentToCopy = await getContentWithOptionalBibtex(markdownSections, markdown, "full", includeBibtex);

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

  const handleCopySection = async (
    section: "main" | "appendix" | "backmatter" | "allparts"
  ) => {
    try {
      setIsBibtexLoading(true);
      const content = await getContentWithOptionalBibtex(markdownSections, markdown, section, includeBibtex, true);

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
    } finally {
      setIsBibtexLoading(false);
    }
  };

  const handleDownload = async (
    section: SectionType = "full"
  ) => {
    // Special handling for "allparts" to download all three separate files
    if (section === "allparts") {
      try {
        setIsBibtexLoading(true);
        // For allparts, we handle each section individually to prevent duplicate BibTeX
        const mainContent = await getContentWithOptionalBibtex(markdownSections, markdown, "main", includeBibtex, true);
        // For appendix and backmatter, we don't add BibTeX even if checkbox is checked
        const appendixContent = getSectionContent(markdownSections, markdown, "appendix", true);
        const backmatterContent = getSectionContent(markdownSections, markdown, "backmatter", true);

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
      } finally {
        setIsBibtexLoading(false);
      }
      return;
    }

    // Regular download handling for other section types
    try {
      setIsBibtexLoading(true);
      const contentToDownload = await getContentWithOptionalBibtex(
        markdownSections,
        markdown,
        section,
        includeBibtex,
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
    } finally {
      setIsBibtexLoading(false);
    }
  };

  const imageMetrics = calculateImageMetrics(markdown);
  const imagesCount = ocrResult.pages.reduce((total, page) => total + page.images.length, 0);

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

        {/* Action Buttons Component */}
        <ActionButtons
          onCopyFull={handleCopyToClipboard}
          onDownloadFull={() => handleDownload("full")}
          onNewConversion={onNewConversion}
          onCopyMenuOpen={handleCopyMenuOpen}
          onDownloadMenuOpen={handleDownloadMenuOpen}
          isBibtexLoading={isBibtexLoading}
        />
      </Box>

      <Paper
        variant="outlined"
        sx={{ p: 2, mb: 3, bgcolor: "background.default" }}
      >
        {/* Document Sections Component */}
        <DocumentSections sectionMetadata={sectionMetadata} />

        <Grid container spacing={2}>
          {/* Document Info Component */}
          <DocumentInfo
            filename={sourceFile.name}
            fileSize={sourceFile.size}
            pageCount={markdownResult.pageCount}
            timestamp={timestamp}
          />

          {/* Processing Info Component */}
          <ProcessingInfo
            ocrModel={markdownResult.model}
            imagesCount={imagesCount}
            imageMetrics={imageMetrics}
            visionModel={result.visionModel}
            visionModelProvider={result.visionModelProvider}
          />
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
        <Paper variant="outlined">
          <MarkdownRenderer markdown={markdown} />
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Paper variant="outlined">
          <MarkdownRenderer markdown={markdown} isSourceView={true} />
        </Paper>
      </TabPanel>

      {/* Copy Section Menu */}
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
              sectionMetadata?.wordCount?.mainContent
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
              sectionMetadata?.wordCount?.appendix
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
              sectionMetadata?.wordCount?.backmatter
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
              sectionMetadata?.wordCount?.total
                ? `${sectionMetadata.wordCount.total} words total`
                : undefined
            }
          />
        </MenuItem>
      </Menu>

      {/* Download Section Menu */}
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
              sectionMetadata?.wordCount?.mainContent
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
              sectionMetadata?.wordCount?.appendix
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
              sectionMetadata?.wordCount?.backmatter
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
            secondary="Download all parts as separate files"
          />
        </MenuItem>
      </Menu>

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
