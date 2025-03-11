// AI Summary: Defines public interfaces for secure API key storage system.
// Includes provider types, storage options, and API key management interface.
// Serves as the public API for the api-storage module.

/**
 * Supported API providers
 */
export type ApiProvider = 'mistral' | 'openai' | 'gemini';

/**
 * Storage type for API keys
 */
export type ApiKeyStorageType = 'local' | 'session';

/**
 * Expiration options for API keys
 */
export type ApiKeyExpiration = 'session' | '1day' | '7days' | '30days' | 'never';

/**
 * Options for storing API keys
 */
export interface ApiKeyStorageOptions {
  password?: string;
  storageType?: ApiKeyStorageType;
  expiration?: ApiKeyExpiration;
  provider?: ApiProvider;
}

/**
 * Interface for API key storage and management
 */
export interface ApiKeyStorage {
  /**
   * Securely stores an API key with options for storage type and expiration
   */
  storeApiKey(apiKey: string, options?: ApiKeyStorageOptions): Promise<void>;
  
  /**
   * Retrieves a stored API key
   * @param password Optional password for decryption
   * @param provider Optional provider to retrieve key for (defaults to default provider)
   */
  retrieveApiKey(password?: string, provider?: ApiProvider): Promise<string | null>;
  
  /**
   * Checks if an API key is stored
   * @param provider Optional provider to check (if not specified, checks any provider)
   */
  hasApiKey(provider?: ApiProvider): boolean;
  
  /**
   * Validates if an API key has the correct format
   * @param apiKey The API key to validate
   * @param provider Optional provider to validate format against (defaults to default provider)
   */
  validateApiKey(apiKey: string, provider?: ApiProvider): boolean;
  
  /**
   * Removes the stored API key
   * @param provider Optional provider to clear (if not specified, clears all)
   */
  clearApiKey(provider?: ApiProvider): void;
  
  /**
   * Gets the storage type being used for the API key
   * @param provider Optional provider to check (defaults to default provider)
   */
  getStorageType(provider?: ApiProvider): ApiKeyStorageType | null;
  
  /**
   * Gets the expiration setting for the stored API key
   * @param provider Optional provider to check (defaults to default provider)
   */
  getExpiration(provider?: ApiProvider): ApiKeyExpiration | null;
  
  /**
   * Checks if the stored API key has expired
   * @param provider Optional provider to check (defaults to default provider)
   */
  hasExpired(provider?: ApiProvider): boolean;
  
  /**
   * Gets all providers that have stored API keys
   */
  getStoredProviders(): ApiProvider[];

  /**
   * Checks if API key is password protected
   * @param provider Optional provider to check (defaults to default provider)
   */
  isPasswordProtected(provider?: ApiProvider): boolean;
}
