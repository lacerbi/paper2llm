// AI Summary: Renders markdown content with custom styling for elements like blockquotes, code blocks, and tables.
// Uses ReactMarkdown with custom component overrides for consistent visual styling.

import React from "react";
import ReactMarkdown from "react-markdown";
import { Box, useTheme } from "@mui/material";

interface MarkdownRendererProps {
  markdown: string;
  isSourceView?: boolean;
}

/**
 * Component to render markdown content with custom styling
 */
const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  markdown,
  isSourceView = false,
}) => {
  const theme = useTheme();

  // If source view is enabled, render the raw markdown
  if (isSourceView) {
    return (
      <Box
        component="pre"
        sx={{
          p: 2,
          bgcolor: "rgba(0, 0, 0, 0.03)",
          maxHeight: "72vh",
          overflow: "auto",
          borderRadius: 1,
          fontFamily: "monospace",
          fontSize: "0.875rem",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {markdown}
      </Box>
    );
  }

  // Custom components for ReactMarkdown
  const components = {
    blockquote: ({ node, ...props }: any) => {
      // Check if this is an image description blockquote
      const isImageDescription =
        props.children &&
        props.children.toString().includes("Image Description");

      return (
        <Box
          component="blockquote"
          sx={{
            pl: 2,
            borderLeft: isImageDescription
              ? `4px solid ${theme.palette.info.main}`
              : `4px solid ${theme.palette.primary.main}`,
            bgcolor: isImageDescription
              ? "rgba(41, 182, 246, 0.1)"
              : "rgba(0, 0, 0, 0.03)",
            borderRadius: "0 4px 4px 0",
            py: 1,
            px: 2,
            my: 2,
          }}
          {...props}
        />
      );
    },
    code: ({ node, inline, className, children, ...props }: any) => {
      return inline ? (
        <Box
          component="code"
          sx={{
            bgcolor: "rgba(0, 0, 0, 0.05)",
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
            fontFamily: "monospace",
          }}
          {...props}
        >
          {children}
        </Box>
      ) : (
        <Box
          component="pre"
          sx={{
            bgcolor: "rgba(0, 0, 0, 0.05)",
            p: 2,
            borderRadius: 1,
            overflowX: "auto",
            fontFamily: "monospace",
            fontSize: "0.875rem",
            my: 2,
          }}
          {...props}
        >
          <code className={className}>{children}</code>
        </Box>
      );
    },
    table: ({ node, ...props }: any) => (
      <Box
        component="div"
        sx={{
          overflowX: "auto",
          my: 2,
        }}
      >
        <Box
          component="table"
          sx={{
            borderCollapse: "collapse",
            width: "100%",
            "& th, & td": {
              border: `1px solid ${theme.palette.divider}`,
              p: 1,
              textAlign: "left",
            },
            "& th": {
              bgcolor: "rgba(0, 0, 0, 0.04)",
              fontWeight: "bold",
            },
          }}
          {...props}
        />
      </Box>
    ),
  };

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: "background.default",
        maxHeight: "72vh",
        overflow: "auto",
        borderRadius: 1,
      }}
    >
      <ReactMarkdown components={components}>{markdown}</ReactMarkdown>
    </Box>
  );
};

export default MarkdownRenderer;
