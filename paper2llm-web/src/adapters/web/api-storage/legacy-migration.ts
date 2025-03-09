// AI Summary: Provides legacy storage migration services for backward compatibility.
// Handles migrating keys from older storage formats to the current provider-based system
// and cleaning up legacy storage entries.

import { ApiProvider } from "../../../types/interfaces";
import { StorageOperations } from "./storage-operations";
import { ApiKeyProvider } from "./interfaces";
import { ProviderRegistry } from "./interfaces";

/**
 * Interface for legacy migration service
 * 
 * Defines methods for handling migration of legacy storage formats
 */
export interface LegacyMigrationService {
  /**
   * Checks if legacy keys exist and migrates them to the new format
   * 
   * @returns true if migration was performed, false otherwise
   */
  checkAndMigrateLegacyKeys(): boolean;
  
  /**
   * Clears all legacy storage keys from both localStorage and sessionStorage
   */
  clearLegacyKeys(): void;
}

/**
 * Implementation of the legacy migration service
 * 
 * Handles migration of API keys from older storage formats (without provider support)
 * to the current format with provider-specific storage. This ensures backward
 * compatibility with previously stored keys.
 */
export class WebLegacyMigrationService implements LegacyMigrationService {
  private readonly storageOperations: StorageOperations;
  private readonly providerRegistry: ProviderRegistry;
  
  /**
   * Creates a new WebLegacyMigrationService
   * 
   * @param storageOperations Storage operations service to use for reading/writing
   * @param providerRegistry Provider registry to get default provider information
   */
  constructor(
    storageOperations: StorageOperations,
    providerRegistry: ProviderRegistry
  ) {
    this.storageOperations = storageOperations;
    this.providerRegistry = providerRegistry;
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
   * 
   * @returns true if migration was performed, false otherwise
   */
  checkAndMigrateLegacyKeys(): boolean {
    const legacyKey = this.storageOperations.getLegacyValue("legacyStorageKey");

    if (legacyKey) {
      // Determine which storage contains the legacy key
      let storageType = "local";
      if (this.storageOperations.getLegacyValue("legacyStorageKey", "local")) {
        storageType = "local";
      } else if (this.storageOperations.getLegacyValue("legacyStorageKey", "session")) {
        storageType = "session";
      } else {
        return false; // Should never happen as we already checked legacyKey exists
      }

      const defaultProvider = this.providerRegistry.getDefaultProvider();
      const providerId = defaultProvider.getProviderId();
      
      // Get all the legacy metadata
      const isProtected = this.storageOperations.getLegacyValue("legacyProtectedKey", storageType) === "true";
      const storedType = 
        this.storageOperations.getLegacyValue("legacyStorageTypeKey", storageType) || 
        "local";
      const expiration = 
        this.storageOperations.getLegacyValue("legacyExpirationKey", storageType) || 
        "never";
      const expirationTime = this.storageOperations.getLegacyValue("legacyExpirationTimeKey", storageType);

      // Store the migrated values
      this.storageOperations.setValue("storageKeyPattern", legacyKey, providerId, storageType);
      this.storageOperations.setValue("protectedKeyPattern", isProtected ? "true" : "false", providerId, storageType);
      this.storageOperations.setValue("storageTypeKeyPattern", storedType, providerId, storageType);
      this.storageOperations.setValue("expirationKeyPattern", expiration, providerId, storageType);
      
      if (expirationTime) {
        this.storageOperations.setValue("expirationTimeKeyPattern", expirationTime, providerId, storageType);
      }

      // Keep the legacy keys for backward compatibility
      // We'll remove them once the migration is fully tested and stable
      return true;
    }
    
    return false;
  }

  /**
   * Clears all legacy storage keys
   * 
   * Helper method to remove all legacy keys from both localStorage and sessionStorage.
   * Used during migration and when clearing all API keys.
   */
  clearLegacyKeys(): void {
    // Clear all legacy keys from both localStorage and sessionStorage
    this.storageOperations.removeLegacyValues();
  }
}
