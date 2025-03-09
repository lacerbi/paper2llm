// AI Summary: React component for secure API key management across multiple providers.
// Provides UI for entering, storing, and retrieving API keys with password protection,
// storage type selection, provider selection, and expiration options.
// Maintains a clean UI despite added complexity.

import React, { useState, useEffect, useCallback } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
  InputAdornment,
  FormControl,
  FormHelperText,
  Paper,
  Alert,
  Divider,
  useTheme,
  Grid,
  Stack,
  Chip,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Tooltip,
  AlertTitle,
  SelectChangeEvent,
  CircularProgress,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  Lock as LockIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  SwapHoriz as SwapHorizIcon,
} from "@mui/icons-material";
import {
  ApiKeyManagerState,
  ApiKeyStorageOptions,
  ApiKeyExpiration,
  ApiProvider,
  ProviderApiKeyInfo,
} from "../../types/interfaces";
import { WebApiKeyStorage } from "../../adapters/web/api-storage";

// Create an instance of the WebApiKeyStorage
const webApiKeyStorage = new WebApiKeyStorage();

// Provider configurations with validation patterns and documentation links
const PROVIDER_INFO: Record<ApiProvider, ProviderApiKeyInfo> = {
  mistral: {
    name: "Mistral AI",
    description: "Required for both OCR and vision capabilities",
    validationPattern: /^[A-Za-z0-9-_]{32,64}$/,
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  openai: {
    name: "OpenAI",
    description: "Optional, for enhanced vision capabilities",
    validationPattern: /^sk-[A-Za-z0-9]{32,64}$/,
    docsUrl: "https://platform.openai.com/api-keys",
  },
};

interface ApiKeyManagerProps {
  onApiKeyChange: (apiKey: string, provider: ApiProvider) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeyChange }) => {
  const theme = useTheme();

  // Initialize state with default values for all providers
  const [state, setState] = useState<ApiKeyManagerState>({
    apiKeys: {
      mistral: "",
      openai: "",
    },
    selectedProvider: "mistral", // Default to Mistral
    password: "",
    showPasswordField: false,
    showApiKeyField: false,
    isStored: {
      mistral: false,
      openai: false,
    },
    isValid: {
      mistral: false,
      openai: false,
    },
    error: null,
    isAuthenticated: {
      mistral: false,
      openai: false,
    },
  });

  // For UI display only - to mask the actual API keys (per provider)
  const [maskedApiKeys, setMaskedApiKeys] = useState<
    Record<ApiProvider, string>
  >({
    mistral: "",
    openai: "",
  });

  // State for security options
  const [expiration, setExpiration] = useState<ApiKeyExpiration>("session");

  // New state for password validation
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // States for password retry mechanism
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Get the current provider
  const currentProvider = state.selectedProvider;
  const currentProviderInfo = PROVIDER_INFO[currentProvider];

  // Check if any API keys are stored on component mount
  useEffect(() => {
    // Check for stored API keys for each provider
    const storedProviders = webApiKeyStorage.getStoredProviders();

    const newIsStored: Record<ApiProvider, boolean> = {
      mistral: false,
      openai: false,
    };

    const newIsAuthenticated: Record<ApiProvider, boolean> = {
      mistral: false,
      openai: false,
    };

    storedProviders.forEach((provider) => {
      newIsStored[provider] = true;
      // If the key doesn't require password, consider it authenticated
      newIsAuthenticated[provider] =
        !webApiKeyStorage.isPasswordProtected(provider);
    });

    setState((prev) => ({
      ...prev,
      isStored: newIsStored,
      isAuthenticated: newIsAuthenticated,
    }));

    // Try to retrieve keys that don't require passwords
    storedProviders.forEach((provider) => {
      if (newIsAuthenticated[provider]) {
        retrieveApiKey(provider);
      }
    });

    // Load existing expiration preference if available
    if (storedProviders.length > 0) {
      const provider = storedProviders[0]; // Use first provider for expiration
      const savedExpiration = webApiKeyStorage.getExpiration(provider);
      if (savedExpiration) {
        setExpiration(savedExpiration);
      }
    }
  }, []);

  // Validate API key format whenever it changes
  useEffect(() => {
    const currentKey = state.apiKeys[currentProvider];
    if (currentKey) {
      const isValid = webApiKeyStorage.validateApiKey(
        currentKey,
        currentProvider
      );
      setState((prevState) => ({
        ...prevState,
        isValid: {
          ...prevState.isValid,
          [currentProvider]: isValid,
        },
      }));
    }
  }, [state.apiKeys, currentProvider]);

  // Validate password requirements whenever expiration changes
  useEffect(() => {
    // Only validate when we have an API key to store
    if (
      state.apiKeys[currentProvider] &&
      !state.isAuthenticated[currentProvider]
    ) {
      validatePasswordRequirements();
    }

    // Clear password when expiration is set to session
    if (expiration === "session" && !state.isAuthenticated[currentProvider]) {
      setState((prev) => ({
        ...prev,
        password: "",
      }));
    }
  }, [
    expiration,
    state.password,
    state.apiKeys,
    state.isAuthenticated,
    currentProvider,
  ]);

  // Helper functions to mask API key
  const getFullyMaskedApiKey = (key: string): string => {
    if (!key || key.length <= 4) return "••••••••";
    return "•".repeat(key.length);
  };

  const getPartiallyMaskedApiKey = (key: string): string => {
    if (!key || key.length <= 4) return key;
    const lastFour = key.slice(-4);
    return `${"•".repeat(key.length - 4)}${lastFour}`;
  };

  // Pass the API key to the parent component when authenticated
  useEffect(() => {
    Object.keys(state.isAuthenticated).forEach((provider) => {
      const typedProvider = provider as ApiProvider;
      if (
        state.isAuthenticated[typedProvider] &&
        state.apiKeys[typedProvider]
      ) {
        onApiKeyChange(state.apiKeys[typedProvider], typedProvider);

        // Update masked key for display
        setMaskedApiKeys((prev) => ({
          ...prev,
          [typedProvider]: state.showApiKeyField
            ? getPartiallyMaskedApiKey(state.apiKeys[typedProvider])
            : getFullyMaskedApiKey(state.apiKeys[typedProvider]),
        }));
      } else if (
        !state.isAuthenticated[typedProvider] &&
        typedProvider === currentProvider
      ) {
        // Only clear the API key callback if it's the current provider
        onApiKeyChange("", typedProvider);

        setMaskedApiKeys((prev) => ({
          ...prev,
          [typedProvider]: "",
        }));
      }
    });
  }, [
    state.isAuthenticated,
    state.apiKeys,
    state.showApiKeyField,
    currentProvider,
    onApiKeyChange,
  ]);

  // Countdown timer for lockout period
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (lockCountdown > 0) {
      timer = setTimeout(() => {
        setLockCountdown(lockCountdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (lockCountdown === 0 && isLocked) {
      setIsLocked(false);
    }

    return undefined;
  }, [lockCountdown, isLocked]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      apiKeys: {
        ...prevState.apiKeys,
        [currentProvider]: e.target.value,
      },
      error: null,
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      password: e.target.value,
      error: null,
    }));

    // Password validation will be triggered by the useEffect
  };

  const toggleShowPassword = () => {
    setState((prevState) => ({
      ...prevState,
      showPasswordField: !prevState.showPasswordField,
    }));
  };

  const toggleShowApiKey = () => {
    const newShowApiKeyField = !state.showApiKeyField;
    setState((prevState) => ({
      ...prevState,
      showApiKeyField: newShowApiKeyField,
    }));

    // Update masked keys for all authenticated providers
    Object.keys(state.isAuthenticated).forEach((provider) => {
      const typedProvider = provider as ApiProvider;
      if (
        state.isAuthenticated[typedProvider] &&
        state.apiKeys[typedProvider]
      ) {
        setMaskedApiKeys((prev) => ({
          ...prev,
          [typedProvider]: newShowApiKeyField
            ? getPartiallyMaskedApiKey(state.apiKeys[typedProvider])
            : getFullyMaskedApiKey(state.apiKeys[typedProvider]),
        }));
      }
    });
  };

  const handleExpirationChange = (event: SelectChangeEvent) => {
    setExpiration(event.target.value as ApiKeyExpiration);
    // Password validation will be triggered by the useEffect
  };

  const handleProviderChange = (
    event: React.SyntheticEvent,
    newProvider: ApiProvider
  ) => {
    setState((prevState) => ({
      ...prevState,
      selectedProvider: newProvider,
      error: null,
    }));
  };

  // Validate password based on expiration type and security requirements
  const validatePasswordRequirements = () => {
    // Clear previous errors
    setPasswordError(null);

    // For non-session storage (localStorage), password is required
    if (expiration !== "session") {
      if (!state.password || state.password.length < 1) {
        setPasswordError("Password is required for persistent storage");
        return false;
      }

      // Check minimum length requirement
      if (state.password.length < 8) {
        setPasswordError("Password must be at least 8 characters long");
        return false;
      }

      // Check character variety requirement
      const hasLetters = /[a-zA-Z]/.test(state.password);
      const hasDigits = /[0-9]/.test(state.password);
      const hasSpecials = /[^a-zA-Z0-9]/.test(state.password);

      const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(
        Boolean
      ).length;

      if (charTypesCount < 2) {
        setPasswordError(
          "Password must contain at least two different types of characters (letters, digits, or special characters)"
        );
        return false;
      }
    }

    return true;
  };

  // Apply temporary lock after multiple failed attempts
  const applyTemporaryLock = () => {
    const newAttempts = incorrectAttempts + 1;
    setIncorrectAttempts(newAttempts);

    // Apply exponential backoff for repeated failures
    if (newAttempts >= 3) {
      const lockTime = Math.min(Math.pow(2, newAttempts - 2), 30); // Max 30 seconds
      setIsLocked(true);
      setLockCountdown(lockTime);

      setState((prevState) => ({
        ...prevState,
        error: `Too many failed attempts. Please wait ${lockTime} seconds before trying again.`,
      }));
    }
  };

  const storeApiKey = async () => {
    // Validate password requirements before proceeding
    if (!validatePasswordRequirements()) {
      return;
    }

    setIsProcessing(true);

    try {
      const options: ApiKeyStorageOptions = {
        storageType: expiration === "session" ? "session" : "local",
        expiration: expiration,
        provider: currentProvider,
      };

      // Only include password if it's provided
      if (state.password) {
        options.password = state.password;
      }

      await webApiKeyStorage.storeApiKey(
        state.apiKeys[currentProvider],
        options
      );

      setState((prevState) => ({
        ...prevState,
        isStored: {
          ...prevState.isStored,
          [currentProvider]: true,
        },
        isAuthenticated: {
          ...prevState.isAuthenticated,
          [currentProvider]: true,
        },
        error: null,
      }));

      // Reset attempts on successful storage
      setIncorrectAttempts(0);
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        error:
          error instanceof Error ? error.message : "Failed to store API key",
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  const retrieveApiKey = useCallback(
    async (provider?: ApiProvider) => {
      const targetProvider = provider || currentProvider;

      // Don't proceed if locked
      if (isLocked) {
        return;
      }

      // Pre-validate password if password protected
      if (webApiKeyStorage.isPasswordProtected(targetProvider)) {
        // Validate password according to the same requirements as when storing
        if (!validatePasswordRequirements()) {
          // Don't proceed with invalid password format
          setState((prev) => ({
            ...prev,
            error:
              passwordError ||
              "Password does not meet the security requirements",
          }));
          return;
        }
      }

      setIsProcessing(true);

      try {
        const apiKey = await webApiKeyStorage.retrieveApiKey(
          webApiKeyStorage.isPasswordProtected(targetProvider)
            ? state.password
            : undefined,
          targetProvider
        );

        if (apiKey) {
          setState((prevState) => ({
            ...prevState,
            apiKeys: {
              ...prevState.apiKeys,
              [targetProvider]: apiKey,
            },
            isAuthenticated: {
              ...prevState.isAuthenticated,
              [targetProvider]: true,
            },
            error: null,
          }));

          setMaskedApiKeys((prev) => ({
            ...prev,
            [targetProvider]: state.showApiKeyField
              ? getPartiallyMaskedApiKey(apiKey)
              : getFullyMaskedApiKey(apiKey),
          }));

          // Reset attempts on successful retrieval
          setIncorrectAttempts(0);
        } else {
          setState((prevState) => ({
            ...prevState,
            error: "Failed to retrieve API key",
          }));
          applyTemporaryLock();
        }
      } catch (error) {
        // Handle specific known error types better
        const errorMessage =
          error instanceof Error ? error.message : "Failed to retrieve API key";

        // Check for password-related errors
        if (
          errorMessage.includes("Incorrect password") ||
          errorMessage.includes("password is required") ||
          errorMessage.includes("invalid API key")
        ) {
          setState((prevState) => ({
            ...prevState,
            error: "Incorrect password. Please try again.",
          }));

          // Apply temporary lock after repeated failures
          applyTemporaryLock();
        } else {
          setState((prevState) => ({
            ...prevState,
            error: errorMessage,
          }));
        }
      } finally {
        setIsProcessing(false);
      }
    },
    [state.password, state.showApiKeyField, isLocked, currentProvider]
  );

  const clearApiKey = (provider?: ApiProvider) => {
    const targetProvider = provider || currentProvider;

    webApiKeyStorage.clearApiKey(targetProvider);

    setState((prevState) => ({
      ...prevState,
      apiKeys: {
        ...prevState.apiKeys,
        [targetProvider]: "",
      },
      password: "",
      isStored: {
        ...prevState.isStored,
        [targetProvider]: false,
      },
      isValid: {
        ...prevState.isValid,
        [targetProvider]: false,
      },
      isAuthenticated: {
        ...prevState.isAuthenticated,
        [targetProvider]: false,
      },
      error: null,
    }));

    setMaskedApiKeys((prev) => ({
      ...prev,
      [targetProvider]: "",
    }));

    // Reset security options to defaults if clearing current provider
    if (targetProvider === currentProvider) {
      setExpiration("session");
      setPasswordError(null);

      // Reset attempt counters
      setIncorrectAttempts(0);
      setIsLocked(false);
      setLockCountdown(0);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      state.isStored[currentProvider] &&
      !state.isAuthenticated[currentProvider]
    ) {
      // User is trying to access a stored key
      retrieveApiKey();
    } else {
      // User is trying to store a new key
      storeApiKey();
    }
  };

  // Determine if the form can be submitted
  const canSubmit = () => {
    // Prevent submission if locked or processing
    if (isLocked || isProcessing) return false;

    if (
      state.isStored[currentProvider] &&
      !state.isAuthenticated[currentProvider]
    ) {
      // For retrieving a stored key
      // Must have a password AND it must meet requirements if the key is password protected
      if (!state.password || state.password.length === 0) return false;

      // If it's password protected, apply the same validation as when storing
      if (webApiKeyStorage.isPasswordProtected(currentProvider)) {
        // Check minimum length requirement
        if (state.password.length < 8) return false;

        // Check character variety requirement
        const hasLetters = /[a-zA-Z]/.test(state.password);
        const hasDigits = /[0-9]/.test(state.password);
        const hasSpecials = /[^a-zA-Z0-9]/.test(state.password);

        const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(
          Boolean
        ).length;
        if (charTypesCount < 2) return false;
      }

      return true;
    } else {
      // For storing a new key
      if (!state.isValid[currentProvider]) return false;

      // For non-session storage, require valid password
      if (expiration !== "session" && (!state.password || passwordError))
        return false;

      return true;
    }
  };

  // Helper to render the password field with appropriate required status
  const renderPasswordField = () => {
    const isRequired = expiration !== "session";
    const isDisabled = expiration === "session";

    return (
      <TextField
        id="password"
        label={isRequired ? "Password (Required)" : "Password (Not needed)"}
        type={state.showPasswordField ? "text" : "password"}
        value={state.password}
        onChange={handlePasswordChange}
        placeholder={isDisabled ? "Auto-generated" : "Enter password"}
        required={isRequired}
        disabled={isDisabled || isLocked}
        error={
          !!passwordError ||
          state.error?.includes("password") ||
          state.error?.includes("Password")
        }
        helperText={passwordError}
        fullWidth
        size="small"
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LockIcon
                fontSize="small"
                color={
                  isDisabled ? "disabled" : isRequired ? "primary" : "action"
                }
              />
            </InputAdornment>
          ),
          endAdornment: !isDisabled && (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle password visibility"
                onClick={toggleShowPassword}
                edge="end"
                size="small"
                disabled={isLocked}
              >
                {state.showPasswordField ? (
                  <VisibilityOffIcon />
                ) : (
                  <VisibilityIcon />
                )}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
  };

  // Render a specific error or warning message for password-related issues
  const renderPasswordErrorMessage = () => {
    if (
      state.error &&
      (state.error.includes("password") ||
        state.error.includes("Password") ||
        state.error.includes("API key") ||
        state.error.includes("Too many failed attempts"))
    ) {
      return (
        <Alert
          severity={isLocked ? "warning" : "error"}
          sx={{ mt: 1 }}
          icon={isLocked ? <LockIcon /> : <ErrorIcon />}
        >
          <AlertTitle>
            {isLocked ? "Temporarily Locked" : "Authentication Failed"}
          </AlertTitle>
          {state.error}
          {isLocked && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Seconds remaining: {lockCountdown}
              </Typography>
            </Box>
          )}
        </Alert>
      );
    }

    return state.error ? (
      <Alert severity="error" sx={{ mt: 1 }}>
        {state.error}
      </Alert>
    ) : null;
  };

  return (
    <Box sx={{ mb: 2 }}>
      {/* Compact header with provider tabs and API status */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <KeyIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" component="h2">
            API Keys
          </Typography>
        </Box>

        {Object.keys(state.isAuthenticated).some(
          (p) => state.isAuthenticated[p as ApiProvider]
        ) && (
          <Chip
            icon={<CheckIcon />}
            label="API Keys Active"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Provider selection tabs */}
      <Tabs
        value={currentProvider}
        onChange={handleProviderChange}
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        {Object.entries(PROVIDER_INFO).map(([provider, info]) => (
          <Tab
            key={provider}
            value={provider}
            label={
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {info.name}
                {state.isAuthenticated[provider as ApiProvider] && (
                  <CheckIcon
                    sx={{ ml: 1, fontSize: "0.9rem", color: "success.main" }}
                  />
                )}
              </Box>
            }
          />
        ))}
      </Tabs>

      {!state.isStored[currentProvider] ||
      state.isAuthenticated[currentProvider] ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid
              item
              xs={12}
              md={state.isAuthenticated[currentProvider] ? 10 : 6}
            >
              <TextField
                id="apiKey"
                label={`${currentProviderInfo.name} API Key`}
                type={
                  state.isAuthenticated[currentProvider]
                    ? "text"
                    : state.showApiKeyField
                    ? "text"
                    : "password"
                }
                value={
                  state.isAuthenticated[currentProvider]
                    ? maskedApiKeys[currentProvider]
                    : state.apiKeys[currentProvider]
                }
                onChange={handleApiKeyChange}
                placeholder={`Enter your ${currentProviderInfo.name} API key`}
                disabled={state.isAuthenticated[currentProvider]}
                required
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Tooltip title={currentProviderInfo.description}>
                        <InfoIcon fontSize="small" color="action" />
                      </Tooltip>
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle API key visibility"
                        onClick={toggleShowApiKey}
                        edge="end"
                        size="small"
                      >
                        {state.showApiKeyField ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormHelperText>
                <a
                  href={currentProviderInfo.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: theme.palette.primary.main }}
                >
                  {"Get " + currentProviderInfo.name + " API key"}
                </a>
              </FormHelperText>
            </Grid>

            {state.isAuthenticated[currentProvider] && (
              <Grid item xs={12} md={2}>
                <Button
                  onClick={() => clearApiKey()}
                  variant="outlined"
                  color="error"
                  size="small"
                  fullWidth
                  sx={{ height: "40px", display: "flex", alignItems: "center" }}
                >
                  Clear Key
                </Button>
              </Grid>
            )}

            {!state.isAuthenticated[currentProvider] && (
              <>
                <Grid item xs={12} md={4}>
                  {renderPasswordField()}
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!canSubmit() || isLocked || isProcessing}
                    fullWidth
                    size="small"
                    sx={{
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {isProcessing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : state.isStored[currentProvider] ? (
                      "Unlock"
                    ) : (
                      "Save"
                    )}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>

          {/* Security Options (only shown when not authenticated) */}
          {!state.isAuthenticated[currentProvider] && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Grid
                container
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Grid item>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2">
                      API Key Security Information
                    </Typography>
                    <Tooltip title="Keys are only shared with LLM providers and stored encrypted. We recommend temporary session-only storage. There is the option of password-protected persistent storage with an expiration date.">
                      <IconButton size="small" color="primary">
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </Grid>

                <Grid item>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      Storage & Expiration:
                    </Typography>
                    <Select
                      value={expiration}
                      onChange={handleExpirationChange}
                      size="small"
                      sx={{ minWidth: 150 }}
                      disabled={isLocked}
                    >
                      <MenuItem value="session">Session only</MenuItem>
                      <MenuItem value="1day">1 Day</MenuItem>
                      <MenuItem value="7days">7 Days</MenuItem>
                      <MenuItem value="30days">30 Days</MenuItem>
                      <MenuItem value="never">Never expire</MenuItem>
                    </Select>

                    {expiration !== "session" && (
                      <Tooltip title="Password required for persistent storage">
                        <LockIcon color="primary" fontSize="small" />
                      </Tooltip>
                    )}
                  </Stack>
                </Grid>
              </Grid>

              {/* Security Warning - show password requirements for persistent storage */}
              {expiration !== "session" &&
                (!state.password || passwordError) && (
                  <Alert severity="warning" sx={{ mt: 2 }} icon={<LockIcon />}>
                    <AlertTitle>Password Requirements</AlertTitle>A strong
                    password is required when storing API keys persistently:
                    <ul>
                      <li>At least 8 characters long</li>
                      <li>
                        Must contain at least two different types of characters
                        (letters, digits, special characters)
                      </li>
                    </ul>
                    This ensures your API key remains securely encrypted between
                    browser sessions.
                  </Alert>
                )}
            </Box>
          )}

          {renderPasswordErrorMessage()}

          {/* Show password requirements when unlocking */}
          {!state.error &&
            webApiKeyStorage.isPasswordProtected(currentProvider) &&
            state.password.length > 0 &&
            !canSubmit() && (
              <Alert severity="info" sx={{ mt: 2 }} icon={<LockIcon />}>
                <AlertTitle>Password Requirements</AlertTitle>
                Your API key is protected with a password that must meet these
                requirements:
                <ul>
                  <li>At least 8 characters long</li>
                  <li>
                    Must contain at least two different types of characters
                    (letters, digits, special characters)
                  </li>
                </ul>
              </Alert>
            )}
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            borderLeft: "4px solid",
            borderColor: state.error ? "error.main" : "info.main",
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            Enter password to unlock your {currentProviderInfo.name} API key
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <TextField
                id="password"
                type={state.showPasswordField ? "text" : "password"}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                required
                fullWidth
                size="small"
                variant="outlined"
                error={!!state.error || !!passwordError}
                helperText={state.error ? null : passwordError}
                disabled={isLocked || isProcessing}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon
                        color={state.error ? "error" : "primary"}
                        fontSize="small"
                      />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                        size="small"
                        disabled={isLocked}
                      >
                        {state.showPasswordField ? (
                          <VisibilityOffIcon />
                        ) : (
                          <VisibilityIcon />
                        )}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ height: "40px" }}
                    disabled={!canSubmit() || isLocked || isProcessing}
                  >
                    {isProcessing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Unlock"
                    )}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    onClick={() => clearApiKey()}
                    variant="outlined"
                    color="error"
                    fullWidth
                    sx={{ height: "40px" }}
                    disabled={isProcessing}
                  >
                    Clear Key
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {renderPasswordErrorMessage()}
        </Paper>
      )}

      {/* Provider key status summary */}
      {Object.keys(PROVIDER_INFO).length > 1 && (
        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            API Key Status
          </Typography>
          <Grid container spacing={1}>
            {Object.entries(PROVIDER_INFO).map(([provider, info]) => (
              <Grid item xs={6} sm={4} key={provider}>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderLeft: "4px solid",
                    borderColor: state.isAuthenticated[provider as ApiProvider]
                      ? "success.main"
                      : "warning.main",
                  }}
                >
                  <Typography variant="body2">{info.name}</Typography>
                  {state.isAuthenticated[provider as ApiProvider] ? (
                    <Chip
                      label="Active"
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  ) : (
                    <Chip
                      label="Inactive"
                      color="warning"
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        </Box>
      )}
    </Box>
  );
};

export default ApiKeyManager;
