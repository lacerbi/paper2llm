// AI Summary: Defines TypeScript interfaces for the ApiKeyManager component.
// Includes props, state management interfaces, and component-specific types.

import { ApiProvider, ApiKeyExpiration } from "../../../types/interfaces";

/**
 * Props for the ApiKeyManager component
 */
export interface ApiKeyManagerProps {
  /**
   * Callback fired when an API key changes
   * @param apiKey The new API key value
   * @param provider The provider for which the API key changed
   */
  onApiKeyChange: (apiKey: string, provider: ApiProvider) => void;
}

/**
 * State interface for the ApiKeyManager component
 */
export interface ApiKeyManagerState {
  apiKeys: Record<ApiProvider, string>;
  selectedProvider: ApiProvider;
  password: string;
  showPasswordField: boolean;
  showApiKeyField: boolean;
  isStored: Record<ApiProvider, boolean>;
  isValid: Record<ApiProvider, boolean>;
  error: string | null;
  isAuthenticated: Record<ApiProvider, boolean>;
}

/**
 * Type for API key display mode (masked or partially masked)
 */
export type MaskedApiKeys = Record<ApiProvider, string>;

/**
 * Security options state interface
 */
export interface SecurityOptionsState {
  expiration: ApiKeyExpiration;
  passwordError: string | null;
  isLocked: boolean;
  lockCountdown: number;
  incorrectAttempts: number;
  isProcessing: boolean;
}
