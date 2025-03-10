// AI Summary: Main application component integrating Material UI components for a modern interface.
// Manages file uploading, API key handling, PDF processing, and markdown preview with responsive layout.

import React, { useState, useCallback } from "react";
// @ts-ignore
import packageInfo from "../../package.json";
import {
  AppBar,
  Toolbar,
  Typography,
  Container,
  Box,
  Paper,
  Divider,
  Button,
  useTheme,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import FileUploader from "./components/FileUploader";
import ApiKeyManager from "./components/ApiKeyManager";
import ProcessingStatus from "./components/ProcessingStatus";
import MarkdownPreview from "./components/MarkdownPreview";
import { PdfFile, ProgressUpdate, PdfToMdResult } from "../types/interfaces";
import { webProgressReporter } from "../adapters/web/progress-reporter";
import { pdfToMdService } from "../core/pdf-to-md";

const App: React.FC = () => {
  const theme = useTheme();
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [isApiKeyValid, setIsApiKeyValid] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(
    null
  );
  const [conversionResult, setConversionResult] =
    useState<PdfToMdResult | null>(null);
  const [visionModel, setVisionModel] = useState<string>("pixtral-12b-2409");

  // Handle API key changes
  const handleApiKeyChange = (key: string) => {
    setApiKey(key);
    setIsApiKeyValid(key.length > 0);
  };

  // Handle model selection changes
  const handleModelChange = (event: SelectChangeEvent) => {
    setVisionModel(event.target.value);
  };

  // Handle file selection
  const handleFileSelected = useCallback((file: PdfFile) => {
    setPdfFile(file);
    setConversionResult(null);
    setProcessingError(null);
  }, []);

  // Set up progress reporting
  const setupProgressReporting = useCallback(() => {
    // Clear any existing listeners
    webProgressReporter.removeProgressListener(setProgressUpdate);
    webProgressReporter.removeErrorListener(handleProcessingError);

    // Add new listeners
    webProgressReporter.addProgressListener(setProgressUpdate);
    webProgressReporter.addErrorListener(handleProcessingError);
  }, []);

  // Handle processing errors
  const handleProcessingError = useCallback((error: Error) => {
    setProcessingError(error);
    setIsProcessing(false);
  }, []);

  // Start the conversion process
  const startConversion = useCallback(async () => {
    if (!pdfFile || !isApiKeyValid) {
      return;
    }

    try {
      setIsProcessing(true);
      setProcessingError(null);
      setConversionResult(null);
      setupProgressReporting();

      const result = await pdfToMdService.convertPdfToMarkdown(
        pdfFile,
        apiKey,
        { includeImageBase64: true },
        {
          addPageNumbers: true,
          addPageSeparators: true,
          normalizeLineBreaks: true,
          extractImageReferences: true,
          processImages: true,
          keepOriginalImages: false,
        },
        webProgressReporter,
        visionModel
      );

      setConversionResult(result);
      setIsProcessing(false);
    } catch (error) {
      setProcessingError(error as Error);
      setIsProcessing(false);
    }
  }, [pdfFile, apiKey, isApiKeyValid, setupProgressReporting]);

  // Cancel the conversion process
  const cancelConversion = useCallback(() => {
    pdfToMdService.cancelOperation();
    setIsProcessing(false);
  }, []);

  // Reset for a new conversion
  const handleNewConversion = useCallback(() => {
    setPdfFile(null);
    setConversionResult(null);
    setProcessingError(null);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <AppBar position="static" color="primary">
        <Toolbar>
          <Typography
            variant="h1"
            component="h1"
            sx={{ flexGrow: 1, fontSize: "2rem" }}
          >
            paper2llm
          </Typography>
          <Typography variant="body1">
            Convert academic PDFs with figures into text-only Markdown — for
            humans and LLMs
          </Typography>
        </Toolbar>
      </AppBar>

      <Box
        component="main"
        sx={{
          flex: 1,
          py: 4,
          px: { xs: 2, md: 4 },
          bgcolor: "background.default",
        }}
      >
        <Container maxWidth="md">
          <Paper sx={{ p: { xs: 2, md: 4 }, mb: 4 }}>
            <Box mb={4}>
              <ApiKeyManager onApiKeyChange={handleApiKeyChange} />
            </Box>

            <Divider sx={{ my: 3 }} />

            {isApiKeyValid && !conversionResult && (
              <Box mb={4}>
                <FileUploader onFileSelected={handleFileSelected} />

                {pdfFile && !isProcessing && (
                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel id="vision-model-label">
                            Vision Model
                          </InputLabel>
                          <Select
                            labelId="vision-model-label"
                            id="vision-model-select"
                            value={visionModel}
                            label="Vision Model"
                            onChange={handleModelChange}
                          >
                            <MenuItem value="pixtral-12b-2409">
                              Pixtral (pixtral-12b-2409)
                            </MenuItem>
                            <MenuItem value="pixtral-large-latest">
                              Pixtral Large (pixtral-large-latest)
                            </MenuItem>
                          </Select>
                        </FormControl>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Button
                          variant="contained"
                          color="secondary"
                          fullWidth
                          onClick={startConversion}
                        >
                          Process PDF
                        </Button>
                      </Grid>
                    </Grid>
                  </Box>
                )}
              </Box>
            )}

            {!isApiKeyValid && (
              <Paper
                sx={{
                  p: 3,
                  bgcolor: "background.default",
                  borderLeft: "4px solid",
                  borderColor: "primary.main",
                }}
              >
                <Typography variant="body1" sx={{ mb: 1 }}>
                  <code>paper2llm</code> uses{" "}
                  <a
                    href="https://mistral.ai/en"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main }}
                  >
                    Mistral AI
                  </a>
                  's{" "}
                  <a
                    href="https://mistral.ai/en/news/mistral-ocr"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main }}
                  >
                    OCR
                  </a>{" "}
                  and vision models to convert a PDF and its figures to a
                  text-only file.
                </Typography>
                <Typography variant="body1">
                  To get started, please enter{" "}
                  <a
                    href="https://console.mistral.ai/api-keys"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main }}
                  >
                    your Mistral API key
                  </a>{" "}
                  above.{" "}
                  <Tooltip title="Mistral AI's free API tier (with usage limits) is compatible with paper2llm. We have no affiliation or financial relationship with Mistral AI.">
                    <InfoIcon
                      fontSize="small"
                      color="action"
                      sx={{
                        verticalAlign: "middle",
                        fontSize: "1rem",
                        cursor: "help",
                      }}
                    />
                  </Tooltip>
                </Typography>
              </Paper>
            )}

            <Box mb={4}>
              <ProcessingStatus
                isProcessing={isProcessing}
                currentProgress={progressUpdate}
                error={processingError}
                onCancel={cancelConversion}
                onRetry={startConversion}
              />
            </Box>

            {conversionResult && (
              <Box>
                <MarkdownPreview
                  result={conversionResult}
                  onNewConversion={handleNewConversion}
                />
              </Box>
            )}
          </Paper>
        </Container>
      </Box>

      <Box
        component="footer"
        sx={{
          py: 0.5,
          textAlign: "center",
          bgcolor: "background.paper",
          borderTop: 1,
          borderColor: "divider",
          color: "text.secondary",
          fontSize: "0.875rem",
          position: "sticky",
          bottom: 0,
          width: "100%",
          mt: "auto",
        }}
      >
        <Typography variant="body2" sx={{ mb: 1 }}>
          © 2025 paper2llm v{packageInfo.version} - MIT License |{" "}
          <a
            href="https://github.com/lacerbi/paper2llm"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.palette.primary.main }}
          >
            GitHub
          </a>{" "}
          - Developed by{" "}
          <a
            href="https://lacerbi.github.io/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.palette.primary.main }}
          >
            Luigi Acerbi
          </a>{" "}
          - Follow on{" "}
          <a
            href="https://x.com/AcerbiLuigi"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.palette.primary.main }}
          >
            X
          </a>{" "}
          |
          <a
            href="https://bsky.app/profile/lacerbi.bsky.social"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.palette.primary.main }}
          >
            {" "}
            Bluesky
          </a>
        </Typography>
      </Box>
    </Box>
  );
};

export default App;
