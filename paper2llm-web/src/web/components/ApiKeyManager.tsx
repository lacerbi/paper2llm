// AI Summary: React component for secure Mistral API key management.
// Provides UI for entering, storing, and retrieving API keys with optional password protection.
// Now uses a compact layout with horizontal arrangement of elements.

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
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  Lock as LockIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { ApiKeyManagerState } from "../../types/interfaces";
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
  }, []);

  // Validate API key format whenever it changes
  useEffect(() => {
    if (state.apiKey) {
      const isValid = webApiKeyStorage.validateApiKey(state.apiKey);
      setState((prevState) => ({ ...prevState, isValid }));
    }
  }, [state.apiKey]);

  // Pass the API key to the parent component when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.apiKey) {
      onApiKeyChange(state.apiKey);
    } else if (!state.isAuthenticated) {
      onApiKeyChange("");
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
  };

  const toggleShowPassword = () => {
    setState((prevState) => ({
      ...prevState,
      showPassword: !prevState.showPassword,
    }));
  };

  const storeApiKey = async () => {
    try {
      const usePassword = state.password.length > 0;
      await webApiKeyStorage.storeApiKey(
        state.apiKey,
        usePassword ? state.password : undefined
      );

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
                type={state.showPassword ? "text" : "password"}
                value={state.apiKey}
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
                  sx={{ height: "100%" }}
                >
                  Clear Key
                </Button>
              </Grid>
            )}

            {!state.isAuthenticated && (
              <>
                <Grid item xs={12} md={4}>
                  <TextField
                    id="password"
                    label="Password (Optional)"
                    type={state.showPassword ? "text" : "password"}
                    value={state.password}
                    onChange={handlePasswordChange}
                    placeholder="For extra security"
                    fullWidth
                    size="small"
                    variant="outlined"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <LockIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!state.isValid && !state.isStored}
                    fullWidth
                    size="medium"
                    sx={{ height: "100%" }}
                  >
                    {state.isStored ? "Unlock" : "Save"}
                  </Button>
                </Grid>
              </>
            )}
          </Grid>

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
