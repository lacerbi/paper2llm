// AI Summary: Defines core interfaces and types for secure API key storage system.
// Includes provider types, storage options, and encrypted data interfaces.

import { ApiProvider, ApiKeyStorageType, ApiKeyExpiration, ApiKeyStorageOptions } from "../../../types/interfaces";

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
 * Legacy storage keys (for backward compatibility)
 * 
 * Defines the storage keys used in previous versions of the application.
 * These keys are used for migrating data from older versions to the
 * current format, ensuring a smooth upgrade experience.
 */
export interface LegacyStorageKeys {
  legacyStorageKey: string;
  legacyProtectedKey: string;
  legacyStorageTypeKey: string;
  legacyExpirationKey: string;
  legacyExpirationTimeKey: string;
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
