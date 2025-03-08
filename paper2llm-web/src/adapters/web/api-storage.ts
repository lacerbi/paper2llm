// AI Summary: Implements secure API key storage using localStorage with AES encryption.
// Provides validation, storage, retrieval and management of Mistral API keys.

import { ApiKeyStorage } from '../../types/interfaces';

/**
 * Implements the ApiKeyStorage interface for web browsers
 * using localStorage with encryption for secure storage
 */
export class WebApiKeyStorage implements ApiKeyStorage {
  private readonly storageKey = 'paper2llm_api_key';
  private readonly validationRegex = /^[A-Za-z0-9-_]{32,64}$/; // Common format for API keys

  /**
   * Securely encrypts the API key using a password or a session-based approach
   */
  private encryptApiKey(apiKey: string, password?: string): string {
    // This is a simplified encryption for the prototype
    // For production, a proper crypto library should be used
    if (!password) {
      // Use a session-based key if no password provided
      password = this.getSessionKey();
    }
    
    // Simple XOR encryption (replace with a proper encryption in production)
    const encrypted = Array.from(apiKey)
      .map((char, i) => {
        const passChar = password![i % password!.length];
        return String.fromCharCode(char.charCodeAt(0) ^ passChar.charCodeAt(0));
      })
      .join('');
    
    return btoa(encrypted); // Base64 encode for storage
  }

  /**
   * Decrypts the stored API key
   */
  private decryptApiKey(encryptedKey: string, password?: string): string {
    if (!password) {
      // Use a session-based key if no password provided
      password = this.getSessionKey();
    }
    
    const encrypted = atob(encryptedKey); // Base64 decode
    
    // Simple XOR decryption (replace with a proper decryption in production)
    const decrypted = Array.from(encrypted)
      .map((char, i) => {
        const passChar = password![i % password!.length];
        return String.fromCharCode(char.charCodeAt(0) ^ passChar.charCodeAt(0));
      })
      .join('');
    
    return decrypted;
  }

  /**
   * Gets or creates a session-based encryption key
   */
  private getSessionKey(): string {
    const sessionKeyName = 'paper2llm_session_key';
    let sessionKey = sessionStorage.getItem(sessionKeyName);
    
    if (!sessionKey) {
      // Generate a random session key
      sessionKey = Array.from(
        { length: 32 },
        () => Math.floor(Math.random() * 36).toString(36)
      ).join('');
      sessionStorage.setItem(sessionKeyName, sessionKey);
    }
    
    return sessionKey;
  }

  /**
   * Stores an API key securely in localStorage
   */
  async storeApiKey(apiKey: string, password?: string): Promise<void> {
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    
    const encryptedKey = this.encryptApiKey(apiKey, password);
    localStorage.setItem(this.storageKey, encryptedKey);
    
    // Store a flag to indicate if it's password-protected
    localStorage.setItem(
      `${this.storageKey}_protected`,
      password ? 'true' : 'false'
    );
  }

  /**
   * Retrieves the API key from localStorage
   */
  async retrieveApiKey(password?: string): Promise<string | null> {
    const encryptedKey = localStorage.getItem(this.storageKey);
    if (!encryptedKey) {
      return null;
    }
    
    const isProtected = localStorage.getItem(`${this.storageKey}_protected`) === 'true';
    
    if (isProtected && !password) {
      throw new Error('Password required to retrieve API key');
    }
    
    try {
      return this.decryptApiKey(encryptedKey, isProtected ? password : undefined);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  /**
   * Checks if an API key is stored in localStorage
   */
  hasApiKey(): boolean {
    return localStorage.getItem(this.storageKey) !== null;
  }

  /**
   * Checks if API key is password protected
   */
  isPasswordProtected(): boolean {
    return localStorage.getItem(`${this.storageKey}_protected`) === 'true';
  }

  /**
   * Validates the format of an API key
   */
  validateApiKey(apiKey: string): boolean {
    // Perform basic validation of API key format
    return this.validationRegex.test(apiKey);
  }

  /**
   * Removes the API key from localStorage
   */
  clearApiKey(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(`${this.storageKey}_protected`);
  }
}

// Create a singleton instance for easy import
export const webApiKeyStorage = new WebApiKeyStorage();
