// AI Summary: Main application component integrating Material UI components for a modern interface.
// Manages file uploading, API key handling for multiple providers, PDF processing, and markdown preview with responsive layout.

import React, { useState, useCallback, useEffect } from "react";
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
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  SelectChangeEvent,
  Tooltip,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";
import StarIcon from "@mui/icons-material/Star";
import FileUploader from "./components/FileUploader";
import ApiKeyManager from "./components/ApiKeyManager";
import ProcessingStatus from "./components/ProcessingStatus";
import MarkdownPreview from "./components/markdown-preview";
import {
  PdfFile,
  ProgressUpdate,
  PdfToMdResult,
  ApiProvider,
  VisionModelInfo,
} from "../types/interfaces";
import { webProgressReporter } from "../adapters/web/progress-reporter";
import { pdfToMdService } from "../core/pdf-to-md";
import { multiProviderImageService } from "../core/image-service";
import { PROVIDER_INFO } from "./components/api-key-manager/constants";

const App: React.FC = () => {
  const theme = useTheme();
  const [pdfFile, setPdfFile] = useState<PdfFile | null>(null);
  const [apiKeys, setApiKeys] = useState<Record<ApiProvider, string>>({
    mistral: "",
    openai: "",
    gemini: "",
    anthropic: "",
  });
  const [isApiKeyValid, setIsApiKeyValid] = useState<
    Record<ApiProvider, boolean>
  >({
    mistral: false,
    openai: false,
    gemini: false,
    anthropic: false,
  });
  const [selectedProvider, setSelectedProvider] =
    useState<ApiProvider>("mistral");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingError, setProcessingError] = useState<Error | null>(null);
  const [progressUpdate, setProgressUpdate] = useState<ProgressUpdate | null>(
    null
  );
  const [conversionResult, setConversionResult] =
    useState<PdfToMdResult | null>(null);
  // Special constant for the "None" option
  const NONE_OPTION_ID = "none";
  const NONE_OPTION: VisionModelInfo = {
    id: NONE_OPTION_ID,
    name: "None (no image descriptions)",
    description:
      "Skip image processing and replace images with placeholder text",
    provider: "mistral", // Default provider, doesn't matter for this option
  };

  const [visionModel, setVisionModel] = useState<string>("pixtral-12b-2409");
  const [availableModels, setAvailableModels] = useState<VisionModelInfo[]>([]);

  // Handle API key changes
  const handleApiKeyChange = (key: string, provider: ApiProvider) => {
    setApiKeys((prev) => ({ ...prev, [provider]: key }));
    const isValid = key.length > 0;
    setIsApiKeyValid((prev) => ({ ...prev, [provider]: isValid }));

    // Update available models after updating the API key validity state
    setTimeout(() => updateAvailableModels(), 0);

    // If this provider is now valid but the selected provider isn't,
    // switch to this provider
    if (isValid && !isApiKeyValid[selectedProvider]) {
      setSelectedProvider(provider);
    }
  };

  // Handle provider selection change
  const handleProviderChange = (provider: ApiProvider) => {
    setSelectedProvider(provider);

    // Set default model when switching providers if that provider has a valid key
    if (isApiKeyValid[provider]) {
      const defaultModel = multiProviderImageService.getDefaultModel(provider);
      if (defaultModel) {
        setVisionModel(defaultModel);
      }
    }
  };

  // Update available models from all providers with valid API keys
  const updateAvailableModels = useCallback(() => {
    const allModels: VisionModelInfo[] = [];

    // Collect models from all providers with valid API keys
    Object.keys(isApiKeyValid).forEach((providerKey) => {
      const provider = providerKey as ApiProvider;
      if (isApiKeyValid[provider]) {
        const providerModels =
          multiProviderImageService.getAvailableModels(provider);
        allModels.push(...providerModels);
      }
    });

    // Always add the "None" option at the beginning
    setAvailableModels([NONE_OPTION, ...allModels]);
  }, [isApiKeyValid]);

  // Initialize available models when API key validity changes
  useEffect(() => {
    updateAvailableModels();
  }, [isApiKeyValid, updateAvailableModels]);

  // If the current provider's API key becomes invalid,
  // check if any other provider has a valid key and switch to it
  useEffect(() => {
    if (!isApiKeyValid[selectedProvider]) {
      const validProvider = Object.keys(isApiKeyValid).find(
        (p) => isApiKeyValid[p as ApiProvider]
      ) as ApiProvider | undefined;

      if (validProvider) {
        setSelectedProvider(validProvider);
      }
    }
  }, [isApiKeyValid, selectedProvider]);

  // If the available models change, ensure the selected model is valid
  useEffect(() => {
    if (
      availableModels.length > 0 &&
      !availableModels.some((model) => model.id === visionModel)
    ) {
      // If current model is not in available models, use the first available
      setVisionModel(availableModels[0].id);
    }
  }, [availableModels, visionModel]);

  // Handle vision model selection changes
  const handleModelChange = (event: SelectChangeEvent) => {
    const modelId = event.target.value;
    setVisionModel(modelId);

    // Find the provider for this model and update the selected provider
    const selectedModelInfo = availableModels.find(
      (model) => model.id === modelId
    );
    if (selectedModelInfo) {
      // Only update the provider if it's not the "None" option
      if (modelId !== NONE_OPTION_ID) {
        setSelectedProvider(selectedModelInfo.provider);
      }
    }
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
    if (!pdfFile || !isApiKeyValid.mistral) {
      return;
    }

    // Always require Mistral key for OCR
    const mistralKey = apiKeys.mistral;

    // Check if the "None" option is selected
    const isNoneOptionSelected = visionModel === NONE_OPTION_ID;

    // Find the provider for the selected model if not using "None" option
    let modelProvider: ApiProvider = "mistral"; // Default
    let visionKey = "";

    if (!isNoneOptionSelected) {
      const selectedModelInfo = availableModels.find(
        (model) => model.id === visionModel
      );
      if (!selectedModelInfo) {
        setProcessingError(
          new Error(
            `Could not find information for the selected model. Please select a different model.`
          )
        );
        return;
      }

      modelProvider = selectedModelInfo.provider;

      // Get the API key for the model's provider
      visionKey = apiKeys[modelProvider];

      // Check if we have valid keys when not using "None" option
      if (!mistralKey) {
        setProcessingError(
          new Error(
            `Missing required Mistral API key for OCR processing. This is required to process PDFs.`
          )
        );
        return;
      }

      if (!visionKey) {
        setProcessingError(
          new Error(
            `Missing required ${PROVIDER_INFO[modelProvider].name} API key for image processing. Please provide this key or select "None" for image descriptions.`
          )
        );
        return;
      }
    } else {
      // Only check for Mistral OCR API key when using "None" option
      if (!mistralKey) {
        setProcessingError(
          new Error(`Missing required Mistral API key for OCR processing.`)
        );
        return;
      }
    }

    try {
      setIsProcessing(true);
      setProcessingError(null);
      setConversionResult(null);
      setupProgressReporting();

      const result = await pdfToMdService.convertPdfToMarkdown(
        pdfFile,
        apiKeys.mistral, // Always use Mistral key for OCR
        apiKeys[modelProvider], // Provider-specific key for vision
        { includeImageBase64: true },
        {
          addPageNumbers: true,
          addPageSeparators: true,
          normalizeLineBreaks: true,
          extractImageReferences: true,
          processImages: visionModel !== NONE_OPTION_ID, // Skip image processing if "None" option is selected
          keepOriginalImages: false,
        },
        webProgressReporter,
        isNoneOptionSelected ? undefined : visionModel,
        isNoneOptionSelected ? undefined : modelProvider // Only pass provider if not using "None" option
      );

      setConversionResult(result);
      setIsProcessing(false);
    } catch (error) {
      setProcessingError(error as Error);
      setIsProcessing(false);
    }
  }, [
    pdfFile,
    apiKeys,
    isApiKeyValid,
    selectedProvider,
    visionModel,
    setupProgressReporting,
  ]);

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
              <ApiKeyManager
                onApiKeyChange={handleApiKeyChange}
                onProviderChange={handleProviderChange}
                selectedProvider={selectedProvider}
              />
            </Box>

            {isApiKeyValid.mistral && !conversionResult && (
              <Box mb={4}>
                <FileUploader onFileSelected={handleFileSelected} />

                {pdfFile && !isProcessing && (
                  <Box sx={{ mt: 3 }}>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <FormControl
                          fullWidth
                          size="small"
                          disabled={availableModels.length === 0}
                        >
                          <InputLabel id="vision-model-label">
                            Vision Model (for image descriptions){" "}
                            {availableModels.length === 0
                              ? "(No valid API keys)"
                              : ""}
                          </InputLabel>
                          <Select
                            labelId="vision-model-label"
                            id="vision-model-select"
                            value={visionModel}
                            label={`Vision Model (for image descriptions)${
                              availableModels.length === 0
                                ? "(No valid API keys)"
                                : ""
                            }`}
                            onChange={handleModelChange}
                          >
                            {availableModels.length === 0 ? (
                              <MenuItem value="" disabled>
                                No models available - please enter valid API
                                keys
                              </MenuItem>
                            ) : (
                              availableModels.map((model) => (
                                <MenuItem key={model.id} value={model.id}>
                                  {model.id === NONE_OPTION_ID ? (
                                    // For the "None" option, don't show provider prefix
                                    model.name
                                  ) : (
                                    // For all other models, show provider prefix and highlight default models
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                      <Tooltip 
                                        title={model.description || "No description available"}
                                        placement="right-start"
                                      >
                                        <span>
                                          {`${PROVIDER_INFO[model.provider].name}: ${model.name} (${model.id})`}
                                        </span>
                                      </Tooltip>
                                      {model.id === multiProviderImageService.getDefaultModel(model.provider) && (
                                        <Tooltip title="Default model for this provider">
                                          <StarIcon 
                                            fontSize="small" 
                                            color="primary" 
                                            sx={{ ml: 0.5 }}
                                          />
                                        </Tooltip>
                                      )}
                                    </Box>
                                  )}
                                </MenuItem>
                              ))
                            )}
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

            {!isApiKeyValid.mistral && (
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
                    href="https://mistral.ai/en/news/mistral-ocr"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: theme.palette.primary.main }}
                  >
                    Mistral OCR
                  </a>{" "}
                  and other vision models to convert a PDF and its figures to a
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
                    your Mistral AI API key
                  </a>{" "}
                  above to continue.{" "}
                  <Tooltip title="Mistral AI's free API tier (with usage limits) is compatible with paper2llm. OCR processing requires a Mistral API key, while image description can use any of the supported providers. We have no affiliation with any of these providers.">
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
