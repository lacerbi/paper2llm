// AI Summary: React component for secure Mistral API key management.
// Provides UI for entering, storing, and retrieving API keys with password protection,
// storage type selection, and expiration options.

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
} from "@mui/icons-material";
import { ApiKeyManagerState, ApiKeyStorageOptions, ApiKeyExpiration } from "../../types/interfaces";
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

  // New state for security options
  const [useSessionStorage, setUseSessionStorage] = useState<boolean>(false);
  const [expiration, setExpiration] = useState<ApiKeyExpiration>("never");
  const [showSecurityInfo, setShowSecurityInfo] = useState<boolean>(false);

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

    // Load existing storage preferences if available
    if (isStored) {
      const storageType = webApiKeyStorage.getStorageType();
      const savedExpiration = webApiKeyStorage.getExpiration();
      
      if (storageType) {
        setUseSessionStorage(storageType === 'session');
      }
      
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

  const handleStorageTypeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseSessionStorage(event.target.checked);
  };

  const handleExpirationChange = (event: SelectChangeEvent) => {
    setExpiration(event.target.value as ApiKeyExpiration);
  };

  const toggleSecurityInfo = () => {
    setShowSecurityInfo(prev => !prev);
  };

  const storeApiKey = async () => {
    try {
      const usePassword = state.password.length > 0;
      const options: ApiKeyStorageOptions = {
        storageType: useSessionStorage ? 'session' : 'local',
        expiration: expiration,
      };
      
      if (usePassword) {
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
    setUseSessionStorage(false);
    setExpiration("never");
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

          {/* Security Options (only shown when not authenticated) */}
          {!state.isAuthenticated && (
            <Box sx={{ mt: 2, mb: 1 }}>
              <Stack 
                direction="row" 
                alignItems="center" 
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Typography variant="subtitle2">
                  Security Options
                </Typography>
                <Tooltip title="Click for more information about security options">
                  <IconButton 
                    size="small" 
                    color="primary"
                    onClick={toggleSecurityInfo}
                  >
                    <InfoIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
              
              {showSecurityInfo && (
                <Alert 
                  severity="info" 
                  sx={{ mb: 2 }}
                  onClose={toggleSecurityInfo}
                >
                  <AlertTitle>Security Information</AlertTitle>
                  <Typography variant="body2" paragraph>
                    <strong>Session storage:</strong> API key will be cleared when you close your browser.
                  </Typography>
                  <Typography variant="body2" paragraph>
                    <strong>Local storage:</strong> API key will persist between browser sessions.
                  </Typography>
                  <Typography variant="body2">
                    <strong>Expiration:</strong> Determines when stored API keys are automatically cleared.
                  </Typography>
                </Alert>
              )}
              
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={useSessionStorage}
                        onChange={handleStorageTypeChange}
                        name="sessionStorage"
                        color="primary"
                        size="small"
                      />
                    }
                    label={
                      <Typography variant="body2">
                        Session only (cleared when browser closes)
                      </Typography>
                    }
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">
                      Expiration:
                    </Typography>
                    <Select
                      value={expiration}
                      onChange={handleExpirationChange}
                      size="small"
                      disabled={useSessionStorage}
                      sx={{ minWidth: 120 }}
                    >
                      <MenuItem value="session">Session</MenuItem>
                      <MenuItem value="1day">1 Day</MenuItem>
                      <MenuItem value="7days">7 Days</MenuItem>
                      <MenuItem value="30days">30 Days</MenuItem>
                      <MenuItem value="never">Never</MenuItem>
                    </Select>
                  </Stack>
                </Grid>
              </Grid>
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
