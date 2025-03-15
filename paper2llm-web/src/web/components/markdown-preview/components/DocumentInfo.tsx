// AI Summary: Displays document metadata like filename, size, and page count.
// Uses Material UI List components for a clean, structured display.

import React from "react";
import {
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Grid,
} from "@mui/material";
import {
  Description as DocumentIcon,
  AutoStories as PageIcon,
  CalendarToday as DateIcon,
} from "@mui/icons-material";
import { formatFileSize, formatTimestamp } from "../utils/format-utils";

interface DocumentInfoProps {
  filename: string;
  fileSize: number;
  pageCount: number;
  timestamp: string;
}

/**
 * Component to display document information (filename, size, pages, timestamp)
 */
const DocumentInfo: React.FC<DocumentInfoProps> = ({
  filename,
  fileSize,
  pageCount,
  timestamp,
}) => {
  return (
    <Grid item xs={12} md={6}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
      >
        Document Information
      </Typography>
      <List dense disablePadding>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DocumentIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={filename}
            secondary={`Size: ${formatFileSize(fileSize)}`}
            primaryTypographyProps={{ variant: "body2" }}
            secondaryTypographyProps={{ variant: "caption" }}
          />
        </ListItem>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <PageIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={`${pageCount} pages`}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </ListItem>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <DateIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={`Converted: ${formatTimestamp(timestamp)}`}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </ListItem>
      </List>
    </Grid>
  );
};

export default DocumentInfo;
