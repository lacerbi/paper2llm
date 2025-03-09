// AI Summary: React component for secure Mistral API key management.
// Provides UI for entering, storing, and retrieving API keys with password protection,
// storage type selection, and expiration options. Enforces password requirement for persistent storage.

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
} from "@mui/icons-material";
import {
  ApiKeyManagerState,
  ApiKeyStorageOptions,
  ApiKeyExpiration,
} from "../../types/interfaces";
import { webApiKeyStorage } from "../../adapters/web/api-storage";

interface ApiKeyManagerProps {
  onApiKeyChange: (apiKey: string) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeyChange }) => {
  const theme = useTheme();
  const [state, setState] = useState<ApiKeyManagerState>({
    apiKey: "",
    password: "",
    showPassword: false,
    isStored: false,
    isValid: false,
    error: null,
    isAuthenticated: false,
  });

  // For UI display only - to mask the actual API key
  const [maskedApiKey, setMaskedApiKey] = useState<string>("");

  // State for security options
  const [expiration, setExpiration] = useState<ApiKeyExpiration>("session");

  // New state for password validation
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Check if an API key is stored on component mount
  useEffect(() => {
    const isStored = webApiKeyStorage.hasApiKey();
    const isPasswordProtected = isStored
      ? webApiKeyStorage.isPasswordProtected()
      : false;

    setState((prevState) => ({
      ...prevState,
      isStored,
      isAuthenticated: isStored && !isPasswordProtected,
    }));

    // If there's a stored key that doesn't require a password, retrieve it
    if (isStored && !isPasswordProtected) {
      retrieveApiKey();
    }

    // Load existing expiration preference if available
    if (isStored) {
      const savedExpiration = webApiKeyStorage.getExpiration();

      if (savedExpiration) {
        setExpiration(savedExpiration);
      }
    }
  }, []);

  // Validate API key format whenever it changes
  useEffect(() => {
    if (state.apiKey) {
      const isValid = webApiKeyStorage.validateApiKey(state.apiKey);
      setState((prevState) => ({ ...prevState, isValid }));
    }
  }, [state.apiKey]);

  // Validate password requirements whenever expiration changes
  useEffect(() => {
    // Only validate when we have an API key to store
    if (state.apiKey && !state.isAuthenticated) {
      validatePasswordRequirements();
    }

    // Clear password when expiration is set to session
    if (expiration === "session" && !state.isAuthenticated) {
      setState((prev) => ({
        ...prev,
        password: "",
      }));
    }
  }, [expiration, state.password, state.apiKey, state.isAuthenticated]);

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
    if (state.isAuthenticated && state.apiKey) {
      onApiKeyChange(state.apiKey);

      // Update masked key for display
      setMaskedApiKey(
        state.showPassword
          ? getPartiallyMaskedApiKey(state.apiKey)
          : getFullyMaskedApiKey(state.apiKey)
      );
    } else if (!state.isAuthenticated) {
      onApiKeyChange("");
      setMaskedApiKey("");
    }
  }, [state.isAuthenticated, state.apiKey, onApiKeyChange]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState((prevState) => ({
      ...prevState,
      apiKey: e.target.value,
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
    const newShowPassword = !state.showPassword;
    setState((prevState) => ({
      ...prevState,
      showPassword: newShowPassword,
    }));

    // Update the masked key if authenticated
    if (state.isAuthenticated && state.apiKey) {
      setMaskedApiKey(
        newShowPassword
          ? getPartiallyMaskedApiKey(state.apiKey)
          : getFullyMaskedApiKey(state.apiKey)
      );
    }
  };

  const handleExpirationChange = (event: SelectChangeEvent) => {
    setExpiration(event.target.value as ApiKeyExpiration);
    // Password validation will be triggered by the useEffect
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
      
      const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(Boolean).length;
      
      if (charTypesCount < 2) {
        setPasswordError("Password must contain at least two different types of characters (letters, digits, or special characters)");
        return false;
      }
    }

    return true;
  };

  const storeApiKey = async () => {
    // Validate password requirements before proceeding
    if (!validatePasswordRequirements()) {
      return;
    }

    try {
      const options: ApiKeyStorageOptions = {
        storageType: expiration === "session" ? "session" : "local",
        expiration: expiration,
      };

      // Only include password if it's provided
      if (state.password) {
        options.password = state.password;
      }

      await webApiKeyStorage.storeApiKey(state.apiKey, options);

      setState((prevState) => ({
        ...prevState,
        isStored: true,
        isAuthenticated: true,
        error: null,
      }));
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        error:
          error instanceof Error ? error.message : "Failed to store API key",
      }));
    }
  };

  const retrieveApiKey = useCallback(async () => {
    try {
      const apiKey = await webApiKeyStorage.retrieveApiKey(
        webApiKeyStorage.isPasswordProtected() ? state.password : undefined
      );

      if (apiKey) {
        setState((prevState) => ({
          ...prevState,
          apiKey,
          isAuthenticated: true,
          error: null,
        }));
        setMaskedApiKey(
          state.showPassword
            ? getPartiallyMaskedApiKey(apiKey)
            : getFullyMaskedApiKey(apiKey)
        );
      } else {
        setState((prevState) => ({
          ...prevState,
          error: "Failed to retrieve API key",
        }));
      }
    } catch (error) {
      setState((prevState) => ({
        ...prevState,
        error:
          error instanceof Error ? error.message : "Failed to retrieve API key",
      }));
    }
  }, [state.password]);

  const clearApiKey = () => {
    webApiKeyStorage.clearApiKey();
    setState({
      apiKey: "",
      password: "",
      showPassword: false,
      isStored: false,
      isValid: false,
      error: null,
      isAuthenticated: false,
    });

    // Reset security options to defaults
    setExpiration("session");
    setPasswordError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (state.isStored && !state.isAuthenticated) {
      // User is trying to access a stored key
      retrieveApiKey();
    } else {
      // User is trying to store a new key
      storeApiKey();
    }
  };

  // Determine if the form can be submitted
  const canSubmit = () => {
    if (state.isStored && !state.isAuthenticated) {
      // For retrieving a stored key
      return state.password.length > 0;
    } else {
      // For storing a new key
      if (!state.isValid) return false;

      // For non-session storage, require password
      if (expiration !== "session" && !state.password) return false;

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
        type={state.showPassword ? "text" : "password"}
        value={state.password}
        onChange={handlePasswordChange}
        placeholder={isDisabled ? "Auto-generated" : "Enter password"}
        required={isRequired}
        disabled={isDisabled}
        error={!!passwordError}
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
              >
                {state.showPassword ? (
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

  return (
    <Box sx={{ mb: 2 }}>
      {/* Compact header with API status */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <KeyIcon sx={{ mr: 1, color: "primary.main" }} />
          <Typography variant="h6" component="h2">
            Mistral AI API Key
          </Typography>
        </Box>

        {state.isAuthenticated && (
          <Chip
            icon={<CheckIcon />}
            label="API Key Active"
            color="success"
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {!state.isStored || state.isAuthenticated ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={state.isAuthenticated ? 10 : 6}>
              <TextField
                id="apiKey"
                label="API Key"
                type={
                  state.isAuthenticated
                    ? "text"
                    : state.showPassword
                    ? "text"
                    : "password"
                }
                value={state.isAuthenticated ? maskedApiKey : state.apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your Mistral API key"
                disabled={state.isAuthenticated}
                required
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                        size="small"
                      >
                        {state.showPassword ? (
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

            {state.isAuthenticated && (
              <Grid item xs={12} md={2}>
                <Button
                  onClick={clearApiKey}
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

            {!state.isAuthenticated && (
              <>
                <Grid item xs={12} md={4}>
                  {renderPasswordField()}
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!canSubmit()}
                    fullWidth
                    size="small"
                    sx={{
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {state.isStored ? "Unlock" : "Save"}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>

          {/* Security Options (only shown when not authenticated) */}
          {!state.isAuthenticated && (
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
              {expiration !== "session" && (!state.password || passwordError) && (
                <Alert severity="warning" sx={{ mt: 2 }} icon={<LockIcon />}>
                  <AlertTitle>Password Requirements</AlertTitle>
                  A strong password is required when storing API keys persistently:
                  <ul>
                    <li>At least 8 characters long</li>
                    <li>Must contain at least two different types of characters (letters, digits, special characters)</li>
                  </ul>
                  This ensures your API key remains securely encrypted between browser sessions.
                </Alert>
              )}
            </Box>
          )}

          {state.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {state.error}
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
            borderColor: "info.main",
          }}
        >
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
                Enter password to unlock your API key
              </Typography>
              <TextField
                id="password"
                type={state.showPassword ? "text" : "password"}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                required
                fullWidth
                size="small"
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                        size="small"
                      >
                        {state.showPassword ? (
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
              <Button
                onClick={handleSubmit}
                variant="contained"
                color="primary"
                fullWidth
                sx={{ mt: { xs: 0, md: 3 } }}
              >
                Unlock
              </Button>
            </Grid>
          </Grid>

          {state.error && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {state.error}
            </Alert>
          )}
        </Paper>
      )}
    </Box>
  );
};

export default ApiKeyManager;
