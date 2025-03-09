// AI Summary: Implements Mistral API key provider with specific validation rules.
// Extends BaseProvider with Mistral-specific behavior and validation patterns.

import { BaseProvider } from "./base-provider";
import { ApiProvider } from "../../../../types/interfaces";

/**
 * Provider implementation for Mistral API keys
 * 
 * Handles Mistral-specific validation and storage patterns.
 * Mistral API keys typically follow a specific format that this
 * provider validates against.
 */
export class MistralProvider extends BaseProvider {
  // Validation pattern for Mistral API keys
  private readonly validationPattern = /^[A-Za-z0-9-_]{32,64}$/;

  /**
   * Creates a new MistralProvider
   */
  constructor() {
    super("mistral");
  }

  /**
   * Validates if an API key has the correct format for Mistral
   * 
   * Mistral API keys typically:
   * - Are between 32-64 characters long
   * - Contain only alphanumeric characters, hyphens, and underscores
   * 
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
