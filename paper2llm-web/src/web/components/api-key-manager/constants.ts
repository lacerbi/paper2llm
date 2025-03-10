// AI Summary: Centralizes provider configurations with validation patterns and documentation links.
// Defines API key provider information including name, description, validation patterns, and documentation URLs.

import { ProviderApiKeyInfo, ApiProvider } from "../../../types/interfaces";

/**
 * Provider configurations with validation patterns and documentation links
 */
export const PROVIDER_INFO: Record<ApiProvider, ProviderApiKeyInfo> = {
  mistral: {
    name: "Mistral AI",
    description: "Required for both OCR and vision capabilities",
    validationPattern: /^[A-Za-z0-9-_]{32,64}$/,
    docsUrl: "https://console.mistral.ai/api-keys",
  },
  openai: {
    name: "OpenAI",
    description: "Optional, for enhanced vision capabilities",
    validationPattern: /^sk-[A-Za-z0-9]{32,64}$/,
    docsUrl: "https://platform.openai.com/api-keys",
  },
};
