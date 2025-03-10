// AI Summary: Implements OpenAI API key provider with specific validation rules.
// Extends BaseProvider with OpenAI-specific behavior and validation patterns.

import { BaseProvider } from "./base-provider";
import { ApiProvider } from "../../api-key-storage";

/**
 * Provider implementation for OpenAI API keys
 *
 * Handles OpenAI-specific validation and storage patterns.
 * OpenAI API keys have a distinctive format that this provider
 * validates against to ensure correct key format.
 */
export class OpenAIProvider extends BaseProvider {
  // Validation pattern for OpenAI API keys
  // OpenAI keys typically start with 'sk-' followed by a string of alphanumeric characters
  private readonly validationPattern = /^sk-[A-Za-z0-9]{32,64}$/;

  /**
   * Creates a new OpenAIProvider
   */
  constructor() {
    super("openai");
  }

  /**
   * Validates if an API key has the correct format for OpenAI
   *
   * OpenAI API keys typically:
   * - Start with the prefix 'sk-'
   * - Are followed by 32-64 alphanumeric characters
   *
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
