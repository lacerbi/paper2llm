// AI Summary: Component for handling BibTeX citation generation option toggle
// Displays checkbox with loading indicator when BibTeX is being generated
// Shows clear success/failure status indicators based on generation results

import React from "react";
import {
  Box,
  Typography,
  Checkbox,
  FormControlLabel,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import {
  MenuBook as CitationIcon,
  CheckCircle as AvailableIcon,
  ErrorOutline as ErrorIcon,
} from "@mui/icons-material";
import { PdfToMdResult } from "../../../../types/interfaces";

interface BibtexOptionProps {
  includeBibtex: boolean;
  isBibtexLoading: boolean;
  onBibtexChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  bibtexAvailable?: boolean;
  result?: PdfToMdResult | null;
}

/**
 * Component for BibTeX citation option toggle
 */
const BibtexOption: React.FC<BibtexOptionProps> = ({
  includeBibtex,
  isBibtexLoading,
  onBibtexChange,
  bibtexAvailable = false,
  result,
}) => {
  // Determine BibTeX availability status
  // bibtex field can be:
  // - undefined: not yet generated
  // - empty string (''):  generation was attempted but failed
  // - non-empty string: generation was successful
  const bibtexStatus = (() => {
    if (result?.bibtex === undefined) {
      return "unknown"; // Status unknown or not yet generated
    } else if (result.bibtex === "") {
      return "failed"; // Generation was attempted but failed
    } else {
      return "available"; // Generation was successful
    }
  })();

  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={includeBibtex}
          onChange={onBibtexChange}
          disabled={isBibtexLoading}
        />
      }
      label={
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <CitationIcon fontSize="small" sx={{ mr: 0.5 }} />
          <Typography variant="body2">Add BibTeX citation</Typography>

          {/* Loading indicator */}
          {isBibtexLoading && <CircularProgress size={16} sx={{ ml: 1 }} />}

          {/* Success indicator */}
          {!isBibtexLoading && bibtexStatus === "available" && (
            <Tooltip title="BibTeX citation is available and can be included">
              <AvailableIcon
                fontSize="small"
                color="success"
                sx={{ ml: 1, fontSize: 16 }}
              />
            </Tooltip>
          )}

          {/* Error indicator */}
          {!isBibtexLoading && bibtexStatus === "failed" && (
            <Tooltip title="BibTeX generation failed - a mock citation will be used as fallback">
              <ErrorIcon
                fontSize="small"
                color="error"
                sx={{ ml: 1, fontSize: 16 }}
              />
            </Tooltip>
          )}
        </Box>
      }
      sx={{ mt: 0.5 }}
    />
  );
};

export default BibtexOption;
