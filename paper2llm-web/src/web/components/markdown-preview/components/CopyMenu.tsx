// AI Summary: Component handling the copy section menu dropdown with options for different document parts
// Provides menu items for main content, appendix, backmatter, and all parts with proper icons and word counts

import React from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import {
  Subject as MainContentIcon,
  BookmarkBorder as AppendixIcon,
  Info as BackmatterIcon,
  ViewModule as AllPartsIcon,
} from "@mui/icons-material";
import { MarkdownSectionsMetadata } from "../../../../core/utils/markdown-splitter";

interface CopyMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  sectionMetadata: MarkdownSectionsMetadata | null;
  onCopySection: (section: "main" | "appendix" | "backmatter" | "allparts") => void;
}

/**
 * Component for the copy section menu dropdown
 */
const CopyMenu: React.FC<CopyMenuProps> = ({
  anchorEl,
  open,
  onClose,
  sectionMetadata,
  onCopySection,
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      <MenuItem
        onClick={() => {
          onCopySection("main");
          onClose();
        }}
      >
        <ListItemIcon>
          <MainContentIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Main Content"
          secondary={
            sectionMetadata?.wordCount?.mainContent
              ? `${sectionMetadata.wordCount.mainContent} words`
              : undefined
          }
        />
      </MenuItem>
      <MenuItem
        onClick={() => {
          onCopySection("appendix");
          onClose();
        }}
        disabled={!sectionMetadata?.hasAppendix}
      >
        <ListItemIcon>
          <AppendixIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Appendix"
          secondary={
            sectionMetadata?.hasAppendix &&
            sectionMetadata?.wordCount?.appendix
              ? `${sectionMetadata.wordCount.appendix} words`
              : "Not available"
          }
        />
      </MenuItem>
      <MenuItem
        onClick={() => {
          onCopySection("backmatter");
          onClose();
        }}
        disabled={!sectionMetadata?.hasBackmatter}
      >
        <ListItemIcon>
          <BackmatterIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="Backmatter"
          secondary={
            sectionMetadata?.hasBackmatter &&
            sectionMetadata?.wordCount?.backmatter
              ? `${sectionMetadata.wordCount.backmatter} words`
              : "Not available"
          }
        />
      </MenuItem>
      <Divider />
      <MenuItem
        onClick={() => {
          onCopySection("allparts");
          onClose();
        }}
      >
        <ListItemIcon>
          <AllPartsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="All Parts"
          secondary={
            sectionMetadata?.wordCount?.total
              ? `${sectionMetadata.wordCount.total} words total`
              : undefined
          }
        />
      </MenuItem>
    </Menu>
  );
};

export default CopyMenu;
