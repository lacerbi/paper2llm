// AI Summary: Custom hook for managing API key state including storage, validation, and authentication.
// Handles API key changes, masked display, and provider selection with appropriate state updates.

import { useState, useEffect, useCallback } from 'react';
import { WebApiKeyStorage } from '../../../../adapters/web/api-storage';
import { ApiProvider, ApiKeyStorageType, ApiKeyExpiration } from '../../../../types/interfaces';
import { updateMaskedApiKeys } from '../utils';

// Initialize API key storage instance
const webApiKeyStorage = new WebApiKeyStorage();

/**
 * Custom hook for managing API key state and operations
 */
export const useApiKeyState = (onApiKeyChange: (apiKey: string, provider: ApiProvider) => void) => {
  // API key state
  const [apiKeys, setApiKeys] = useState<Record<ApiProvider, string>>({
    mistral: '',
    openai: '',
  });
  
  // Provider selection state
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>('mistral');
  
  // API key visibility toggle
  const [showApiKeyField, setShowApiKeyField] = useState<boolean>(false);
  
  // Storage and validation states
  const [isStored, setIsStored] = useState<Record<ApiProvider, boolean>>({
    mistral: false,
    openai: false,
  });
  
  const [isValid, setIsValid] = useState<Record<ApiProvider, boolean>>({
    mistral: false,
    openai: false,
  });
  
  const [isAuthenticated, setIsAuthenticated] = useState<Record<ApiProvider, boolean>>({
    mistral: false,
    openai: false,
  });
  
  // Masked API keys for display
  const [maskedApiKeys, setMaskedApiKeys] = useState<Record<ApiProvider, string>>({
    mistral: '',
    openai: '',
  });
  
  // Error state
  const [error, setError] = useState<string | null>(null);

  // Check if any API keys are stored on component mount
  useEffect(() => {
    // Get providers that have stored keys
    const storedProviders = webApiKeyStorage.getStoredProviders();

    // Initialize state based on stored providers
    const newIsStored: Record<ApiProvider, boolean> = {
      mistral: false,
      openai: false,
    };

    const newIsAuthenticated: Record<ApiProvider, boolean> = {
      mistral: false,
      openai: false,
    };

    // Update states for each stored provider
    storedProviders.forEach((provider) => {
      newIsStored[provider] = true;
      // If the key doesn't require password, consider it authenticated
      newIsAuthenticated[provider] = !webApiKeyStorage.isPasswordProtected(provider);
    });

    setIsStored(newIsStored);
    setIsAuthenticated(newIsAuthenticated);

    // Try to retrieve keys that don't require passwords
    storedProviders.forEach((provider) => {
      if (newIsAuthenticated[provider]) {
        retrieveApiKey(provider);
      }
    });
  }, []);

  // Validate API key format whenever it changes
  useEffect(() => {
    const currentKey = apiKeys[selectedProvider];
    if (currentKey) {
      const isValid = webApiKeyStorage.validateApiKey(currentKey, selectedProvider);
      setIsValid((prevState) => ({
        ...prevState,
        [selectedProvider]: isValid,
      }));
    }
  }, [apiKeys, selectedProvider]);

  // Pass the API key to the parent component when authenticated
  useEffect(() => {
    Object.keys(isAuthenticated).forEach((provider) => {
      const typedProvider = provider as ApiProvider;
      if (isAuthenticated[typedProvider] && apiKeys[typedProvider]) {
        onApiKeyChange(apiKeys[typedProvider], typedProvider);

        // Update masked key for display
        setMaskedApiKeys(updateMaskedApiKeys(
          apiKeys,
          isAuthenticated,
          showApiKeyField
        ));
      } else if (!isAuthenticated[typedProvider] && typedProvider === selectedProvider) {
        // Only clear the API key callback if it's the current provider
        onApiKeyChange('', typedProvider);

        setMaskedApiKeys((prev) => ({
          ...prev,
          [typedProvider]: '',
        }));
      }
    });
  }, [isAuthenticated, apiKeys, showApiKeyField, selectedProvider, onApiKeyChange]);

  // Update the masked keys whenever the API key visibility changes
  useEffect(() => {
    setMaskedApiKeys(updateMaskedApiKeys(
      apiKeys,
      isAuthenticated,
      showApiKeyField
    ));
  }, [showApiKeyField, apiKeys, isAuthenticated]);

  // Handle API key changes from input
  const handleApiKeyChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setApiKeys((prevState) => ({
      ...prevState,
      [selectedProvider]: e.target.value,
    }));
    setError(null);
  }, [selectedProvider]);

  // Toggle API key visibility
  const toggleApiKeyVisibility = useCallback(() => {
    setShowApiKeyField((prev) => !prev);
  }, []);

  // Handle provider change from tabs
  const handleProviderChange = useCallback((
    event: React.SyntheticEvent,
    newProvider: ApiProvider
  ) => {
    setSelectedProvider(newProvider);
    setError(null);
  }, []);

  // Retrieve stored API key
  const retrieveApiKey = useCallback(async (
    provider?: ApiProvider,
    password?: string
  ) => {
    const targetProvider = provider || selectedProvider;

    try {
      const apiKey = await webApiKeyStorage.retrieveApiKey(
        password,
        targetProvider
      );

      if (apiKey) {
        setApiKeys((prevState) => ({
          ...prevState,
          [targetProvider]: apiKey,
        }));
        
        setIsAuthenticated((prevState) => ({
          ...prevState,
          [targetProvider]: true,
        }));
        
        setError(null);
        
        return true;
      } else {
        setError('Failed to retrieve API key');
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to retrieve API key';
      setError(errorMessage);
      return false;
    }
  }, [selectedProvider]);

  // Store API key with options
  const storeApiKey = useCallback(async (
    password?: string,
    expiration?: string
  ) => {
    try {
      const options = {
        storageType: (expiration === 'session' ? 'session' : 'local') as ApiKeyStorageType,
        expiration: expiration as ApiKeyExpiration | undefined,
        provider: selectedProvider,
        password: password
      };

      await webApiKeyStorage.storeApiKey(
        apiKeys[selectedProvider],
        options
      );

      setIsStored((prevState) => ({
        ...prevState,
        [selectedProvider]: true,
      }));
      
      setIsAuthenticated((prevState) => ({
        ...prevState,
        [selectedProvider]: true,
      }));
      
      setError(null);
      
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : 'Failed to store API key'
      );
      return false;
    }
  }, [apiKeys, selectedProvider]);

  // Clear API key
  const clearApiKey = useCallback((provider?: ApiProvider) => {
    const targetProvider = provider || selectedProvider;

    webApiKeyStorage.clearApiKey(targetProvider);

    setApiKeys((prevState) => ({
      ...prevState,
      [targetProvider]: '',
    }));
    
    setIsStored((prevState) => ({
      ...prevState,
      [targetProvider]: false,
    }));
    
    setIsValid((prevState) => ({
      ...prevState,
      [targetProvider]: false,
    }));
    
    setIsAuthenticated((prevState) => ({
      ...prevState,
      [targetProvider]: false,
    }));
    
    setMaskedApiKeys((prev) => ({
      ...prev,
      [targetProvider]: '',
    }));
    
    setError(null);
    
    return true;
  }, [selectedProvider]);

  return {
    apiKeys,
    selectedProvider,
    showApiKeyField,
    isStored,
    isValid,
    isAuthenticated,
    maskedApiKeys,
    error,
    setError,
    handleApiKeyChange,
    toggleApiKeyVisibility,
    handleProviderChange,
    retrieveApiKey,
    storeApiKey,
    clearApiKey
  };
};
