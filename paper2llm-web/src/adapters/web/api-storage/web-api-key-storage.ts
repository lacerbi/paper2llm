// AI Summary: Implements secure API key storage for multiple providers using provider registry system.
// Delegates provider-specific operations to provider implementations while maintaining
// backward compatibility with legacy storage. Supports multiple storage locations, expiration
// options, and password protection with improved security and maintainability.

import {
  ApiKeyStorage,
  ApiKeyStorageType,
  ApiKeyExpiration,
  ApiKeyStorageOptions,
  ApiProvider,
} from "../../../types/interfaces";

import { ApiKeyStorageError } from "./errors";
import { 
  ProviderRegistry,
  ExpirationDurations,
  StorageKeyPatterns,
  LegacyStorageKeys,
  ApiKeyProvider
} from "./interfaces";
import { passwordValidation } from "./password-utils";
import { encryptionUtils } from "./encryption-utils";
import { WebProviderRegistry } from "./provider-registry";
import { createDefaultProviders } from "./providers";

/**
 * Implements the ApiKeyStorage interface for web browsers
 * using localStorage or sessionStorage with encryption for secure storage
 * 
 * WebApiKeyStorage provides a comprehensive solution for securely storing
 * and retrieving API keys in browser environments with these key features:
 * 
 * - Support for multiple API providers (Mistral, OpenAI, etc.)
 * - Secure encryption with password protection for persistent storage
 * - Session-based auto-generated keys for temporary storage
 * - Configurable expiration policies
 * - Migration from legacy storage formats
 * - Validation of API key formats and decryption integrity
 * 
 * This implementation uses a provider registry system to delegate
 * provider-specific operations to appropriate provider implementations,
 * making it easy to add support for new API providers.
 */
export class WebApiKeyStorage implements ApiKeyStorage {
  // Provider registry for managing provider-specific functionality
  private readonly providerRegistry: ProviderRegistry;

  // Storage key patterns (with {provider} placeholder)
  private readonly keyPatterns: StorageKeyPatterns = {
    storageKeyPattern: "paper2llm_api_key_{provider}",
    protectedKeyPattern: "paper2llm_api_key_{provider}_protected",
    storageTypeKeyPattern: "paper2llm_storage_type_{provider}",
    expirationKeyPattern: "paper2llm_api_key_{provider}_expiration",
    expirationTimeKeyPattern: "paper2llm_api_key_{provider}_expiration_time"
  };

  // Legacy storage keys (for backward compatibility)
  private readonly legacyKeys: LegacyStorageKeys = {
    legacyStorageKey: "paper2llm_api_key",
    legacyProtectedKey: "paper2llm_api_key_protected",
    legacyStorageTypeKey: "paper2llm_storage_type",
    legacyExpirationKey: "paper2llm_api_key_expiration",
    legacyExpirationTimeKey: "paper2llm_api_key_expiration_time"
  };

  private readonly storageVersion = 3; // Increment when storage format changes

  // Expiration durations in milliseconds
  private readonly expirationDurations: ExpirationDurations = {
    session: 0, // Session expiration is handled by sessionStorage
    "1day": 24 * 60 * 60 * 1000,
    "7days": 7 * 24 * 60 * 60 * 1000,
    "30days": 30 * 24 * 60 * 60 * 1000,
    never: 0, // No expiration
  };

  /**
   * Creates a new WebApiKeyStorage instance
   * 
   * Initializes the provider registry with default provider implementations
   * and performs legacy key migration if needed.
   * 
   * @param defaultProvider Optional default provider ID (defaults to "mistral")
   */
  constructor(defaultProvider: ApiProvider = "mistral") {
    // Initialize provider registry with default providers
    this.providerRegistry = new WebProviderRegistry(defaultProvider);
    
    // Register all default providers
    const providers = createDefaultProviders();
    for (const provider of providers) {
      this.providerRegistry.registerProvider(provider);
    }
    
    // Check for and migrate legacy keys if needed
    this.checkAndMigrateLegacyKey();
  }

