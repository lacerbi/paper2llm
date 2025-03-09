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

## Architecture

The module follows a modular architecture with separate components for different concerns:

- **WebApiKeyStorage**: Main class implementing the `ApiKeyStorage` interface
- **ProviderRegistry**: Central registry for provider implementations
- **Provider Implementations**: Provider-specific classes for key validation and storage
- **StorageOperations**: Handles localStorage/sessionStorage operations
- **ExpirationService**: Manages key expiration policies
- **Encryption Utilities**: Handles secure encryption/decryption of API keys
- **Password Validation**: Enforces secure password requirements
- **Error Handling**: Provides specific error types and messages

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

### Security Model

1. **Session-based Storage**: Uses auto-generated random keys for session-only storage
2. **Password-based Storage**: Requires user-provided passwords for persistent storage
3. **XOR Encryption**: Implements basic but effective XOR encryption with password expansion
4. **Validation Hashing**: Includes validation data to verify correct password during decryption
5. **Automatic Expiration**: Supports key expiration to limit the validity period
6. **Provider-specific Validation**: Ensures keys match the expected format for each provider

## Usage Examples

### Storing an API Key

```typescript
import { WebApiKeyStorage } from "../api-storage";

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

See the [providers README](./providers/README.md) for more details on the provider system.

## Error Handling

The module uses the `ApiKeyStorageError` class for all errors, providing clear and user-friendly error messages.

Common error scenarios:

- Missing password for persistent storage
- Weak password that doesn't meet requirements
- Incorrect password during retrieval
- Invalid API key format
- Corrupted storage data
- Expired API keys

## Key Storage Format

API keys are stored in the following format:

```typescript
interface EncryptedKeyData {
  encryptedKey: string; // Base64 encoded XOR-encrypted API key
  validation: string; // Base64 encoded HMAC for validation
  version: number; // Storage format version for migrations
  provider?: ApiProvider; // Provider identifier (added in version 3)
}
```

This data structure is serialized to JSON and Base64 encoded before being stored in either localStorage or sessionStorage.
