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
  StorageKeyPatterns,
  LegacyStorageKeys,
  ApiKeyProvider,
  createDefaultStorageKeyPatterns,
  createDefaultLegacyKeys
} from "./interfaces";
import { passwordValidation } from "./password-utils";
import { encryptionUtils } from "./encryption-utils";
import { WebProviderRegistry } from "./provider-registry";
import { createDefaultProviders } from "./providers";
import { StorageOperations, WebStorageOperations } from "./storage-operations";
import { WebExpirationService, ExpirationService } from "./expiration-service";
import { LegacyMigrationService, WebLegacyMigrationService } from "./legacy-migration";

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
  
  // Services
  private readonly storageOperations: StorageOperations;
  private readonly expirationService: ExpirationService;
  private readonly legacyMigrationService: LegacyMigrationService;
  
  // Storage key patterns and legacy keys
  private readonly keyPatterns: StorageKeyPatterns;
  private readonly legacyKeys: LegacyStorageKeys;

  private readonly storageVersion = 3; // Increment when storage format changes

  /**
   * Creates a new WebApiKeyStorage instance
   * 
   * Initializes the provider registry with default provider implementations
   * and performs legacy key migration if needed.
   * 
   * @param defaultProvider Optional default provider ID (defaults to "mistral")
   */
  constructor(defaultProvider: ApiProvider = "mistral") {
    // Initialize storage patterns and keys
    this.keyPatterns = createDefaultStorageKeyPatterns();
    this.legacyKeys = createDefaultLegacyKeys();
    
    // Initialize services
    this.storageOperations = new WebStorageOperations(
      this.keyPatterns,
      this.legacyKeys
    );
    
    // Initialize provider registry with default providers
    this.providerRegistry = new WebProviderRegistry(defaultProvider);
    
    // Register all default providers
    const providers = createDefaultProviders();
    for (const provider of providers) {
      this.providerRegistry.registerProvider(provider);
    }
    
    // Initialize expiration service after storage operations
    this.expirationService = new WebExpirationService(
      this.storageOperations
    );
    
    // Initialize legacy migration service
    this.legacyMigrationService = new WebLegacyMigrationService(
      this.storageOperations,
      this.providerRegistry
    );
    
    // Check for and migrate legacy keys if needed
    this.legacyMigrationService.checkAndMigrateLegacyKeys();
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

    const storage = this.storageOperations.getStorage(storageType);
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
    const expirationTime = this.expirationService.calculateExpirationTime(expiration);
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

    // Try to get the encrypted key
    let encryptedData = this.storageOperations.getValue(
      "storageKeyPattern", 
      providerId, 
      storageType
    );

    // If not found, check legacy keys for default provider (backward compatibility)
    if (!encryptedData && providerId === defaultProviderId) {
      encryptedData = this.storageOperations.getLegacyValue("legacyStorageKey");

      // If found in legacy, migrate it
      if (encryptedData) {
        this.legacyMigrationService.checkAndMigrateLegacyKeys();
        // Try again with the migrated key
        encryptedData = this.storageOperations.getValue(
          "storageKeyPattern", 
          providerId, 
          storageType
        );
      }
    }

    if (!encryptedData) {
      return null;
    }

    const isProtected = this.isPasswordProtected(providerId);

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

      // Check if the key exists in either storage
      const hasProviderKey = this.storageOperations.hasValue(
        "storageKeyPattern", 
        provider
      );

      // If key exists but has expired, clear it
      if (hasProviderKey && this.hasExpired(provider)) {
        this.clearApiKey(provider);
        return false;
      }

      // For default provider, also check legacy keys
      const defaultProviderId = this.providerRegistry.getDefaultProviderId();
      if (
        !hasProviderKey && 
        provider === defaultProviderId &&
        this.storageOperations.hasLegacyValue("legacyStorageKey")
      ) {
        return true;
      }

      return hasProviderKey;
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
      
      // Check if key exists in either storage
      if (this.storageOperations.hasValue("storageKeyPattern", providerId)) {
        // If there's a key but it's expired, clear it and continue
        if (this.hasExpired(providerId)) {
          this.clearApiKey(providerId);
          continue;
        }
        providerSet.add(providerId);
      }
    }

    // Also check legacy keys for default provider
    if (this.storageOperations.hasLegacyValue("legacyStorageKey")) {
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
   * is stored in localStorage or sessionStorage.
   *
   * @param provider Optional provider to check (defaults to default provider)
   * @returns The storage type being used or null if no key is stored
   */
  getStorageType(
    provider?: ApiProvider
  ): ApiKeyStorageType | null {
    const providerId = provider || this.providerRegistry.getDefaultProviderId();
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    
    // Get storage type using storageOperations service
    const storageType = this.storageOperations.getStorageTypeForProvider(providerId);
    
    // If no storage type found directly, check legacy keys for default provider
    if (!storageType && providerId === defaultProviderId) {
      // Check localStorage first
      if (this.storageOperations.hasLegacyValue("legacyStorageKey", true, false)) {
        return this.storageOperations.getLegacyValue(
          "legacyStorageTypeKey", 
          "local"
        ) as ApiKeyStorageType;
      }
      
      // Then check sessionStorage
      if (this.storageOperations.hasLegacyValue("legacyStorageKey", false, true)) {
        return this.storageOperations.getLegacyValue(
          "legacyStorageTypeKey", 
          "session"
        ) as ApiKeyStorageType;
      }
    }
    
    return storageType as ApiKeyStorageType | null;
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
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    
    return this.expirationService.getExpiration(providerId, defaultProviderId);
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
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    
    return this.expirationService.hasExpired(providerId, storageType, defaultProviderId);
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

    const providerImpl = this.providerRegistry.getProvider(providerId);
    
    if (!providerImpl) {
      return false;
    }

    // Try to get the protected status
    let isProtected = this.storageOperations.getValue(
      "protectedKeyPattern",
      providerId,
      storageType
    ) === "true";

    // If not found and provider is default, check legacy keys
    const defaultProviderId = this.providerRegistry.getDefaultProviderId();
    const protectedValue = this.storageOperations.getValue(
      "protectedKeyPattern",
      providerId,
      storageType
    );
    
    if (
      providerId === defaultProviderId &&
      protectedValue === null &&
      this.storageOperations.hasLegacyValue("legacyProtectedKey")
    ) {
      isProtected = this.storageOperations.getLegacyValue("legacyProtectedKey") === "true";
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
        // Remove all provider-specific values
        this.storageOperations.removeValue("storageKeyPattern", provider);
        this.storageOperations.removeValue("protectedKeyPattern", provider);
        this.storageOperations.removeValue("storageTypeKeyPattern", provider);
        this.storageOperations.removeValue("expirationKeyPattern", provider);
        this.storageOperations.removeValue("expirationTimeKeyPattern", provider);
      }

      // If default provider, also clear legacy keys
      const defaultProviderId = this.providerRegistry.getDefaultProviderId();
      if (provider === defaultProviderId) {
        this.legacyMigrationService.clearLegacyKeys();
      }
    } else {
      // Clear all providers
      const allProviders = this.providerRegistry.getAllProviders();

      // Clear each provider individually
      for (const provider of allProviders) {
        this.clearApiKey(provider.getProviderId());
      }

      // Also clear legacy keys (just to be safe)
      this.legacyMigrationService.clearLegacyKeys();
    }
  }
}
