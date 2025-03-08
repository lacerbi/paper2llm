// AI Summary: React component for secure Mistral API key management.
// Provides UI for entering, storing, and retrieving API keys with optional password protection.
// Now uses Material UI components for consistent styling.

import React, { useState, useEffect, useCallback } from 'react';
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
  useTheme
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Key as KeyIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { ApiKeyManagerState } from '../../types/interfaces';
import { webApiKeyStorage } from '../../adapters/web/api-storage';

interface ApiKeyManagerProps {
  onApiKeyChange: (apiKey: string) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeyChange }) => {
  const theme = useTheme();
  const [state, setState] = useState<ApiKeyManagerState>({
    apiKey: '',
    password: '',
    showPassword: false,
    isStored: false,
    isValid: false,
    error: null,
    isAuthenticated: false
  });

  // Check if an API key is stored on component mount
  useEffect(() => {
    const isStored = webApiKeyStorage.hasApiKey();
    const isPasswordProtected = isStored ? webApiKeyStorage.isPasswordProtected() : false;
    
    setState(prevState => ({
      ...prevState,
      isStored,
      isAuthenticated: isStored && !isPasswordProtected
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
      setState(prevState => ({ ...prevState, isValid }));
    }
  }, [state.apiKey]);

  // Pass the API key to the parent component when authenticated
  useEffect(() => {
    if (state.isAuthenticated && state.apiKey) {
      onApiKeyChange(state.apiKey);
    } else if (!state.isAuthenticated) {
      onApiKeyChange('');
    }
  }, [state.isAuthenticated, state.apiKey, onApiKeyChange]);

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prevState => ({
      ...prevState,
      apiKey: e.target.value,
      error: null
    }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setState(prevState => ({
      ...prevState,
      password: e.target.value,
      error: null
    }));
  };

  const toggleShowPassword = () => {
    setState(prevState => ({
      ...prevState,
      showPassword: !prevState.showPassword
    }));
  };

  const storeApiKey = async () => {
    try {
      const usePassword = state.password.length > 0;
      await webApiKeyStorage.storeApiKey(
        state.apiKey,
        usePassword ? state.password : undefined
      );
      
      setState(prevState => ({
        ...prevState,
        isStored: true,
        isAuthenticated: true,
        error: null
      }));
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Failed to store API key'
      }));
    }
  };

  const retrieveApiKey = useCallback(async () => {
    try {
      const apiKey = await webApiKeyStorage.retrieveApiKey(
        webApiKeyStorage.isPasswordProtected() ? state.password : undefined
      );
      
      if (apiKey) {
        setState(prevState => ({
          ...prevState,
          apiKey,
          isAuthenticated: true,
          error: null
        }));
      } else {
        setState(prevState => ({
          ...prevState,
          error: 'Failed to retrieve API key'
        }));
      }
    } catch (error) {
      setState(prevState => ({
        ...prevState,
        error: error instanceof Error ? error.message : 'Failed to retrieve API key'
      }));
    }
  }, [state.password]);

  const clearApiKey = () => {
    webApiKeyStorage.clearApiKey();
    setState({
      apiKey: '',
      password: '',
      showPassword: false,
      isStored: false,
      isValid: false,
      error: null,
      isAuthenticated: false
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
    <Box sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <KeyIcon sx={{ mr: 1, color: 'primary.main' }} />
        <Typography variant="h5" component="h2">
          Mistral API Key
        </Typography>
      </Box>
      
      {!state.isStored || state.isAuthenticated ? (
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <TextField
              id="apiKey"
              label="API Key"
              type={state.showPassword ? 'text' : 'password'}
              value={state.apiKey}
              onChange={handleApiKeyChange}
              placeholder="Enter your Mistral API key"
              disabled={state.isAuthenticated}
              required
              fullWidth
              variant="outlined"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={toggleShowPassword}
                      edge="end"
                    >
                      {state.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />
            {state.isAuthenticated ? (
              <Alert severity="success" sx={{ mt: 1 }}>
                API key is active and ready to use
              </Alert>
            ) : (
              <FormHelperText>
                You can get your API key from the Mistral AI dashboard
              </FormHelperText>
            )}
          </FormControl>

          {!state.isAuthenticated && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                id="password"
                label="Password (Optional)"
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Password for additional encryption"
                fullWidth
                variant="outlined"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <LockIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                      >
                        {state.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <FormHelperText>
                Adding a password provides an extra layer of security
              </FormHelperText>
            </FormControl>
          )}

          {state.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {state.error}
            </Alert>
          )}

          {!state.isAuthenticated && (
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={!state.isValid && !state.isStored}
              fullWidth
              sx={{ mb: 2 }}
            >
              {state.isStored ? 'Unlock API Key' : 'Save API Key'}
            </Button>
          )}
        </Box>
      ) : (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            mb: 2, 
            borderLeft: '4px solid', 
            borderColor: 'info.main' 
          }}
        >
          <Typography variant="h6" gutterBottom>
            Your API key is password-protected
          </Typography>
          <Typography paragraph>
            Enter your password to unlock it
          </Typography>
          
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <TextField
                id="password"
                label="Password"
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                required
                fullWidth
                variant="outlined"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        aria-label="toggle password visibility"
                        onClick={toggleShowPassword}
                        edge="end"
                      >
                        {state.showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </FormControl>
            
            {state.error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {state.error}
              </Alert>
            )}
            
            <Button 
              type="submit" 
              variant="contained" 
              color="primary"
              fullWidth
            >
              Unlock
            </Button>
          </Box>
        </Paper>
      )}

      {state.isAuthenticated && (
        <Box sx={{ mt: 2 }}>
          <Divider sx={{ mb: 2 }} />
          <Button 
            onClick={clearApiKey} 
            variant="outlined"
            color="error"
            size="small"
          >
            Clear API Key
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default ApiKeyManager;
