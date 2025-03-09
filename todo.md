# TO DOs

- Include support for multiple API providers.
  - We still need Mistral AI API for the OCR part, but we can use others for the vision model.
  - At the very least, add OpenAI API.

<ath command="task">
# Task: Add Support for Multiple LLM Providers

Extend the paper2llm application to support multiple LLM providers (and their respective API keys), while maintaining a clean user interface and preserving the Mistral AI provider for OCR functionality. This includes:

1. Modify the storage mechanism to store multiple API keys (one per provider)
2. Update the UI to allow selection of providers and entry of their API keys
3. Integrate provider selection with existing model selection capabilities
4. Maintain minimal UI changes by extending the current API key management interface
5. Centralize password protection for all API keys
6. Update the backend services to use the appropriate provider API keys

# Analysis

The current application is designed to use Mistral AI for both OCR (PDF processing) and vision (image description) with a single API key. The key aspects that need to be modified are:

1. **API Key Storage System**: Currently, `WebApiKeyStorage` in `api-storage.ts` stores only one key. We need to extend this to store multiple keys identified by provider.

2. **API Key Management UI**: `ApiKeyManager.tsx` provides UI for a single key. This needs to be enhanced to support provider selection and multiple keys.

3. **Service Integration**: The image and OCR services need to be updated to accept and use different provider keys based on selection.

4. **App State Management**: The main App component needs to track multiple API keys and their validity.

The architecture is well-structured with clear separation of concerns, which facilitates these changes without requiring a complete redesign.

# Implementation Plan

## Commit 1: Extend API Key Storage for Multiple Providers

- Description: Modify the API key storage system to support multiple providers while maintaining backward compatibility with existing stored keys.
- Files to modify:

  - src/types/interfaces.ts
  - src/adapters/web/api-storage.ts

- Steps:

  1. Update interfaces.ts to add provider support:

     - Modify `ApiKeyStorageOptions` to include an optional `provider` field
     - Add a new `ApiProvider` type representing supported providers (e.g., 'mistral', 'openai')
     - Update `ApiKeyStorage` interface to include methods for managing provider-specific keys

  2. Update api-storage.ts:
     - Add provider-specific storage keys (e.g., `paper2llm_api_key_mistral`, `paper2llm_api_key_openai`)
     - Modify `storeApiKey` to accept provider parameter
     - Update `retrieveApiKey` to get key for specific provider
     - Create helper methods to handle provider-specific operations
     - Ensure backward compatibility by mapping legacy keys to Mistral provider
     - Update storage structure to include provider identifier
     - Make password protection apply across all providers

- Verification:
  - Ensure existing stored keys (without provider) are still accessible
  - Verify new keys can be stored with provider identifiers
  - Check that retrieval works correctly for different providers
  - Verify password protection works across all providers

## Commit 2: Enhance ApiKeyManager Component for Multiple Providers

- Description: Update the API key management UI to support selection of providers and management of multiple keys.
- Files to modify:
  - src/web/components/ApiKeyManager.tsx
  - src/types/interfaces.ts (for updated ApiKeyManagerState)
- Dependencies: Requires Commit 1

- Steps:

  1. Update interfaces.ts to enhance ApiKeyManagerState:

     - Add `selectedProvider` field
     - Modify `apiKey` to be provider-specific or add a mapping of providers to keys
     - Update `isValid` to track validity per provider

  2. Update ApiKeyManager.tsx:

     - Add dropdown for provider selection (Mistral AI, OpenAI)
     - Make UI conditional based on selected provider
     - Update logic to store/retrieve provider-specific keys
     - Modify state management to track multiple keys
     - Adjust validation logic for different API key formats
     - Update UI to show provider-specific information
     - Ensure password protection works across all providers
     - Keep the UI clean and intuitive despite added complexity

  3. Update component API:
     - Modify onApiKeyChange callback to include provider information
     - Add methods to check validity for specific providers

- Verification:
  - UI allows selection of different providers
  - Keys can be stored and retrieved for each provider
  - UI remains clean and intuitive
  - Password protection works for all providers
  - Visual feedback (errors, validation) is provider-aware

## Commit 3: Update Image Service for Multiple Providers

- Description: Modify the image service to support different API endpoints and authentication methods based on provider.
- Files to modify:
  - src/core/image-service.ts
  - src/types/interfaces.ts (for ImageService interface)
- Dependencies: Requires Commit 1

- Steps:

  1. Update ImageService interface in interfaces.ts:

     - Modify to accept provider information in methods
     - Add provider-specific options and parameters

  2. Update image-service.ts:
     - Create a factory or strategy pattern for provider-specific implementations
     - Add support for OpenAI vision endpoints and authentication
     - Update `describeImage` and `describeImages` to handle different providers
     - Implement provider-specific request formatting and response handling
     - Update error handling for provider-specific errors
     - Ensure backward compatibility
     - Map Mistral models to provider-specific models

- Verification:
  - Image description works with Mistral API key
  - Image description works with OpenAI API key
  - Appropriate API endpoints are used based on provider
  - Errors are handled correctly for each provider

## Commit 4: Integrate Multi-Provider Support in App Component

- Description: Update the main App component to manage multiple providers, keys, and models.
- Files to modify:
  - src/web/App.tsx
  - src/pdf-to-md.ts (if needed)
- Dependencies: Requires Commits 1-3

- Steps:

  1. Update App.tsx state management:

     - Track provider-specific API keys and validity
     - Add provider selection state
     - Connect provider selection with model selection

  2. Update component integration:

     - Pass provider information to ApiKeyManager
     - Update callback handling for multiple keys
     - Pass appropriate keys to services based on operation
     - Ensure OCR always uses Mistral (per requirements)
     - Update model selection to show provider-specific models
     - Adapt process flow to use correct provider/model combinations

  3. Update UI to communicate provider requirements:
     - Make it clear which operations require which providers
     - Provide guidance on obtaining API keys for different providers

- Verification:
  - End-to-end test with different providers
  - Verify OCR works with Mistral key
  - Verify image description works with different provider keys
  - Check that UI properly communicates provider requirements
  - Ensure model selection works correctly with provider selection
    </ath>

<ath command="select">
src/types/interfaces.ts
src/adapters/web/api-storage.ts
src/web/components/ApiKeyManager.tsx
src/core/image-service.ts
src/web/App.tsx
src/core/pdf-to-md.ts
package.json
</ath>
