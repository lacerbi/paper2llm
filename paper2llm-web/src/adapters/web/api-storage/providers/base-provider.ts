// AI Summary: Abstract base provider class implementing common functionality.
// Handles storage key generation, provider identification, and other shared operations.
// Reduces code duplication across provider implementations.

import { ApiKeyProvider } from "../interfaces";
import { ApiProvider } from "../../../../types/interfaces";

/**
 * Abstract base class for API key providers
 * 
 * Implements common functionality shared by all provider implementations.
 * Provider-specific implementations should extend this class and override
 * methods as needed to implement provider-specific behavior.
 * 
 * This base class provides:
 * - Methods for generating storage keys based on patterns
 * - Default implementations of common provider methods
 * - A framework for adding new providers with minimal code
 */
export abstract class BaseProvider implements ApiKeyProvider {
  private readonly providerId: ApiProvider;

  /**
   * Creates a new BaseProvider
   * 
   * @param providerId The provider identifier
   */
  constructor(providerId: ApiProvider) {
    this.providerId = providerId;
  }

  /**
   * Gets the provider identifier
   * 
   * @returns The provider identifier
   */
  getProviderId(): ApiProvider {
    return this.providerId;
  }

  /**
   * Validates if an API key has the correct format for this provider
   * 
   * Provider-specific implementations should override this method to
   * implement their own validation logic.
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  abstract validateApiKey(apiKey: string): boolean;

  /**
   * Gets the storage key for this provider
   * 
   * @param basePattern The base pattern to use
   * @returns The storage key for this provider
   */
  getStorageKey(basePattern: string): string {
    return this.replaceProviderPlaceholder(basePattern);
  }

  /**
   * Gets the protected key for this provider
   * 
   * @param basePattern The base pattern to use
   * @returns The protected key for this provider
   */
  getProtectedKey(basePattern: string): string {
    return this.replaceProviderPlaceholder(basePattern);
  }

  /**
   * Gets the storage type key for this provider
   * 
   * @param basePattern The base pattern to use
   * @returns The storage type key for this provider
   */
  getStorageTypeKey(basePattern: string): string {
    return this.replaceProviderPlaceholder(basePattern);
  }

  /**
   * Gets the expiration key for this provider
   * 
   * @param basePattern The base pattern to use
   * @returns The expiration key for this provider
   */
  getExpirationKey(basePattern: string): string {
    return this.replaceProviderPlaceholder(basePattern);
  }

  /**
   * Gets the expiration time key for this provider
   * 
   * @param basePattern The base pattern to use
   * @returns The expiration time key for this provider
   */
  getExpirationTimeKey(basePattern: string): string {
    return this.replaceProviderPlaceholder(basePattern);
  }

  /**
   * Replaces the {provider} placeholder in a pattern with the provider ID
   * 
   * @param pattern The pattern containing the {provider} placeholder
   * @returns The pattern with the placeholder replaced
   */
  private replaceProviderPlaceholder(pattern: string): string {
    return pattern.replace("{provider}", this.providerId);
  }
}
