// AI Summary: Main component that displays converted markdown with actions for copying, downloading, and viewing.
// Uses extracted components and custom hooks to organize functionality into smaller, focused units.

import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  Snackbar,
  Alert,
  Grid,
} from "@mui/material";
import { DescriptionOutlined as MarkdownIcon } from "@mui/icons-material";
import { PdfToMdResult } from "../../types/interfaces";
import { MarkdownPreviewProps } from "./markdown-preview/types";
import { calculateImageMetrics } from "./markdown-preview/utils/content-utils";
import { useMarkdownSections } from "./markdown-preview/hooks/useMarkdownSections";
import { useCopyDownload } from "./markdown-preview/hooks/useCopyDownload";

// Import components
import TabPanel from "./markdown-preview/components/TabPanel";
import DocumentInfo from "./markdown-preview/components/DocumentInfo";
import ProcessingInfo from "./markdown-preview/components/ProcessingInfo";
import DocumentSections from "./markdown-preview/components/DocumentSections";
import ActionButtons from "./markdown-preview/components/ActionButtons";
import MarkdownRenderer from "./markdown-preview/components/MarkdownRenderer";
import CopyMenu from "./markdown-preview/components/CopyMenu";
import DownloadMenu from "./markdown-preview/components/DownloadMenu";
import FilenameField from "./markdown-preview/components/FilenameField";
import BibtexOption from "./markdown-preview/components/BibtexOption";

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({
  result,
  onNewConversion,
}) => {
  const [tabValue, setTabValue] = useState(0);

  // Use custom hooks for state management
  // Create default empty values for when result is null
  const { markdownSections, sectionMetadata } = useMarkdownSections(result);

  // Initialize with default empty values that will be used when result is null
  const {
    snackbarOpen,
    snackbarMessage,
    snackbarSeverity,
    copyAnchorEl,
    downloadAnchorEl,
    isBibtexLoading,
    includeBibtex,
    baseFilename,
    originalFilename,
    closeSnackbar,
    openCopyMenu,
    closeCopyMenu,
    openDownloadMenu,
    closeDownloadMenu,
    copyToClipboard,
    copySection,
    download,
    handleBibtexChange,
    setBaseFilename,
  } = useCopyDownload({
    markdown: result?.markdown || "",
    markdownSections,
    sourceFilename: result?.sourceFile?.name || "document",
  });

  if (!result) {
    return null;
  }

  const { markdown, sourceFile, timestamp, markdownResult, ocrResult } = result;

  // Event handlers
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Calculate image metrics
  const imageMetrics = calculateImageMetrics(markdown);
  const imagesCount = ocrResult.pages.reduce(
    (total, page) => total + page.images.length,
    0
  );

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

          {/* Filename Field Component */}
          <FilenameField
            baseFilename={baseFilename}
            originalFilename={originalFilename}
            onFilenameChange={setBaseFilename}
          />

          {/* BibTeX Option Component */}
          <BibtexOption
            includeBibtex={includeBibtex}
            isBibtexLoading={isBibtexLoading}
            onBibtexChange={handleBibtexChange}
          />
        </Box>

        {/* Action Buttons Component */}
        <ActionButtons
          onCopyFull={copyToClipboard}
          onDownloadFull={() => download("full")}
          onNewConversion={onNewConversion}
          onCopyMenuOpen={openCopyMenu}
          onDownloadMenuOpen={openDownloadMenu}
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
      <CopyMenu
        anchorEl={copyAnchorEl}
        open={Boolean(copyAnchorEl)}
        onClose={closeCopyMenu}
        sectionMetadata={sectionMetadata}
        onCopySection={copySection}
      />

      {/* Download Section Menu */}
      <DownloadMenu
        anchorEl={downloadAnchorEl}
        open={Boolean(downloadAnchorEl)}
        onClose={closeDownloadMenu}
        onDownload={download}
        sectionMetadata={sectionMetadata}
      />

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={closeSnackbar}
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
