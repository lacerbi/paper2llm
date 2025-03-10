// AI Summary: React component for secure API key management across multiple providers.
// Orchestrates UI components and hooks for handling API key storage, validation, and user interaction.
// Implements password protection, lockout mechanism, and multiple storage options.

import React, { useEffect } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Stack,
  Chip,
  SelectChangeEvent,
  CircularProgress,
} from "@mui/material";
import {
  Key as KeyIcon,
  Check as CheckIcon,
} from "@mui/icons-material";
import { ApiProvider } from "../../adapters/web/api-storage";
import { WebApiKeyStorage } from "../../adapters/web/api-storage";

// Import types, constants, and custom hooks
import { ApiKeyManagerProps } from "./api-key-manager/types";
import { PROVIDER_INFO } from "./api-key-manager/constants";
import { canSubmitForm } from "./api-key-manager/utils";
import { 
  useApiKeyState, 
  usePasswordState, 
  useSecurityOptions 
} from "./api-key-manager/hooks";

// Import UI components
import ProviderTabs from "./api-key-manager/ProviderTabs";
import ApiKeyInput from "./api-key-manager/ApiKeyInput";
import PasswordField from "./api-key-manager/PasswordField";
import SecurityOptions from "./api-key-manager/SecurityOptions";
import StatusDisplay from "./api-key-manager/StatusDisplay";
import ErrorMessage from "./api-key-manager/ErrorMessage";

// Create an instance of the WebApiKeyStorage
const webApiKeyStorage = new WebApiKeyStorage();

/**
 * Component for managing API keys with secure storage and retrieval
 */
