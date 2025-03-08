// AI Summary: React component for secure Mistral API key management.
// Provides UI for entering, storing, and retrieving API keys with optional password protection.

import React, { useState, useEffect, useCallback } from 'react';
import { ApiKeyManagerState } from '../../types/interfaces';
import { webApiKeyStorage } from '../../adapters/web/api-storage';

interface ApiKeyManagerProps {
  onApiKeyChange: (apiKey: string) => void;
}

const ApiKeyManager: React.FC<ApiKeyManagerProps> = ({ onApiKeyChange }) => {
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
    <div className="api-key-manager">
      <h2>Mistral API Key</h2>
      
      {!state.isStored || state.isAuthenticated ? (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="apiKey">API Key</label>
            <div className="input-wrapper">
              <input
                id="apiKey"
                type={state.showPassword ? 'text' : 'password'}
                value={state.apiKey}
                onChange={handleApiKeyChange}
                placeholder="Enter your Mistral API key"
                disabled={state.isAuthenticated}
                required
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="toggle-password"
              >
                {state.showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {state.isAuthenticated ? (
              <p className="info-text">API key is active and ready to use.</p>
            ) : (
              <p className="help-text">
                You can get your API key from the Mistral AI dashboard.
              </p>
            )}
          </div>

          {!state.isAuthenticated && (
            <div className="form-group">
              <label htmlFor="password">Password (Optional)</label>
              <input
                id="password"
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Password for additional encryption"
              />
              <p className="help-text">
                Adding a password provides an extra layer of security.
              </p>
            </div>
          )}

          {state.error && <div className="error-message">{state.error}</div>}

          {!state.isAuthenticated && (
            <button
              type="submit"
              className="primary-button"
              disabled={!state.isValid && !state.isStored}
            >
              {state.isStored ? 'Unlock API Key' : 'Save API Key'}
            </button>
          )}
        </form>
      ) : (
        <div className="password-prompt">
          <p>Your API key is password-protected. Enter your password to unlock it.</p>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type={state.showPassword ? 'text' : 'password'}
                value={state.password}
                onChange={handlePasswordChange}
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={toggleShowPassword}
                className="toggle-password"
              >
                {state.showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            {state.error && <div className="error-message">{state.error}</div>}
            <button type="submit" className="primary-button">
              Unlock
            </button>
          </form>
        </div>
      )}

      {state.isAuthenticated && (
        <button onClick={clearApiKey} className="secondary-button">
          Clear API Key
        </button>
      )}
    </div>
  );
};

export default ApiKeyManager;
