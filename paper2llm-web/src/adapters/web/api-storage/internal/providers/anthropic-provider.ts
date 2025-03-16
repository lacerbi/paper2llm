// AI Summary: Implements Anthropic API key provider with specific validation rules.
// Extends BaseProvider with Anthropic-specific behavior and validation patterns.

import { BaseProvider } from "./base-provider";
import { ApiProvider } from "../../api-key-storage";

/**
 * Provider implementation for Anthropic API keys
 *
 * Handles Anthropic-specific validation and storage patterns.
 * Anthropic API keys typically follow a specific format that this
 * provider validates against.
 */
export class AnthropicProvider extends BaseProvider {
  // Validation pattern for Anthropic API keys
  private readonly validationPattern = /^sk-ant-[A-Za-z0-9-_]{24,}$/;

  /**
   * Creates a new AnthropicProvider
   */
  constructor() {
    super("anthropic");
  }

  /**
   * Validates if an API key has the correct format for Anthropic
   *
   * Anthropic API keys typically:
   * - Start with the prefix 'sk-ant-'
   * - Followed by at least 24 alphanumeric characters
   *
   * @param apiKey The API key to validate
   * @returns true if the API key has a valid format, false otherwise
   */
  validateApiKey(apiKey: string): boolean {
    return this.validationPattern.test(apiKey);
  }
}
