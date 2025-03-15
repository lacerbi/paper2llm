// AI Summary: Displays metadata about document sections like main content, appendix, and backmatter.
// Uses Chip components to visualize section structure and word counts.

import React from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import {
  Subject as MainContentIcon,
  BookmarkBorder as AppendixIcon,
  Info as BackmatterIcon,
} from "@mui/icons-material";
import { MarkdownSectionsMetadata } from "../../../../core/utils/markdown-splitter";

interface DocumentSectionsProps {
  sectionMetadata: MarkdownSectionsMetadata | null;
}

/**
 * Component to display document section information (main content, appendix, backmatter)
 */
const DocumentSections: React.FC<DocumentSectionsProps> = ({
  sectionMetadata,
}) => {
  if (!sectionMetadata) {
    return null;
  }

  return (
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
  );
};

export default DocumentSections;