  /**
   * Gets the appropriate storage based on the storage type
   * 
   * Returns either localStorage or sessionStorage based on the requested type.
   * This provides a consistent interface for working with both storage types.
   * 
   * @param storageType The storage type to use (local or session)
   * @returns The corresponding Storage object
   */
  private getStorage(storageType: ApiKeyStorageType = "local"): Storage {
    return storageType === "local" ? localStorage : sessionStorage;
  }

  /**
   * Checks if legacy key exists and migrates it to the new format
   * 
   * This method detects if API keys are stored in the legacy format (prior to
   * multi-provider support) and migrates them to the new format automatically.
   * 
   * The migration preserves all metadata including:
   * - Whether the key is password protected
   * - The storage type being used
   * - Expiration settings and times
   * 
   * This ensures backward compatibility with existing stored keys while
   * enabling the new multi-provider functionality.
   */
  private checkAndMigrateLegacyKey(): void {
    const legacyKey =
      localStorage.getItem(this.legacyKeys.legacyStorageKey) ||
      sessionStorage.getItem(this.legacyKeys.legacyStorageKey);

    if (legacyKey) {
      // Get all the legacy metadata
      let storage: Storage | null = null;

      if (localStorage.getItem(this.legacyKeys.legacyStorageKey)) {
        storage = localStorage;
      } else if (sessionStorage.getItem(this.legacyKeys.legacyStorageKey)) {
        storage = sessionStorage;
      }

      if (storage) {
        const defaultProvider = this.providerRegistry.getDefaultProvider();
        const providerId = defaultProvider.getProviderId();
        
        const isProtected = storage.getItem(this.legacyKeys.legacyProtectedKey) === "true";
        const storageType =
          (storage.getItem(this.legacyKeys.legacyStorageTypeKey) as ApiKeyStorageType) ||
          "local";
        const expiration =
          (storage.getItem(this.legacyKeys.legacyExpirationKey) as ApiKeyExpiration) ||
          "never";
        const expirationTime = storage.getItem(this.legacyKeys.legacyExpirationTimeKey);

        // Get provider-specific storage keys
        const mistralStorageKey = defaultProvider.getStorageKey(this.keyPatterns.storageKeyPattern);
        const mistralProtectedKey = defaultProvider.getProtectedKey(this.keyPatterns.protectedKeyPattern);
        const mistralStorageTypeKey = defaultProvider.getStorageTypeKey(this.keyPatterns.storageTypeKeyPattern);
        const mistralExpirationKey = defaultProvider.getExpirationKey(this.keyPatterns.expirationKeyPattern);
        const mistralExpirationTimeKey = defaultProvider.getExpirationTimeKey(this.keyPatterns.expirationTimeKeyPattern);

        // Move the legacy data to provider-specific keys
        storage.setItem(mistralStorageKey, legacyKey);
        storage.setItem(mistralProtectedKey, isProtected ? "true" : "false");
        storage.setItem(mistralStorageTypeKey, storageType);
        storage.setItem(mistralExpirationKey, expiration);

        if (expirationTime) {
          storage.setItem(mistralExpirationTimeKey, expirationTime);
        }

        // Keep the legacy keys for backward compatibility
        // We'll remove them once the migration is fully tested and stable
      }
    }
  }

  /**
   * Calculate an expiration timestamp based on the expiration type
   * 
   * Converts an expiration type (like "7days" or "30days") into an actual
   * timestamp when the key will expire. This timestamp is stored alongside
   * the key and checked during retrieval.
   * 
   * Special cases:
   * - "never" returns null to indicate no expiration
   * - "session" returns null as session expiration is handled by sessionStorage
   * 
   * @param expiration The expiration type to calculate
   * @returns A timestamp in milliseconds or null for never/session
   */
  private calculateExpirationTime(expiration: ApiKeyExpiration): number | null {
    if (expiration === "never") {
      return null;
    }

    if (expiration === "session") {
      return null; // Session expiration is handled by sessionStorage
    }

    const duration = this.expirationDurations[expiration];
    return Date.now() + duration;
  }

