// AI Summary: Barrel file that exports the public API components of the api-storage module.
// Provides a clean interface for consumers while hiding implementation details.

/**
 * API Key Storage Module
 *
 * This module provides secure API key storage functionality for web applications.
 * It supports:
 * - Secure encryption of API keys with password protection
 * - Multiple storage types (localStorage/sessionStorage)
 * - Multiple API providers (Mistral, OpenAI, etc.)
 * - Expiration settings and validation
 *
 * The primary entry point is the WebApiKeyStorage class, which implements
 * the ApiKeyStorage interface.
 */

// Public API exports
export { WebApiKeyStorage } from "./internal/web-api-key-storage";
export { ApiKeyStorageError } from "./errors";

// Public interface exports - fixed import path
export type {
  ApiProvider,
  ApiKeyStorage,
  ApiKeyStorageOptions,
  ApiKeyStorageType,
  ApiKeyExpiration
} from "./api-key-storage";

// Re-export provider types that might be needed by consumers
export { MistralProvider } from "./internal/providers/mistral-provider";
export { OpenAIProvider } from "./internal/providers/openai-provider";
