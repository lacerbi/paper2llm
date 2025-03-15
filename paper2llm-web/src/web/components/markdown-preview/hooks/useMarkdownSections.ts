// AI Summary: Custom hook to manage markdown sections state and parsing
// Handles parsing sections, metadata extraction, and section state updates when markdown changes

import { useState, useEffect } from "react";
import { PdfToMdResult } from "../../../../types/interfaces";
import { 
  splitMarkdownContent, 
  getMarkdownSectionsMetadata,
  MarkdownSections,
  MarkdownSectionsMetadata
} from "../../../../core/utils/markdown-splitter";
import { MarkdownSectionsState } from "../types";

/**
 * Custom hook for managing markdown sections
 * 
 * @param result The PDF to Markdown conversion result
 * @returns An object containing the markdown sections and metadata
 */
export const useMarkdownSections = (
  result: PdfToMdResult | null
): MarkdownSectionsState => {
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
        console.error("Error splitting markdown:", error);
      }
    }
  }, [result]);

  return {
    markdownSections,
    sectionMetadata
  };
};
