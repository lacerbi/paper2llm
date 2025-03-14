// AI Summary: Provides storage operations for API key management.
// Handles localStorage/sessionStorage access, key pattern handling,
// and common storage operations while supporting provider-specific patterns.

import { ApiKeyStorageType, ApiProvider } from "../api-key-storage";
import { StorageKeyPatterns } from "./interfaces";
import { ApiKeyProvider } from "./interfaces";

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
    storageType?: ApiKeyStorageType
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
 * Implements storage operations for API key management
 *
 * This class handles:
 * - Storage access (localStorage/sessionStorage)
 * - Storage key pattern management
 * - Provider-specific key generation
 * - Reading, writing, and removing values
 *
 * It separates the storage mechanics from the business logic
 * of API key management.
 */
export class WebStorageOperations implements StorageOperations {
  private readonly keyPatterns: StorageKeyPatterns;

  /**
   * Creates a new WebStorageOperations
   *
   * @param keyPatterns Storage key patterns with {provider} placeholder
   */
  constructor(keyPatterns: StorageKeyPatterns) {
    this.keyPatterns = keyPatterns;
  }

  /**
   * Gets the appropriate storage based on the storage type
   *
   * @param storageType The storage type to use (local or session)
   * @returns The corresponding Storage object
   */
  getStorage(storageType: ApiKeyStorageType = "local"): Storage {
    return storageType === "local" ? localStorage : sessionStorage;
  }

  /**
   * Gets a value from storage for a specific provider
   *
   * Retrieves a value from the appropriate storage using the provider-specific key.
   * If storageType is null, it checks both localStorage and sessionStorage.
   *
   * @param key The base key pattern to use
   * @param provider The provider to get the value for
   * @param storageType The storage type to use, or null to check both
   * @returns The stored value or null if not found
   */
  getValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    storageType?: ApiKeyStorageType | null
  ): string | null {
    // Get the provider-specific key
    const providerKey = this.getProviderKey(key, provider);

    if (storageType === "local") {
      return localStorage.getItem(providerKey);
    } else if (storageType === "session") {
      return sessionStorage.getItem(providerKey);
    } else {
      // Check both storages if no specific type is provided
      return (
        localStorage.getItem(providerKey) || sessionStorage.getItem(providerKey)
      );
    }
  }

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
    storageType: ApiKeyStorageType = "local"
  ): void {
    // Get the provider-specific key
    const providerKey = this.getProviderKey(key, provider);

    // Store in the appropriate storage
    const storage = this.getStorage(storageType);
    storage.setItem(providerKey, value);
  }

  /**
   * Removes a value from storage for a specific provider
   *
   * @param key The base key pattern to use
   * @param provider The provider to remove the value for
   * @param fromLocal Whether to remove from localStorage (default: true)
   * @param fromSession Whether to remove from sessionStorage (default: true)
   */
  removeValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    fromLocal: boolean = true,
    fromSession: boolean = true
  ): void {
    // Get the provider-specific key
    const providerKey = this.getProviderKey(key, provider);

    // Remove from appropriate storage(s)
    if (fromLocal) {
      localStorage.removeItem(providerKey);
    }
    if (fromSession) {
      sessionStorage.removeItem(providerKey);
    }
  }

  /**
   * Checks if a value exists in storage for a specific provider
   *
   * @param key The base key pattern to use
   * @param provider The provider to check
   * @param checkLocal Whether to check localStorage (default: true)
   * @param checkSession Whether to check sessionStorage (default: true)
   * @returns true if value exists, false otherwise
   */
  hasValue(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider,
    checkLocal: boolean = true,
    checkSession: boolean = true
  ): boolean {
    // Get the provider-specific key
    const providerKey = this.getProviderKey(key, provider);

    // Check appropriate storage(s)
    if (checkLocal && localStorage.getItem(providerKey) !== null) {
      return true;
    }
    if (checkSession && sessionStorage.getItem(providerKey) !== null) {
      return true;
    }
    return false;
  }

  /**
   * Gets the storage type for a provider
   *
   * @param provider Provider to check
   * @returns Storage type or null if not found
   */
  getStorageTypeForProvider(provider: ApiProvider): string | null {
    // Check localStorage first
    if (this.hasValue("storageKeyPattern", provider, true, false)) {
      const storageType = this.getValue(
        "storageTypeKeyPattern",
        provider,
        "local"
      );
      if (storageType) {
        return storageType;
      }
    }

    // Then check sessionStorage
    if (this.hasValue("storageKeyPattern", provider, false, true)) {
      const storageType = this.getValue(
        "storageTypeKeyPattern",
        provider,
        "session"
      );
      if (storageType) {
        return storageType;
      }
    }

    return null;
  }

  /**
   * Gets a provider-specific key by replacing the {provider} placeholder
   *
   * @param key The base key pattern to use
   * @param provider The provider ID to insert
   * @returns The provider-specific key
   */
  private getProviderKey(
    key: keyof StorageKeyPatterns,
    provider: ApiProvider
  ): string {
    return this.keyPatterns[key].replace("{provider}", provider);
  }
}
