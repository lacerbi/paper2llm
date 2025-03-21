// AI Summary: Centralized exports for provider system components.
// Makes provider classes and utilities available through a single import.
// Simplifies adding new providers to the system.

/**
 * Provider System Module
 * 
 * This module exports all components related to the provider system:
 * - BaseProvider: Abstract base class for provider implementations
 * - Provider implementations: MistralProvider, OpenAIProvider, GeminiProvider
 * - Utility functions for working with providers
 * 
 * The provider system allows for easy extension with new API providers
 * by implementing the ApiKeyProvider interface.
 */

// Import provider implementations for use in factory function
import { MistralProvider } from './mistral-provider';
import { OpenAIProvider } from './openai-provider';
import { GeminiProvider } from './gemini-provider';
import { AnthropicProvider } from './anthropic-provider';
import { BaseProvider } from './base-provider';

// Export base provider class and implementations
export { BaseProvider } from './base-provider';
export { MistralProvider } from './mistral-provider';
export { OpenAIProvider } from './openai-provider';
export { GeminiProvider } from './gemini-provider';
export { AnthropicProvider } from './anthropic-provider';

// Export utility functions and factory

/**
 * Creates default provider instances
 * 
 * This utility function creates instances of all the default providers
 * shipped with the application. It's used by WebApiKeyStorage to
 * initialize the provider registry with standard providers.
 * 
 * @returns An array of provider instances
 */
export function createDefaultProviders() {
  const mistralProvider = new MistralProvider();
  const openaiProvider = new OpenAIProvider();
  const geminiProvider = new GeminiProvider();
  const anthropicProvider = new AnthropicProvider();
  
  return [mistralProvider, openaiProvider, geminiProvider, anthropicProvider];
}
