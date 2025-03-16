// AI Summary: Provides services for managing API key expiration policies.
// Handles expiration calculation, validation, and checking with unified interfaces
// for working with different expiration types and storage backends.

import {
  ApiKeyExpiration,
  ApiProvider,
  ApiKeyStorageType,
} from "../api-key-storage";
import { ApiKeyProvider } from "./interfaces";
import { StorageOperations } from "./storage-operations";

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
 * Implementation of the expiration service
 *
 * Handles API key expiration management including:
 * - Getting expiration settings from storage
 * - Checking if keys have expired
 * - Calculating expiration times based on duration types
 */
export class WebExpirationService implements ExpirationService {
  private readonly expirationDurations: ExpirationDurations;
  private readonly storageOperations: StorageOperations;

  /**
   * Creates a new WebExpirationService
   *
   * @param storageOperations Storage operations service to use
   * @param expirationDurations Optional custom expiration durations
   */
  constructor(
    storageOperations: StorageOperations,
    expirationDurations?: ExpirationDurations
  ) {
    this.storageOperations = storageOperations;

    // Use provided durations or defaults
    this.expirationDurations = expirationDurations || {
      session: 0, // Session expiration is handled by sessionStorage
      "1day": 24 * 60 * 60 * 1000,
      "7days": 7 * 24 * 60 * 60 * 1000,
      "30days": 30 * 24 * 60 * 60 * 1000,
      "90days": 90 * 24 * 60 * 60 * 1000,
    };
  }

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
  ): ApiKeyExpiration | null {
    const storageType = this.getStorageTypeForProvider(provider);

    if (!storageType) {
      return null;
    }

    // Try to get the expiration
    const expiration = this.storageOperations.getValue(
      "expirationKeyPattern",
      provider,
      storageType as ApiKeyStorageType
    ) as ApiKeyExpiration | null;

    return expiration;
  }

  /**
   * Checks if the stored API key has expired
   *
   * This method determines if an API key for the specified provider has expired
   * based on its expiration timestamp. Keys stored in sessionStorage never
   * "expire" in this check since they're automatically cleared when the session ends.
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
  ): boolean {
    if (!storageType) {
      return false;
    }

    // Session storage keys expire with the session, so they never "expire" while available
    if (storageType === "session") {
      return false;
    }

    // Try to get the expiration time
    const expirationTimeStr = this.storageOperations.getValue(
      "expirationTimeKeyPattern",
      provider,
      storageType as ApiKeyStorageType
    );

    if (!expirationTimeStr) {
      // If no expiration time is set, the key doesn't expire
      return false;
    }

    const expirationTime = parseInt(expirationTimeStr, 10);
    return Date.now() > expirationTime;
  }

  /**
   * Calculate an expiration timestamp based on the expiration type
   *
   * Converts an expiration type (like "7days", "30days", or "90days") into an actual
   * timestamp when the key will expire. This timestamp is stored alongside
   * the key and checked during retrieval.
   *
   * Special case:
   * - "session" returns null as session expiration is handled by sessionStorage
   *
   * @param expiration The expiration type to calculate
   * @returns A timestamp in milliseconds or null for session
   */
  calculateExpirationTime(expiration: ApiKeyExpiration): number | null {
    if (expiration === "session") {
      return null;
    }

    const duration = this.expirationDurations[expiration];
    return Date.now() + duration;
  }

  /**
   * Helper method to get the storage type for a provider
   *
   * @param provider Provider to check
   * @returns Storage type or null if not found
   */
  private getStorageTypeForProvider(
    provider: ApiProvider
  ): ApiKeyStorageType | null {
    return this.storageOperations.getStorageTypeForProvider(
      provider
    ) as ApiKeyStorageType | null;
  }
}
