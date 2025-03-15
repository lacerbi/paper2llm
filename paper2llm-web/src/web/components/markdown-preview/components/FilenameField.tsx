// AI Summary: Component for managing the filename input field with validation
// Handles empty filename restoration and displays .md extension hint

import React from "react";
import { TextField, Typography } from "@mui/material";

interface FilenameFieldProps {
  baseFilename: string;
  originalFilename: string;
  onFilenameChange: (filename: string) => void;
}

/**
 * Component for the filename input field
 */
const FilenameField: React.FC<FilenameFieldProps> = ({
  baseFilename,
  originalFilename,
  onFilenameChange,
}) => {
  return (
    <TextField
      label="Filename"
      variant="outlined"
      size="small"
      value={baseFilename}
      onChange={(e) => onFilenameChange(e.target.value)}
      onBlur={() => {
        // If user leaves the field empty, restore the original filename
        if (!baseFilename.trim()) {
          onFilenameChange(originalFilename);
        }
      }}
      sx={{ mt: 1, mb: 1, width: "250px" }}
      InputProps={{
        endAdornment: <Typography variant="caption">.md</Typography>,
      }}
    />
  );
};

export default FilenameField;
