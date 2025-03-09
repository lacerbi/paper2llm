# API Key Providers

This directory contains provider-specific implementations for the API key storage system. Each provider implements the `ApiKeyProvider` interface to handle provider-specific validation and storage operations.

## Architecture

The provider system is built around these key components:

- **ApiKeyProvider interface**: Defines the contract for all provider implementations
- **BaseProvider**: Abstract base class that implements common functionality
- **Provider implementations**: Concrete classes for specific API providers (Mistral, OpenAI, etc.)
- **ProviderRegistry**: Central registry for managing provider instances

This architecture makes it easy to add support for new API providers without modifying the core storage logic.

### Component Hierarchy

```
┌─────────────────────┐
│   ApiKeyProvider    │ (Interface)
└─────────────────────┘
           ▲
           │ implements
           │
┌─────────────────────┐
│    BaseProvider     │ (Abstract class)
└─────────────────────┘
           ▲
           │ extends
           │
┌─────────────────────┐
│ Provider Implementations │
│  - MistralProvider   │
│  - OpenAIProvider    │
└─────────────────────┘
```

## Available Providers

Currently, the following providers are implemented:

### MistralProvider

- **Provider ID**: `"mistral"`
- **Validation Pattern**: `/^[A-Za-z0-9-_]{32,64}$/`
- **Key Characteristics**: 
  - 32-64 characters long
  - Contains only alphanumeric characters, hyphens, and underscores

### OpenAIProvider

- **Provider ID**: `"openai"`
- **Validation Pattern**: `/^sk-[A-Za-z0-9]{32,64}$/`
- **Key Characteristics**:
  - Starts with the prefix 'sk-'
  - Followed by 32-64 alphanumeric characters

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

// First update interfaces.ts to add the new provider type
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

Providers are automatically registered with the `ProviderRegistry` when the `WebApiKeyStorage` class is initialized. You can also manually register providers using the `registerProvider` method on the registry:

```typescript
const providerRegistry = new WebProviderRegistry();
const customProvider = new CustomProvider();
providerRegistry.registerProvider(customProvider);
```

The provider registry serves as the central coordination point for all provider-specific operations, allowing the main storage class to delegate operations to the appropriate provider.

## Key Pattern Generation

The provider system uses a pattern-based approach to generate storage keys:

```typescript
// Base patterns with placeholders
const patterns = {
  storageKeyPattern: "paper2llm_api_key_{provider}",
  protectedKeyPattern: "paper2llm_api_key_{provider}_protected",
  // Additional patterns...
};

// In BaseProvider implementation:
getStorageKey(basePattern: string): string {
  return this.replaceProviderPlaceholder(basePattern);
}

private replaceProviderPlaceholder(pattern: string): string {
  return pattern.replace("{provider}", this.providerId);
}
```

This approach ensures that:
- Keys for different providers are stored separately
- Each provider follows the same naming conventions
- Adding new providers doesn't require changing the key generation logic

## Validation Patterns

Each provider defines its own validation pattern for API keys. These patterns ensure that keys have the correct format before they are stored.

The validation patterns are implemented as regular expressions in each provider class:

```typescript
// Example from MistralProvider
private readonly validationPattern = /^[A-Za-z0-9-_]{32,64}$/;

// Example from OpenAIProvider
private readonly validationPattern = /^sk-[A-Za-z0-9]{32,64}$/;
```

Validation occurs in two key places:
1. When storing a new API key (to prevent storing invalid keys)
2. During decryption (to verify the key was decrypted correctly)

## Provider Usage

The provider system is used by the `WebApiKeyStorage` class to handle provider-specific operations:

```typescript
// Getting a provider implementation
const providerImpl = this.providerRegistry.getProvider(providerId);

// Validating an API key
if (!providerImpl.validateApiKey(apiKey)) {
  throw new ApiKeyStorageError("Invalid API key format");
}

// Getting provider-specific storage keys
const storageKey = providerImpl.getStorageKey(this.keyPatterns.storageKeyPattern);
```

This delegation pattern allows the main storage class to remain clean and focused on its core responsibilities, while provider-specific logic is encapsulated in the appropriate provider implementation.