  /**
   * Stores an API key securely in the selected storage
   * 
   * This is the primary method for storing API keys with comprehensive options
   * and security validation. The method:
   * 1. Gets the appropriate provider implementation
   * 2. Validates the API key format for the specified provider
   * 3. Enforces security rules (password required for persistent storage)
   * 4. Validates password strength for persistent storage
   * 5. Encrypts the key with appropriate password
   * 6. Stores the encrypted key and all metadata
   *
   * Security rules:
   * - For localStorage (persistent), a password is REQUIRED
   * - For sessionStorage, password is optional (auto-generated if not provided)
   *
   * @param apiKey The API key to store
   * @param options Storage options including storage type, password, expiration, and provider
   * @throws ApiKeyStorageError if trying to use localStorage without a password
   */
  async storeApiKey(
    apiKey: string,
    options: ApiKeyStorageOptions = {}
  ): Promise<void> {
    // Get default provider ID if none specified
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    const {
      password,
      storageType = "local",
      expiration = "never",
      provider = defaultProviderId,
    } = options;

    // Get the provider implementation
    const providerImpl = this.providerRegistry.getProvider(provider);
    if (!providerImpl) {
      throw new ApiKeyStorageError(`Unsupported provider: ${provider}`);
    }

    // Validate API key format for the specified provider
    if (!providerImpl.validateApiKey(apiKey)) {
      throw new ApiKeyStorageError("Invalid API key format");
    }

    // For persistent storage (localStorage), password is required
    if (storageType === "local") {
      if (!password) {
        throw new ApiKeyStorageError(
          "Password is required for persistent storage"
        );
      }

      // Validate password strength
      if (!passwordValidation.validatePassword(password)) {
        throw new ApiKeyStorageError(
          passwordValidation.getPasswordRequirementsMessage()
        );
      }
    }

    const storage = this.getStorage(storageType);
    const encryptedKeyData = encryptionUtils.encryptApiKey(
      apiKey, 
      password || encryptionUtils.getSessionKey(), 
      provider,
      this.storageVersion, 
      defaultProviderId
    );

    // Get provider-specific storage keys
    const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);
    const protectedKey = providerImpl.getProtectedKey(this.keyPatterns.protectedKeyPattern);
    const storageTypeKey = providerImpl.getStorageTypeKey(this.keyPatterns.storageTypeKeyPattern);
    const expirationKey = providerImpl.getExpirationKey(this.keyPatterns.expirationKeyPattern);
    const expirationTimeKey = providerImpl.getExpirationTimeKey(this.keyPatterns.expirationTimeKeyPattern);

    // Store the encrypted key
    storage.setItem(storageKey, encryptedKeyData);

    // Store metadata
    storage.setItem(protectedKey, password ? "true" : "false");
    storage.setItem(storageTypeKey, storageType);
    storage.setItem(expirationKey, expiration);