const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeyChange }) => {
  // Use custom hooks for state management
  const apiKeyState = useApiKeyState(onApiKeyChange);
  const securityState = useSecurityOptions();
  const passwordState = usePasswordState(securityState.expiration);

  // Get the current provider info
  const currentProvider = apiKeyState.selectedProvider;
  const currentProviderInfo = PROVIDER_INFO[currentProvider];

  // Load existing expiration preference if available
  useEffect(() => {
    const storedProviders = webApiKeyStorage.getStoredProviders();
    if (storedProviders.length > 0) {
      const provider = storedProviders[0]; // Use first provider for expiration
      const savedExpiration = webApiKeyStorage.getExpiration(provider);
      if (savedExpiration) {
        securityState.setExpiration(savedExpiration);
      }
    }
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    securityState.setIsProcessing(true);

    try {
      if (
        apiKeyState.isStored[currentProvider] &&
        !apiKeyState.isAuthenticated[currentProvider]
      ) {
        // User is trying to access a stored key
        const success = await apiKeyState.retrieveApiKey(
          currentProvider,
          passwordState.password
        );
        
        if (success) {
          securityState.resetSecurityState();
        } else {
          const lockMessage = securityState.applyTemporaryLock();
          if (lockMessage) {
            apiKeyState.setError(lockMessage);
          }
        }
      } else {
        // User is trying to store a new key
        if (!passwordState.validatePasswordRequirements()) {
          apiKeyState.setError(
            passwordState.passwordError || 
            "Password does not meet the security requirements"
          );
          securityState.setIsProcessing(false);
          return;
        }
        
        const success = await apiKeyState.storeApiKey(
          passwordState.password,
          securityState.expiration
        );
        
        if (success) {
          securityState.resetSecurityState();
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred";
      apiKeyState.setError(errorMessage);
      
      // Apply lock if it looks like a password error
      if (
        errorMessage.includes("password") ||
        errorMessage.includes("Password") ||
        errorMessage.includes("incorrect")
      ) {
        const lockMessage = securityState.applyTemporaryLock();
        if (lockMessage) {
          apiKeyState.setError(lockMessage);
        }
      }
    } finally {
      securityState.setIsProcessing(false);
    }
  };

  // Determine if form can be submitted
  const canSubmit = () => {
    return canSubmitForm(
      currentProvider,
      apiKeyState.apiKeys,
      apiKeyState.isStored,
      apiKeyState.isAuthenticated,
      apiKeyState.isValid,
      passwordState.password,
      securityState.expiration,
      passwordState.passwordError,
      securityState.isLocked,
      securityState.isProcessing,
      webApiKeyStorage.isPasswordProtected.bind(webApiKeyStorage)
    );
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

        {Object.keys(apiKeyState.isAuthenticated).some(
          (p) => apiKeyState.isAuthenticated[p as ApiProvider]
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
      <ProviderTabs
        currentProvider={currentProvider}
        isAuthenticated={apiKeyState.isAuthenticated}
        onProviderChange={apiKeyState.handleProviderChange}
      />

      {!apiKeyState.isStored[currentProvider] ||
      apiKeyState.isAuthenticated[currentProvider] ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid
              item
              xs={12}
              md={apiKeyState.isAuthenticated[currentProvider] ? 10 : 6}
            >
              <ApiKeyInput
                provider={currentProvider}
                providerInfo={currentProviderInfo}
                apiKey={apiKeyState.apiKeys[currentProvider]}
                maskedApiKey={apiKeyState.maskedApiKeys[currentProvider]}
                isAuthenticated={apiKeyState.isAuthenticated[currentProvider]}
                showApiKeyField={apiKeyState.showApiKeyField}
                isLocked={securityState.isLocked}
                onChange={apiKeyState.handleApiKeyChange}
                onToggleVisibility={apiKeyState.toggleApiKeyVisibility}
              />
            </Grid>

            {apiKeyState.isAuthenticated[currentProvider] && (
              <Grid item xs={12} md={2}>
                <Button
                  onClick={() => apiKeyState.clearApiKey()}
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

            {!apiKeyState.isAuthenticated[currentProvider] && (
              <>
                <Grid item xs={12} md={4}>
                  <PasswordField
                    password={passwordState.password}
                    showPasswordField={passwordState.showPasswordField}
                    expiration={securityState.expiration}
                    passwordError={passwordState.passwordError}
                    error={apiKeyState.error}
                    isLocked={securityState.isLocked}
                    onChange={passwordState.handlePasswordChange}
                    onToggleVisibility={passwordState.togglePasswordVisibility}
                  />
                </Grid>

                <Grid item xs={12} md={2}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={!canSubmit() || securityState.isLocked || securityState.isProcessing}
                    fullWidth
                    size="small"
                    sx={{
                      height: "40px",
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    {securityState.isProcessing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : apiKeyState.isStored[currentProvider] ? (
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
          {!apiKeyState.isAuthenticated[currentProvider] && (
            <SecurityOptions
              expiration={securityState.expiration}
              password={passwordState.password}
              passwordError={passwordState.passwordError}
              isLocked={securityState.isLocked}
              onExpirationChange={securityState.handleExpirationChange}
            />
          )}

          {/* Error messages */}
          <ErrorMessage
            error={apiKeyState.error}
            isLocked={securityState.isLocked}
            lockCountdown={securityState.lockCountdown}
            password={passwordState.password}
            passwordError={passwordState.passwordError}
            isPasswordProtected={webApiKeyStorage.isPasswordProtected.bind(webApiKeyStorage)}
            currentProvider={currentProvider}
            canSubmit={canSubmit()}
          />
        </Box>
      ) : (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 1,
            borderLeft: "4px solid",
            borderColor: apiKeyState.error ? "error.main" : "info.main",
          }}
        >
          <Typography variant="subtitle1" sx={{ mb: 0.5 }}>
            Enter password to unlock your {currentProviderInfo.name} API key
          </Typography>
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} md={8}>
              <PasswordField
                password={passwordState.password}
                showPasswordField={passwordState.showPasswordField}
                expiration={securityState.expiration}
                passwordError={passwordState.passwordError}
                error={apiKeyState.error}
                isLocked={securityState.isLocked}
                onChange={passwordState.handlePasswordChange}
                onToggleVisibility={passwordState.togglePasswordVisibility}
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
                    disabled={!canSubmit() || securityState.isLocked || securityState.isProcessing}
                  >
                    {securityState.isProcessing ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      "Unlock"
                    )}
                  </Button>
                </Grid>
                <Grid item xs={6}>
                  <Button
                    onClick={() => apiKeyState.clearApiKey()}
                    variant="outlined"
                    color="error"
                    fullWidth
                    sx={{ height: "40px" }}
                    disabled={securityState.isProcessing}
                  >
                    Clear Key
                  </Button>
                </Grid>
              </Grid>
            </Grid>
          </Grid>

          {/* Error messages for password screen */}
          <ErrorMessage
            error={apiKeyState.error}
            isLocked={securityState.isLocked}
            lockCountdown={securityState.lockCountdown}
            password={passwordState.password}
            passwordError={passwordState.passwordError}
            isPasswordProtected={webApiKeyStorage.isPasswordProtected.bind(webApiKeyStorage)}
            currentProvider={currentProvider}
            canSubmit={canSubmit()}
          />
        </Paper>
      )}

      {/* Provider key status summary */}
      <StatusDisplay isAuthenticated={apiKeyState.isAuthenticated} />
    </Box>
  );
};

export default ApiKeyManager;
