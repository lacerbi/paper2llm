// AI Summary: Defines core interfaces and types for secure API key storage system.
// Includes provider types, storage options, and encrypted data interfaces.

import { ApiProvider, ApiKeyStorageType, ApiKeyExpiration, ApiKeyStorageOptions } from "../../../types/interfaces";

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
 * Provider-specific storage key patterns
 * 
 * Defines the storage key patterns used for different providers.
 * These patterns include placeholders (e.g., {provider}) that are
 * replaced with actual provider names when generating storage keys.
 * 
 * This approach allows the same key structure to be used across
 * different API providers while keeping their data separate.
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
 * Provider-specific validation patterns
 * 
 * Maps API providers to regular expressions that validate their API key formats.
 * Each provider typically has a distinct API key format (e.g., OpenAI keys start
 * with "sk-", while Mistral keys have a different pattern).
 * 
 * These patterns are used to validate API keys before storage and after retrieval.
 */
export type ValidationPatterns = Record<ApiProvider, RegExp>;

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
