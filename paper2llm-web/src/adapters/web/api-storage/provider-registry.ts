// AI Summary: Implements a registry system for managing API provider implementations.
// Handles registration, retrieval, and default provider selection with type safety.
// Acts as the coordination point for all provider-specific operations.
import { ApiProvider } from "../../../types/interfaces";
import { ApiKeyProvider, ProviderRegistry } from "./interfaces";

/**
 * Provider registry implementation
 *
 * Manages a collection of provider-specific implementations and provides
 * methods to access them. This registry serves as the central coordination
 * point for all provider-specific operations.
 *
 * The registry:
 * - Maintains a map of provider IDs to provider implementations
 * - Provides access to providers by their ID
 * - Handles default provider selection
 * - Ensures type safety when working with providers
 */
export class WebProviderRegistry implements ProviderRegistry {
  private providers: Map<ApiProvider, ApiKeyProvider> = new Map();
  private defaultProviderId: ApiProvider = "mistral";

  /**
   * Creates a new provider registry
   *
   * @param defaultProviderId Optional default provider ID (defaults to "mistral")
   */
  constructor(defaultProviderId?: ApiProvider) {
    if (defaultProviderId) {
      this.defaultProviderId = defaultProviderId;
    }
  }

  /**
   * Registers a provider implementation
   *
   * Adds a provider to the registry, making it available for use.
   * If a provider with the same ID already exists, it will be replaced.
   *
   * @param provider The provider implementation to register
   */
  registerProvider(provider: ApiKeyProvider): void {
    const providerId = provider.getProviderId();
    this.providers.set(providerId, provider);
  }

  /**
   * Gets a provider implementation by its identifier
   *
   * @param providerId The provider identifier
   * @returns The provider implementation or null if not found
   */
  getProvider(providerId: ApiProvider): ApiKeyProvider | null {
    return this.providers.get(providerId) || null;
  }

  /**
   * Gets all registered providers
   *
   * @returns Array of provider implementations
   */
  getAllProviders(): ApiKeyProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Gets all registered provider IDs
   *
   * @returns Array of provider IDs
   */
  getAllProviderIds(): ApiProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Sets the default provider ID
   *
   * @param providerId The provider ID to use as default
   * @throws Error if the provider is not registered
   */
  setDefaultProviderId(providerId: ApiProvider): void {
    if (!this.providers.has(providerId)) {
      throw new Error(
        `Cannot set default provider: Provider '${providerId}' is not registered`
      );
    }
    this.defaultProviderId = providerId;
  }

  /**
   * Gets the default provider ID
   *
   * @returns The default provider ID
   */
  getDefaultProviderId(): ApiProvider {
    return this.defaultProviderId;
  }

  /**
   * Gets the default provider implementation
   *
   * @returns The default provider implementation
   * @throws Error if the default provider is not registered
   */
  getDefaultProvider(): ApiKeyProvider {
    const provider = this.providers.get(this.defaultProviderId);
    if (!provider) {
      throw new Error(
        `Default provider '${this.defaultProviderId}' is not registered`
      );
    }
    return provider;
  }

  /**
   * Checks if a provider is registered
   *
   * @param providerId The provider ID to check
   * @returns true if the provider is registered, false otherwise
   */
  hasProvider(providerId: ApiProvider): boolean {
    return this.providers.has(providerId);
  }

  /**
   * Gets the number of registered providers
   *
   * @returns The number of registered providers
   */
  getProviderCount(): number {
    return this.providers.size;
  }

  /**
   * Clears all registered providers
   */
  clearProviders(): void {
    this.providers.clear();
  }
}