    // Calculate and store expiration time if applicable
    const expirationTime = this.calculateExpirationTime(expiration);
    if (expirationTime !== null) {
      storage.setItem(expirationTimeKey, expirationTime.toString());
    } else {
      storage.removeItem(expirationTimeKey);
    }
  }

  /**
   * Retrieves the API key from storage, checking expiration first
   * 
   * This method handles the complete API key retrieval process:
   * 1. Gets the provider implementation
   * 2. Verifies if the key has expired and clears it if so
   * 3. Determines the storage type being used
   * 4. Retrieves the encrypted key from the appropriate storage
   * 5. Checks if the key is password protected
   * 6. Decrypts the key with appropriate password
   * 7. Returns the decrypted key or throws meaningful errors
   *
   * @param password Password for decryption (required if key was stored with password)
   * @param provider The provider to retrieve the key for (defaults to default provider)
   * @returns The decrypted API key or null if not found/expired
   * @throws ApiKeyStorageError if password is required but not provided or incorrect
   */
  async retrieveApiKey(
    password?: string,
    provider?: ApiProvider
  ): Promise<string | null> {
    // Get default provider ID if none specified
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    const providerId = provider || defaultProviderId;
    
    // Get the provider implementation
    const providerImpl = this.providerRegistry.getProvider(providerId);
    if (!providerImpl) {
      throw new ApiKeyStorageError(`Unsupported provider: ${providerId}`);
    }

    // Check if the key has expired
    if (this.hasExpired(providerId)) {
      this.clearApiKey(providerId);
      return null;
    }

    // Get the storage type being used
    const storageType = this.getStorageType(providerId);
    if (!storageType) {
      return null;
    }

    const storage = this.getStorage(storageType);

    // Get provider-specific storage keys
    const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);
    const protectedKey = providerImpl.getProtectedKey(this.keyPatterns.protectedKeyPattern);

    // Try to get the encrypted key
    let encryptedData = storage.getItem(storageKey);

    // If not found, check legacy keys for default provider (backward compatibility)
    if (!encryptedData && providerId === defaultProviderId) {
      encryptedData = storage.getItem(this.legacyKeys.legacyStorageKey);

      // If found in legacy, migrate it
      if (encryptedData) {
        this.checkAndMigrateLegacyKey();
        // Try again with the migrated key
        encryptedData = storage.getItem(storageKey);
      }
    }

    if (!encryptedData) {
      return null;
    }

    const isProtected = storage.getItem(protectedKey) === "true";

    // If the key is password-protected but no password provided, throw error
    if (isProtected && !password) {
      throw new ApiKeyStorageError("Password required to retrieve API key");
    }

    try {
      return encryptionUtils.decryptApiKey(
        encryptedData,
        isProtected ? password : encryptionUtils.getSessionKey(),
        this.validateApiKey.bind(this),
        defaultProviderId
      );
    } catch (error) {
      // Rethrow with a more user-friendly message
      if (error instanceof ApiKeyStorageError) {
        throw error;
      } else {
        throw new ApiKeyStorageError("Failed to decrypt API key");
      }
    }
  }

  /**
   * Checks if an API key is stored for the specified provider
   * 
   * This method checks if an API key exists for the specified provider
   * in either localStorage or sessionStorage. If the provider is not specified,
   * it checks if any keys are stored for any provider.
   * 
   * The method also handles expired keys, clearing them if found.
   *
   * @param provider Optional provider to check (if not specified, checks any provider)
   * @returns true if an API key is stored, false otherwise
   */
  hasApiKey(provider?: ApiProvider): boolean {
    // If provider is specified, check only that provider
    if (provider) {
      const providerImpl = this.providerRegistry.getProvider(provider);
      if (!providerImpl) {
        return false;
      }

      const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);

      // Check localStorage first
      if (localStorage.getItem(storageKey) !== null) {
        // If there's a key but it's expired, clear it and return false
        if (this.hasExpired(provider)) {
          this.clearApiKey(provider);
          return false;
        }
        return true;
      }

      // Then check sessionStorage
      if (sessionStorage.getItem(storageKey) !== null) {
        return true;
      }

      // For default provider, also check legacy keys
      const defaultProviderId = this.providerRegistry.getDefaultProviderId();
      if (
        provider === defaultProviderId &&
        (localStorage.getItem(this.legacyKeys.legacyStorageKey) !== null ||
          sessionStorage.getItem(this.legacyKeys.legacyStorageKey) !== null)
      ) {
        return true;
      }

      return false;
    }

    // If no provider specified, check all providers
    return this.getStoredProviders().length > 0;
  }

  /**
   * Gets all providers that have stored API keys
   * 
   * This method returns an array of all providers that have active API keys
   * stored in either localStorage or sessionStorage.
   * 
   * The method also handles expired keys, clearing them if found.
   * 
   * @returns Array of providers with stored API keys
   */
  getStoredProviders(): ApiProvider[] {
    const providerSet = new Set<ApiProvider>();
    const allProviders = this.providerRegistry.getAllProviders();
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();

    // Check each registered provider
    for (const provider of allProviders) {
      const providerId = provider.getProviderId();
      const storageKey = provider.getStorageKey(this.keyPatterns.storageKeyPattern);

      // Check in localStorage
      if (localStorage.getItem(storageKey) !== null) {
        // If there's a key but it's expired, clear it and continue
        if (this.hasExpired(providerId)) {
          this.clearApiKey(providerId);
          continue;
        }
        providerSet.add(providerId);
      }

      // Check in sessionStorage
      if (sessionStorage.getItem(storageKey) !== null) {
        providerSet.add(providerId);
      }
    }

    // Also check legacy keys for default provider
    if (
      localStorage.getItem(this.legacyKeys.legacyStorageKey) !== null ||
      sessionStorage.getItem(this.legacyKeys.legacyStorageKey) !== null
    ) {
      providerSet.add(defaultProviderId);
    }

    return Array.from(providerSet);
  }

  /**
   * Validates if an API key has the correct format
   * 
   * This method checks if an API key matches the expected format for a specific
   * provider using the provider's implementation.
   * 
   * Different providers have different API key formats (e.g., OpenAI keys start
   * with "sk-", while Mistral keys have a different pattern).
   *
   * @param apiKey The API key to validate
   * @param provider Optional provider to validate against (defaults to default provider)
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(
    apiKey: string,
    provider: ApiProvider = this.providerRegistry.getDefaultProviderId()
  ): boolean {
    const providerImpl = this.providerRegistry.getProvider(provider);
    if (!providerImpl) {
      return false;
    }

    return providerImpl.validateApiKey(apiKey);
  }

  /**
   * Gets the storage type being used for the API key
   * 
   * This method determines whether an API key for the specified provider
   * is stored in localStorage or sessionStorage. It checks both storage
   * types and also handles legacy keys for backward compatibility.
   *
   * @param provider Optional provider to check (defaults to default provider)
   * @returns The storage type being used or null if no key is stored
   */
  getStorageType(
    provider?: ApiProvider
  ): ApiKeyStorageType | null {
    const providerId = provider || this.providerRegistry.getDefaultProviderId();
    const providerImpl = this.providerRegistry.getProvider(providerId);
    
    if (!providerImpl) {
      return null;
    }

    // Get provider-specific storage keys
    const storageTypeKey = providerImpl.getStorageTypeKey(this.keyPatterns.storageTypeKeyPattern);
    const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);

    // Check localStorage first for storage type
    const localStorageType = localStorage.getItem(
      storageTypeKey
    ) as ApiKeyStorageType | null;
    if (localStorageType && localStorage.getItem(storageKey)) {
      return localStorageType;
    }

    // Then check sessionStorage
    const sessionStorageType = sessionStorage.getItem(
      storageTypeKey
    ) as ApiKeyStorageType | null;
    if (sessionStorageType && sessionStorage.getItem(storageKey)) {
      return sessionStorageType;
    }

    // For default provider, also check legacy keys
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    if (providerId === defaultProviderId) {
      // Check localStorage first for legacy storage type
      const legacyLocalStorageType = localStorage.getItem(
        this.legacyKeys.legacyStorageTypeKey
      ) as ApiKeyStorageType | null;
      if (
        legacyLocalStorageType &&
        localStorage.getItem(this.legacyKeys.legacyStorageKey)
      ) {
        return legacyLocalStorageType;
      }

      // Then check sessionStorage for legacy keys
      const legacySessionStorageType = sessionStorage.getItem(
        this.legacyKeys.legacyStorageTypeKey
      ) as ApiKeyStorageType | null;
      if (
        legacySessionStorageType &&
        sessionStorage.getItem(this.legacyKeys.legacyStorageKey)
      ) {
        return legacySessionStorageType;
      }
    }

    return null;
  }

  /**
   * Gets the expiration setting for the stored API key
   * 
   * This method retrieves the expiration setting (e.g., "7days", "never")
   * for an API key stored for the specified provider. It checks the appropriate
   * storage based on where the key is stored and handles legacy keys.
   *
   * @param provider Optional provider to check (defaults to default provider)
   * @returns The expiration setting or null if no key is stored
   */
  getExpiration(
    provider?: ApiProvider
  ): ApiKeyExpiration | null {
    const providerId = provider || this.providerRegistry.getDefaultProviderId();
    const storageType = this.getStorageType(providerId);
    
    if (!storageType) {
      return null;
    }

    const storage = this.getStorage(storageType);
    const providerImpl = this.providerRegistry.getProvider(providerId);
    
    if (!providerImpl) {
      return null;
    }

    // Get provider-specific storage key
    const expirationKey = providerImpl.getExpirationKey(this.keyPatterns.expirationKeyPattern);

    // Try to get the expiration
    let expiration = storage.getItem(expirationKey) as ApiKeyExpiration | null;

    // If not found and provider is default, check legacy keys
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    if (!expiration && providerId === defaultProviderId) {
      expiration = storage.getItem(
        this.legacyKeys.legacyExpirationKey
      ) as ApiKeyExpiration | null;
    }

    return expiration;
  }

  /**
   * Checks if the stored API key has expired
   * 
   * This method determines if an API key for the specified provider has expired
   * based on its expiration timestamp. Keys stored in sessionStorage never
   * "expire" in this check since they're automatically cleared when the session ends.
   *
   * @param provider Optional provider to check (defaults to default provider)
   * @returns true if the API key has expired, false otherwise
   */
  hasExpired(provider?: ApiProvider): boolean {
    const providerId = provider || this.providerRegistry.getDefaultProviderId();
    const storageType = this.getStorageType(providerId);
    
    if (!storageType) {
      return false;
    }

    const storage = this.getStorage(storageType);
    const providerImpl = this.providerRegistry.getProvider(providerId);
    
    if (!providerImpl) {
      return false;
    }

    // Session storage keys expire with the session, so they never "expire" while available
    if (storageType === "session") {
      return false;
    }

    // Get provider-specific storage key
    const expirationTimeKey = providerImpl.getExpirationTimeKey(
      this.keyPatterns.expirationTimeKeyPattern
    );

    // Try to get the expiration time
    let expirationTimeStr = storage.getItem(expirationTimeKey);

    // If not found and provider is default, check legacy keys
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    if (!expirationTimeStr && providerId === defaultProviderId) {
      expirationTimeStr = storage.getItem(this.legacyKeys.legacyExpirationTimeKey);
    }

    if (!expirationTimeStr) {
      // If no expiration time is set, the key doesn't expire
      return false;
    }

    const expirationTime = parseInt(expirationTimeStr, 10);
    return Date.now() > expirationTime;
  }

  /**
   * Checks if API key is password protected
   * 
   * This method determines if an API key for the specified provider was stored
   * with password protection and thus requires a password for retrieval.
   * It checks the appropriate storage based on where the key is stored
   * and handles legacy keys for backward compatibility.
   *
   * @param provider Optional provider to check (defaults to default provider)
   * @returns true if the API key is password protected, false otherwise
   */
  isPasswordProtected(provider?: ApiProvider): boolean {
    const providerId = provider || this.providerRegistry.getDefaultProviderId();
    const storageType = this.getStorageType(providerId);
    
    if (!storageType) {
      return false;
    }

    const storage = this.getStorage(storageType);
    const providerImpl = this.providerRegistry.getProvider(providerId);
    
    if (!providerImpl) {
      return false;
    }

    // Get provider-specific storage key
    const protectedKey = providerImpl.getProtectedKey(this.keyPatterns.protectedKeyPattern);

    // Try to get the protected status
    let isProtected = storage.getItem(protectedKey) === "true";

    // If not found and provider is default, check legacy keys
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    if (
      providerId === defaultProviderId &&
      storage.getItem(protectedKey) === null &&
      storage.getItem(this.legacyKeys.legacyProtectedKey) !== null
    ) {
      isProtected = storage.getItem(this.legacyKeys.legacyProtectedKey) === "true";
    }

    return isProtected;
  }

  /**
   * Removes the stored API key
   * 
   * This method completely removes an API key and all its associated metadata
   * from both localStorage and sessionStorage. If a provider is specified,
   * only that provider's data is cleared. Otherwise, all providers' data is cleared.
   * 
   * The method also handles legacy keys for backward compatibility, ensuring
   * that all traces of API keys are removed from storage.
   *
   * @param provider Optional provider to clear (if not specified, clears all)
   */
  clearApiKey(provider?: ApiProvider): void {
    // If provider is specified, clear only that provider
    if (provider) {
      const providerImpl = this.providerRegistry.getProvider(provider);
      
      if (providerImpl) {
        // Get provider-specific storage keys
        const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);
        const protectedKey = providerImpl.getProtectedKey(this.keyPatterns.protectedKeyPattern);
        const storageTypeKey = providerImpl.getStorageTypeKey(this.keyPatterns.storageTypeKeyPattern);
        const expirationKey = providerImpl.getExpirationKey(this.keyPatterns.expirationKeyPattern);
        const expirationTimeKey = providerImpl.getExpirationTimeKey(this.keyPatterns.expirationTimeKeyPattern);

        // Clear from localStorage
        localStorage.removeItem(storageKey);
        localStorage.removeItem(protectedKey);
        localStorage.removeItem(storageTypeKey);
        localStorage.removeItem(expirationKey);
        localStorage.removeItem(expirationTimeKey);

        // Clear from sessionStorage
        sessionStorage.removeItem(storageKey);
        sessionStorage.removeItem(protectedKey);
        sessionStorage.removeItem(storageTypeKey);
        sessionStorage.removeItem(expirationKey);
        sessionStorage.removeItem(expirationTimeKey);
      }

      // If default provider, also clear legacy keys
      const defaultProviderId = this.providerRegistry.getDefaultProviderId();
      if (provider === defaultProviderId) {
        this.clearLegacyKeys();
      }
    } else {
      // Clear all providers
      const allProviders = this.providerRegistry.getAllProviders();

      // Clear each provider individually
      for (const provider of allProviders) {
        this.clearApiKey(provider.getProviderId());
      }

      // Also clear legacy keys (just to be safe)
      this.clearLegacyKeys();
    }
  }

  /**
   * Clears all legacy storage keys
   * 
   * Helper method to remove all legacy keys from both localStorage and sessionStorage.
   * Used during migration and when clearing all API keys.
   */
  private clearLegacyKeys(): void {
    // Clear from localStorage
    localStorage.removeItem(this.legacyKeys.legacyStorageKey);
    localStorage.removeItem(this.legacyKeys.legacyProtectedKey);
    localStorage.removeItem(this.legacyKeys.legacyStorageTypeKey);
    localStorage.removeItem(this.legacyKeys.legacyExpirationKey);
    localStorage.removeItem(this.legacyKeys.legacyExpirationTimeKey);

    // Clear from sessionStorage
    sessionStorage.removeItem(this.legacyKeys.legacyStorageKey);
    sessionStorage.removeItem(this.legacyKeys.legacyProtectedKey);
    sessionStorage.removeItem(this.legacyKeys.legacyStorageTypeKey);
    sessionStorage.removeItem(this.legacyKeys.legacyExpirationKey);
    sessionStorage.removeItem(this.legacyKeys.legacyExpirationTimeKey);
  }
