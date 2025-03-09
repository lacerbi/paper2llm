# API Key Providers

This directory contains provider-specific implementations for the API key storage system. Each provider implements the `ApiKeyProvider` interface to handle provider-specific validation and storage operations.

## Architecture

The provider system is built around these key components:

- **ApiKeyProvider interface**: Defines the contract for all provider implementations
- **BaseProvider**: Abstract base class that implements common functionality
- **Provider implementations**: Concrete classes for specific API providers (Mistral, OpenAI, etc.)
- **ProviderRegistry**: Central registry for managing provider instances

This architecture makes it easy to add support for new API providers without modifying the core storage logic.

## Available Providers

Currently, the following providers are implemented:

- **MistralProvider**: Supports Mistral AI API keys
- **OpenAIProvider**: Supports OpenAI API keys

## Adding a New Provider

To add support for a new API provider:

1. Create a new provider class that extends `BaseProvider`
2. Implement the `validateApiKey` method with provider-specific validation
3. Register the provider with the provider registry

### Example: Adding a fictional "ExampleAPI" provider

```typescript
// example-provider.ts
import { BaseProvider } from "./base-provider";
import { ApiProvider } from "../../../../types/interfaces";

// Update interfaces.ts to add the new provider type
// export type ApiProvider = 'mistral' | 'openai' | 'exampleapi';

export class ExampleAPIProvider extends BaseProvider {
  private readonly validationPattern = /^example_[A-Za-z0-9]{16}$/;

  constructor() {
    super("exampleapi");
  }

  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}

// Then update the index.ts file to export your new provider
export { ExampleAPIProvider } from './example-provider';

// In createDefaultProviders function:
export function createDefaultProviders() {
  const mistralProvider = new MistralProvider();
  const openaiProvider = new OpenAIProvider();
  const exampleProvider = new ExampleAPIProvider();
  
  return [mistralProvider, openaiProvider, exampleProvider];
}
```

## Provider Registration

Providers are automatically registered with the `ProviderRegistry` when the `WebApiKeyStorage` class is initialized. You can also manually register providers using the `registerProvider` method on the registry.

## Validation Patterns

Each provider defines its own validation pattern for API keys. These patterns ensure that keys have the correct format before they are stored. The validation patterns are based on the documented formats for each provider's API keys.

## Storage Keys

The provider system generates storage keys based on the provider ID and base patterns. This ensures that keys for different providers are stored separately, even if they have the same name.
