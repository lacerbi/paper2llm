// AI Summary: Defines core interfaces and types for secure API key storage system.
// Includes provider types, storage options, and encrypted data interfaces.

import {
  ApiProvider,
  ApiKeyStorageType,
  ApiKeyExpiration,
  ApiKeyStorageOptions,
} from "../../../types/interfaces";

/**
 * Provider-specific API key interface
 *
 * This interface defines the contract for provider-specific implementations
 * that handle validation, storage patterns, and other provider-specific logic.
 * Each API provider (Mistral, OpenAI, etc.) will have its own implementation.
 */
export interface ApiKeyProvider {
  /**
   * Gets the provider identifier
   */
  getProviderId(): ApiProvider;

  /**
   * Validates if an API key has the correct format for this provider
   *
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean;

  /**
   * Gets the storage key for this provider
   *
   * @param basePattern The base pattern to use
   * @returns The storage key for this provider
   */
  getStorageKey(basePattern: string): string;

  /**
   * Gets the protected key for this provider
   *
   * @param basePattern The base pattern to use
   * @returns The protected key for this provider
   */
  getProtectedKey(basePattern: string): string;

  /**
   * Gets the storage type key for this provider
   *
   * @param basePattern The base pattern to use
   * @returns The storage type key for this provider
   */
  getStorageTypeKey(basePattern: string): string;

  /**
   * Gets the expiration key for this provider
   *
   * @param basePattern The base pattern to use
   * @returns The expiration key for this provider
   */
  getExpirationKey(basePattern: string): string;

  /**
   * Gets the expiration time key for this provider
   *
   * @param basePattern The base pattern to use
   * @returns The expiration time key for this provider
   */
  getExpirationTimeKey(basePattern: string): string;
}

/**
 * Storage format for encrypted API keys
 *
 * This interface defines the structure used to store encrypted API keys securely.
 * It includes:
 * - The encrypted API key itself (XOR encrypted and Base64 encoded)
 * - Validation data to verify correct password during decryption
 * - Version information for handling migrations
 * - Provider information to support multiple API services
 *
 * This structure is serialized to JSON and Base64 encoded before storage.
 */
export interface EncryptedKeyData {
  encryptedKey: string; // Base64 encoded XOR-encrypted API key
  validation: string; // Base64 encoded HMAC for validation
  version: number; // Storage format version for migrations
  provider?: ApiProvider; // Provider identifier (added in version 3)
}

/**
 * Structure for validation info stored within encrypted data
 *
 * Contains the validation components used to verify that decryption
 * was performed with the correct password:
 * - salt: A random value used to prevent rainbow table attacks
 * - hmac: A keyed hash that validates the decryption was successful
 */
export interface ValidationInfo {
  salt: string;
  hmac: string;
}

/**
 * Base storage key patterns
 *
 * Defines the base storage key patterns used for different operations.
 * These patterns act as templates that are combined with provider information
 * to generate the final storage keys.
 *
 * Provider-specific implementations will use these patterns to generate
 * their unique storage keys, ensuring consistent naming across providers.
 */
export interface StorageKeyPatterns {
  storageKeyPattern: string;
  protectedKeyPattern: string;
  storageTypeKeyPattern: string;
  expirationKeyPattern: string;
  expirationTimeKeyPattern: string;
}

/**
 * Factory for creating StorageKeyPatterns
 *
 * Provides consistent storage key patterns for the application.
 */
export function createDefaultStorageKeyPatterns(): StorageKeyPatterns {
  return {
    storageKeyPattern: "paper2llm_api_key_{provider}",
    protectedKeyPattern: "paper2llm_api_key_{provider}_protected",
    storageTypeKeyPattern: "paper2llm_storage_type_{provider}",
    expirationKeyPattern: "paper2llm_api_key_{provider}_expiration",
    expirationTimeKeyPattern: "paper2llm_api_key_{provider}_expiration_time",
  };
}

/**
 * Expiration durations in milliseconds
 * 
 * Maps expiration types to their corresponding durations in milliseconds.
 * These durations determine how long an API key remains valid before it
 * automatically expires and needs to be re-entered.
 * 
 * Special values:
 * - 0 for "never" means no expiration
 * - 0 for "session" means the key expires when the browser session ends
 */
