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
  Warning as WarningIcon,
} from "@mui/icons-material";
import {
  PdfToMdResult,
  BibTeXTitleValidation,
} from "../../../../types/interfaces";

interface BibtexOptionProps {
  includeBibtex: boolean;
  isBibtexLoading: boolean;
  onBibtexChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  bibtexAvailable?: boolean;
  result?: PdfToMdResult | null;
}

/**
 * Renders a tooltip with title comparison information
 */
const TitleComparisonTooltip: React.FC<{
  validation: BibTeXTitleValidation;
}> = ({ validation }) => {
  return (
    <Box sx={{ p: 1, maxWidth: 320 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: "bold", mb: 1 }}>
        Title Validation Warning
      </Typography>
      <Typography variant="body2" sx={{ mb: 1 }}>
        The citation title differs from the paper title. This may indicate a
        citation mismatch.
      </Typography>

      <Typography
        variant="caption"
        sx={{ fontWeight: "bold", display: "block", mt: 1 }}
      >
        Paper title:
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
        "{validation.originalTitle}"
      </Typography>

      <Typography
        variant="caption"
        sx={{ fontWeight: "bold", display: "block" }}
      >
        Citation title:
      </Typography>
      <Typography variant="caption" sx={{ display: "block" }}>
        "{validation.bibtexTitle}"
      </Typography>
    </Box>
  );
};

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
    } else if (
      result?.bibtex &&
      result?.bibtexTitleValidation &&
      !result.bibtexTitleValidation.matches
    ) {
      return "warning"; // Generation successful but titles don't match
    } else {
      return "available"; // Generation was successful with matching titles
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

          {/* Warning indicator (titles don't match) */}
          {!isBibtexLoading &&
            bibtexStatus === "warning" &&
            result?.bibtexTitleValidation && (
              <Tooltip
                title={
                  <TitleComparisonTooltip
                    validation={result.bibtexTitleValidation}
                  />
                }
                placement="right"
              >
                <WarningIcon
                  fontSize="small"
                  color="warning"
                  sx={{ ml: 1, fontSize: 16 }}
                />
              </Tooltip>
            )}

          {/* Error indicator */}
          {!isBibtexLoading && bibtexStatus === "failed" && (
            <Tooltip title="BibTeX generation failed - a mock citation will be used as fallback. Trying again may also work.">
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
