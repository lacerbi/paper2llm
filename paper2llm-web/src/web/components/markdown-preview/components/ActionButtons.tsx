// AI Summary: Provides document action buttons for copying, downloading, and creating new conversions.
// Organized in a stack layout with button groups for full document and document parts.

import React from "react";
import { Box, Typography, Button, Stack } from "@mui/material";
import {
  ContentCopy as CopyIcon,
  FileDownload as DownloadIcon,
  AddCircleOutline as NewIcon,
  ArrowDropDown as DropDownIcon,
} from "@mui/icons-material";

interface ActionButtonsProps {
  onCopyFull: () => void;
  onDownloadFull: () => void;
  onNewConversion: () => void;
  onCopyMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  onDownloadMenuOpen: (event: React.MouseEvent<HTMLElement>) => void;
  isBibtexLoading: boolean;
}

/**
 * Component for document action buttons (copy, download, new conversion)
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({
  onCopyFull,
  onDownloadFull,
  onNewConversion,
  onCopyMenuOpen,
  onDownloadMenuOpen,
  isBibtexLoading,
}) => {
  return (
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
            onClick={onCopyFull}
            size="small"
            disabled={isBibtexLoading}
          >
            Copy Full
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<DownloadIcon />}
            onClick={onDownloadFull}
            size="small"
            disabled={isBibtexLoading}
          >
            Download Full
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
          }}
        >
          Document Parts
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button
            variant="outlined"
            endIcon={<DropDownIcon />}
            onClick={onCopyMenuOpen}
            size="small"
            startIcon={<CopyIcon />}
            disabled={isBibtexLoading}
          >
            Copy
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            endIcon={<DropDownIcon />}
            onClick={onDownloadMenuOpen}
            size="small"
            startIcon={<DownloadIcon />}
            disabled={isBibtexLoading}
          >
            Download
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default ActionButtons;
