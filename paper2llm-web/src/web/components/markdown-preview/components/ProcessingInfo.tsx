// AI Summary: Displays OCR model and image processing information.
// Shows the count of detected and AI-described images, and vision model details if available.

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
  Code as CodeIcon,
  Image as ImageIcon,
  Architecture as ModelIcon,
} from "@mui/icons-material";
import { ApiProvider } from "../../../../types/interfaces";
import { ImageMetrics } from "../types";

interface ProcessingInfoProps {
  ocrModel: string;
  imagesCount: number;
  imageMetrics: ImageMetrics;
  visionModel?: string;
  visionModelProvider?: ApiProvider;
}

/**
 * Component to display processing information (OCR model, images, vision model)
 */
const ProcessingInfo: React.FC<ProcessingInfoProps> = ({
  ocrModel,
  imagesCount,
  imageMetrics,
  visionModel,
  visionModelProvider,
}) => {
  return (
    <Grid item xs={12} md={6}>
      <Typography
        variant="subtitle2"
        sx={{ mb: 1, fontWeight: "medium", color: "text.secondary" }}
      >
        Processing Information
      </Typography>
      <List dense disablePadding>
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <CodeIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={`OCR Model: ${ocrModel}`}
            primaryTypographyProps={{ variant: "body2" }}
          />
        </ListItem>

        {/* Image count */}
        <ListItem disablePadding sx={{ mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 36 }}>
            <ImageIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText
            primary={`Images: ${imagesCount} detected`}
            secondary={
              imageMetrics.describedImageCount > 0
                ? `${imageMetrics.describedImageCount} images with AI descriptions`
                : null
            }
            primaryTypographyProps={{ variant: "body2" }}
            secondaryTypographyProps={{ variant: "caption" }}
          />
        </ListItem>

        {/* Vision model info - display if available */}
        {visionModel && (
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <ModelIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText
              primary={`Vision Model: ${visionModel}`}
              secondary={
                visionModelProvider
                  ? `Provider: ${visionModelProvider}`
                  : null
              }
              primaryTypographyProps={{ variant: "body2" }}
              secondaryTypographyProps={{ variant: "caption" }}
            />
          </ListItem>
        )}
      </List>
    </Grid>
  );
};

export default ProcessingInfo;