export type ExpirationDurations = Record<ApiKeyExpiration, number>;

/**
 * Interface for expiration service
 * 
 * Defines methods for managing API key expiration
 */
export interface ExpirationService {
  /**
   * Gets the expiration setting for the stored API key
   * 
   * @param provider Provider to check
   * @param defaultProviderId Default provider ID
   * @returns The expiration setting or null if no key is stored
   */
  getExpiration(
    provider: ApiProvider,
    defaultProviderId: ApiProvider
  ): ApiKeyExpiration | null;
  
  /**
   * Checks if the stored API key has expired
   * 
   * @param provider Provider to check
   * @param storageType Storage type being used
   * @param defaultProviderId Default provider ID
   * @returns true if the API key has expired, false otherwise
   */
  hasExpired(
    provider: ApiProvider, 
    storageType: string | null,
    defaultProviderId: ApiProvider
  ): boolean;
  
  /**
   * Calculate an expiration timestamp based on the expiration type
   * 
   * @param expiration The expiration type to calculate
   * @returns A timestamp in milliseconds or null for never/session
   */
  calculateExpirationTime(expiration: ApiKeyExpiration): number | null;
}

/**
 * Interface for storage operations service
 * 
 * Defines methods for storage management and key pattern handling
 * used by the API key storage system.
 */
export interface StorageOperations {
  /**
   * Gets the appropriate storage based on the storage type
   * 
   * @param storageType The storage type to use (local or session)
   * @returns The corresponding Storage object
   */
  getStorage(storageType?: ApiKeyStorageType): Storage;

  /**
   * Gets a value from storage for a specific provider
   * 
   * @param key The base key pattern to use
   * @param provider The provider to get the value for
   * @param storageType The storage type to use
   * @returns The stored value or null if not found
   */
  getValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    storageType?: ApiKeyStorageType | null
  ): string | null;

  /**
   * Sets a value in storage for a specific provider
   * 
   * @param key The base key pattern to use
   * @param value The value to store
   * @param provider The provider to set the value for
   * @param storageType The storage type to use
   */
  setValue(
    key: keyof StorageKeyPatterns,
    value: string,
    provider: ApiProvider,
    storageType?: ApiKeyStorageType
  ): void;

  /**
   * Removes a value from storage for a specific provider
   * 
   * @param key The base key pattern to use
   * @param provider The provider to remove the value for
   * @param fromLocal Whether to remove from localStorage
   * @param fromSession Whether to remove from sessionStorage
   */
  removeValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    fromLocal?: boolean,
    fromSession?: boolean
  ): void;

  /**
   * Checks if a value exists in storage for a specific provider
   * 
   * @param key The base key pattern to use
   * @param provider The provider to check
   * @param checkLocal Whether to check localStorage
   * @param checkSession Whether to check sessionStorage
   * @returns true if value exists, false otherwise
   */
  hasValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    checkLocal?: boolean,
    checkSession?: boolean
  ): boolean;
  
  /**
   * Gets the storage type for a provider
   * 
   * @param provider Provider to check
   * @returns Storage type or null if not found
   */
  getStorageTypeForProvider(provider: ApiProvider): string | null;
}

/**
 * Provider Registry Interface
 *
 * Defines the contract for a registry that manages provider implementations.
 * The registry acts as a central point for accessing provider-specific functionality,
 * allowing the main storage class to delegate operations to the appropriate provider.
 */
export interface ProviderRegistry {
  /**
   * Registers a provider implementation
   *
   * @param provider The provider implementation to register
   */
  registerProvider(provider: ApiKeyProvider): void;

  /**
   * Gets a provider implementation by its identifier
   *
   * @param providerId The provider identifier
   * @returns The provider implementation or null if not found
   */
  getProvider(providerId: ApiProvider): ApiKeyProvider | null;

  /**
   * Gets all registered providers
   *
   * @returns Array of provider implementations
   */
  getAllProviders(): ApiKeyProvider[];

  /**
   * Gets the default provider
   *
   * @returns The default provider implementation
   */
  getDefaultProvider(): ApiKeyProvider;
  
  /**
   * Gets the default provider ID
   *
   * @returns The default provider ID
   */
  getDefaultProviderId(): ApiProvider;
}
