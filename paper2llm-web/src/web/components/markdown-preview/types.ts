import { PdfToMdResult } from "../../../types/interfaces";
import { MarkdownSections, MarkdownSectionsMetadata } from "../../../core/utils/markdown-splitter";

/**
 * Props for the MarkdownPreview component
 */
export interface MarkdownPreviewProps {
  result: PdfToMdResult | null;
  onNewConversion: () => void;
}

/**
 * Props for the TabPanel component
 */
export interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

/**
 * Document section types for copying and downloading
 */
export type SectionType = "full" | "main" | "appendix" | "backmatter" | "allparts";

/**
 * Snackbar alert severity types
 */
export type SnackbarSeverity = "success" | "error" | "info";

/**
 * Image metrics information
 */
export interface ImageMetrics {
  originalImageCount: number;
  describedImageCount: number;
  hasProcessedImages: boolean;
}

/**
 * State interface for markdown sections processing
 */
export interface MarkdownSectionsState {
  markdownSections: MarkdownSections | null;
  sectionMetadata: MarkdownSectionsMetadata | null;
}
