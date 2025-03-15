// AI Summary: Component for handling BibTeX citation generation option toggle
// Displays checkbox with loading indicator when BibTeX is being generated

import React from "react";
import { Box, Typography, Checkbox, FormControlLabel, CircularProgress } from "@mui/material";
import { MenuBook as CitationIcon } from "@mui/icons-material";

interface BibtexOptionProps {
  includeBibtex: boolean;
  isBibtexLoading: boolean;
  onBibtexChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

/**
 * Component for BibTeX citation option toggle
 */
const BibtexOption: React.FC<BibtexOptionProps> = ({
  includeBibtex,
  isBibtexLoading,
  onBibtexChange,
}) => {
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
          {isBibtexLoading && (
            <CircularProgress size={16} sx={{ ml: 1 }} />
          )}
        </Box>
      }
      sx={{ mt: 0.5 }}
    />
  );
};

export default BibtexOption;
