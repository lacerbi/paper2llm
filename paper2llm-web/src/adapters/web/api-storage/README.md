# API Key Storage Module

This module provides secure API key storage for web applications, with a focus on security, configurability, and ease of use.

## Features

- **Secure Storage**: Encrypts API keys before storing them in the browser
- **Multiple Storage Options**: Supports both `localStorage` (persistent) and `sessionStorage` (temporary)
- **Password Protection**: Optional password protection for persistent storage
- **Configurable Expiration**: Set keys to expire after a specific duration
- **Multiple Provider Support**: Store keys for different API providers (Mistral, OpenAI, etc.)
- **Provider-specific Validation**: Automatically validates key formats for each provider
- **Legacy Migration**: Seamlessly migrates from older storage formats
- **Comprehensive Error Handling**: User-friendly error messages for common issues

## Usage Examples

### Storing an API Key

```typescript
import { WebApiKeyStorage } from "../adapters/web/api-storage";

const apiKeyStorage = new WebApiKeyStorage();

// Store a key for session only (no password required)
await apiKeyStorage.storeApiKey("your-api-key-here", {
  storageType: "session",
  provider: "mistral"
});

// Store a key with password protection and expiration
await apiKeyStorage.storeApiKey("your-api-key-here", {
  storageType: "local",
  password: "secure-password-123",
  expiration: "7days",
  provider: "openai"
});
```

### Retrieving an API Key

```typescript
// Retrieve a non-password-protected key
const apiKey = await apiKeyStorage.retrieveApiKey(undefined, "mistral");

// Retrieve a password-protected key
const apiKey = await apiKeyStorage.retrieveApiKey("secure-password-123", "openai");
```

### Checking for Stored Keys

```typescript
// Check if any keys are stored
const hasAnyKey = apiKeyStorage.hasApiKey();

// Check if a specific provider has a key
const hasMistralKey = apiKeyStorage.hasApiKey("mistral");

// Get all providers with stored keys
const providers = apiKeyStorage.getStoredProviders();
```

### Managing Keys

```typescript
// Clear a specific provider's key
apiKeyStorage.clearApiKey("mistral");

// Clear all stored keys
apiKeyStorage.clearApiKey();

// Check if a key is password protected
const isProtected = apiKeyStorage.isPasswordProtected("openai");

// Check if a key has expired
const hasExpired = apiKeyStorage.hasExpired("mistral");
```

## Architecture

The module follows a modular architecture with a clear separation between public API and implementation details:

- **Public API**: Defined in `api-key-storage.ts` with interfaces and types
- **Implementation**: Internal components in the `internal` directory
- **Error Handling**: Custom error types for better user experience
- **Provider System**: Extensible provider registry for supporting multiple APIs

### Component Relationships

```
┌─────────────────────┐
│  WebApiKeyStorage   │
└─────────────────────┘
           │
           │ uses
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│   ProviderRegistry   │◄────│Provider Implementations│
└─────────────────────┘     └─────────────────────┘
           │
           │ uses
           ▼
┌─────────────────────┐     ┌─────────────────────┐
│  StorageOperations  │     │  ExpirationService  │
└─────────────────────┘     └─────────────────────┘
           │                          │
           │ uses                     │ uses
           ▼                          ▼
┌─────────────────────┐     ┌─────────────────────┐
│  encryption-utils   │     │  password-utils     │
└─────────────────────┘     └─────────────────────┘
```

## API Reference

### WebApiKeyStorage

The main class that implements the `ApiKeyStorage` interface.

#### Methods

- `storeApiKey(apiKey: string, options?: ApiKeyStorageOptions): Promise<void>`
- `retrieveApiKey(password?: string, provider?: ApiProvider): Promise<string | null>`
- `hasApiKey(provider?: ApiProvider): boolean`
- `validateApiKey(apiKey: string, provider?: ApiProvider): boolean`
- `clearApiKey(provider?: ApiProvider): void`
- `getStorageType(provider?: ApiProvider): ApiKeyStorageType | null`
- `getExpiration(provider?: ApiProvider): ApiKeyExpiration | null`
- `hasExpired(provider?: ApiProvider): boolean`
- `isPasswordProtected(provider?: ApiProvider): boolean`
- `getStoredProviders(): ApiProvider[]`

### ApiKeyStorageOptions

Options for storing API keys.

```typescript
interface ApiKeyStorageOptions {
  password?: string;
  storageType?: ApiKeyStorageType; // "local" | "session"
  expiration?: ApiKeyExpiration; // "session" | "1day" | "7days" | "30days" | "never"
  provider?: ApiProvider; // "mistral" | "openai"
}
```

### Providers

The module includes a provider registry system that manages different API providers:

- **MistralProvider**: Handles Mistral AI API keys
- **OpenAIProvider**: Handles OpenAI API keys

## Error Handling

The module uses the `ApiKeyStorageError` class for all errors, providing clear and user-friendly error messages.

Common error scenarios:

- Missing password for persistent storage
- Weak password that doesn't meet requirements
- Incorrect password during retrieval
- Invalid API key format
- Corrupted storage data
- Expired API keys
