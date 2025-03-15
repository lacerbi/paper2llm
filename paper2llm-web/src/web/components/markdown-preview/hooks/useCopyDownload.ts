// AI Summary: Custom hook for managing copy and download operations, BibTeX generation, and filename state
// Provides functions for copying/downloading content sections and managing UI feedback

import { useState } from "react";
import { MarkdownSections } from "../../../../core/utils/markdown-splitter";
import { 
  SectionType,
  SnackbarSeverity
} from "../types";
import { 
  getContentWithOptionalBibtex,
  getSectionContent,
  getSectionDisplayName
} from "../utils/content-utils";

interface CopyDownloadHookParams {
  markdown: string;
  markdownSections: MarkdownSections | null;
  sourceFilename: string;
}

interface CopyDownloadHookResult {
  snackbarOpen: boolean;
  snackbarMessage: string;
  snackbarSeverity: SnackbarSeverity;
  copyAnchorEl: HTMLElement | null;
  downloadAnchorEl: HTMLElement | null;
  isBibtexLoading: boolean;
  includeBibtex: boolean;
  baseFilename: string;
  originalFilename: string;
  closeSnackbar: () => void;
  openCopyMenu: (event: React.MouseEvent<HTMLElement>) => void;
  closeCopyMenu: () => void;
  openDownloadMenu: (event: React.MouseEvent<HTMLElement>) => void;
  closeDownloadMenu: () => void;
  copyToClipboard: () => Promise<void>;
  copySection: (section: "main" | "appendix" | "backmatter" | "allparts") => Promise<void>;
  download: (section?: SectionType) => Promise<void>;
  handleBibtexChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  setBaseFilename: (filename: string) => void;
}

/**
 * Custom hook for managing copy and download functionality
 */
export const useCopyDownload = ({
  markdown,
  markdownSections,
  sourceFilename
}: CopyDownloadHookParams): CopyDownloadHookResult => {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState<SnackbarSeverity>("success");
  const [copyAnchorEl, setCopyAnchorEl] = useState<null | HTMLElement>(null);
  const [downloadAnchorEl, setDownloadAnchorEl] = useState<null | HTMLElement>(null);
  const [includeBibtex, setIncludeBibtex] = useState(false);
  const [isBibtexLoading, setIsBibtexLoading] = useState(false);
  
  // Default base filename from source PDF (without extension)
  const defaultFilename = sourceFilename.replace(/\.[^/.]+$/, "");
  const [baseFilename, setBaseFilename] = useState<string>(defaultFilename);
  const [originalFilename, setOriginalFilename] = useState<string>(defaultFilename);

  // Initialize the filenames from the source filename when it changes
  if (defaultFilename !== originalFilename) {
    setBaseFilename(defaultFilename);
    setOriginalFilename(defaultFilename);
  }

  const closeSnackbar = (
    event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
  };

  const openCopyMenu = (event: React.MouseEvent<HTMLElement>) => {
    setCopyAnchorEl(event.currentTarget);
  };

  const closeCopyMenu = () => {
    setCopyAnchorEl(null);
  };

  const openDownloadMenu = (event: React.MouseEvent<HTMLElement>) => {
    setDownloadAnchorEl(event.currentTarget);
  };

  const closeDownloadMenu = () => {
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

  const copyToClipboard = async () => {
    try {
      const contentToCopy = await getContentWithOptionalBibtex(
        markdownSections, 
        markdown, 
        "full", 
        includeBibtex
      );

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

  const copySection = async (
    section: "main" | "appendix" | "backmatter" | "allparts"
  ) => {
    try {
      setIsBibtexLoading(true);
      const content = await getContentWithOptionalBibtex(
        markdownSections, 
        markdown, 
        section, 
        includeBibtex, 
        true
      );

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

  const download = async (section: SectionType = "full") => {
    // Special handling for "allparts" to download all three separate files
    if (section === "allparts") {
      try {
        setIsBibtexLoading(true);
        // For allparts, we handle each section individually to prevent duplicate BibTeX
        const mainContent = await getContentWithOptionalBibtex(
          markdownSections, 
          markdown, 
          "main", 
          includeBibtex, 
          true
        );
        // For appendix and backmatter, we don't add BibTeX even if checkbox is checked
        const appendixContent = getSectionContent(
          markdownSections, 
          markdown, 
          "appendix", 
          true
        );
        const backmatterContent = getSectionContent(
          markdownSections, 
          markdown, 
          "backmatter", 
          true
        );

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

  return {
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
  };
};
