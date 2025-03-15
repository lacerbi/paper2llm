// AI Summary: Simple component to control the visibility of tab panels based on the selected tab index.
// Implements accessibility attributes for better user experience.

import React from "react";
import { Box } from "@mui/material";
import { TabPanelProps } from "../types";

/**
 * Renders a tab panel that shows/hides content based on the selected tab
 */
const TabPanel: React.FC<TabPanelProps> = ({ 
  children, 
  value, 
  index, 
  ...other 
}) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`markdown-tabpanel-${index}`}
      aria-labelledby={`markdown-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

export default TabPanel;
