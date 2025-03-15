// AI Summary: Component handling the download section menu dropdown with options for different document parts
// Provides menu items for main content, appendix, backmatter, and downloading all parts as separate files

import React from "react";
import { Menu, MenuItem, ListItemIcon, ListItemText, Divider } from "@mui/material";
import {
  Subject as MainContentIcon,
  BookmarkBorder as AppendixIcon,
  Info as BackmatterIcon,
  ViewModule as AllPartsIcon,
} from "@mui/icons-material";
import { MarkdownSectionsMetadata } from "../../../../core/utils/markdown-splitter";
import { SectionType } from "../types";

interface DownloadMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onDownload: (section: SectionType) => void;
  sectionMetadata: MarkdownSectionsMetadata | null;
}

/**
 * Component for the download section menu dropdown
 */
const DownloadMenu: React.FC<DownloadMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onDownload,
  sectionMetadata,
}) => {
  return (
    <Menu
      anchorEl={anchorEl}
      open={open}
      onClose={onClose}
    >
      <MenuItem
        onClick={() => {
          onDownload("main");
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
          onDownload("appendix");
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
          onDownload("backmatter");
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
          onDownload("allparts");
          onClose();
        }}
      >
        <ListItemIcon>
          <AllPartsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText
          primary="All Parts"
          secondary="Download all parts as separate files"
        />
      </MenuItem>
    </Menu>
  );
};

export default DownloadMenu;
