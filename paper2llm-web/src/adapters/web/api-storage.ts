// AI Summary: Implements secure API key storage using localStorage/sessionStorage with XOR encryption.
// Provides validation, storage, retrieval and management of API keys with expiration options.
// Supports both persistent and session-based storage with configurable expiration periods.

import { ApiKeyStorage, ApiKeyStorageType, ApiKeyExpiration, ApiKeyStorageOptions } from '../../types/interfaces';

/**
 * Implements the ApiKeyStorage interface for web browsers
 * using localStorage or sessionStorage with encryption for secure storage
 */
export class WebApiKeyStorage implements ApiKeyStorage {
  // Storage keys
  private readonly storageKey = 'paper2llm_api_key';
  private readonly protectedKey = 'paper2llm_api_key_protected';
  private readonly storageTypeKey = 'paper2llm_storage_type';
  private readonly expirationKey = 'paper2llm_api_key_expiration';
  private readonly expirationTimeKey = 'paper2llm_api_key_expiration_time';
  
  // Validation
  private readonly validationRegex = /^[A-Za-z0-9-_]{32,64}$/; // Common format for API keys

  // Expiration durations in milliseconds
  private readonly expirationDurations: Record<ApiKeyExpiration, number> = {
    'session': 0, // Session expiration is handled by sessionStorage
    '1day': 24 * 60 * 60 * 1000,
    '7days': 7 * 24 * 60 * 60 * 1000,
    '30days': 30 * 24 * 60 * 60 * 1000,
    'never': 0 // No expiration
  };

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
   * Gets the appropriate storage based on the storage type
   */
  private getStorage(storageType: ApiKeyStorageType = 'local'): Storage {
    return storageType === 'local' ? localStorage : sessionStorage;
  }

  /**
   * Calculate an expiration timestamp based on the expiration type
   */
  private calculateExpirationTime(expiration: ApiKeyExpiration): number | null {
    if (expiration === 'never') {
      return null;
    }
    
    if (expiration === 'session') {
      return null; // Session expiration is handled by sessionStorage
    }
    
    const duration = this.expirationDurations[expiration];
    return Date.now() + duration;
  }

  /**
   * Stores an API key securely in the selected storage
   */
  async storeApiKey(apiKey: string, options: ApiKeyStorageOptions = {}): Promise<void> {
    const { password, storageType = 'local', expiration = 'never' } = options;
    
    if (!this.validateApiKey(apiKey)) {
      throw new Error('Invalid API key format');
    }
    
    const storage = this.getStorage(storageType);
    const encryptedKey = this.encryptApiKey(apiKey, password);
    
    // Store the encrypted key
    storage.setItem(this.storageKey, encryptedKey);
    
    // Store metadata
    storage.setItem(this.protectedKey, password ? 'true' : 'false');
    storage.setItem(this.storageTypeKey, storageType);
    storage.setItem(this.expirationKey, expiration);
    
    // Calculate and store expiration time if applicable
    const expirationTime = this.calculateExpirationTime(expiration);
    if (expirationTime !== null) {
      storage.setItem(this.expirationTimeKey, expirationTime.toString());
    } else {
      storage.removeItem(this.expirationTimeKey);
    }
  }

  /**
   * Retrieves the API key from storage, checking expiration first
   */
  async retrieveApiKey(password?: string): Promise<string | null> {
    // Check if the key has expired
    if (this.hasExpired()) {
      this.clearApiKey();
      return null;
    }
    
    // Get the storage type being used
    const storageType = this.getStorageType();
    if (!storageType) {
      return null;
    }
    
    const storage = this.getStorage(storageType);
    const encryptedKey = storage.getItem(this.storageKey);
    
    if (!encryptedKey) {
      return null;
    }
    
    const isProtected = storage.getItem(this.protectedKey) === 'true';
    
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
   * Checks if an API key is stored in either storage
   */
  hasApiKey(): boolean {
    // Check localStorage first
    if (localStorage.getItem(this.storageKey) !== null) {
      // If there's a key but it's expired, clear it and return false
      if (this.hasExpired()) {
        this.clearApiKey();
        return false;
      }
      return true;
    }
    
    // Then check sessionStorage
    if (sessionStorage.getItem(this.storageKey) !== null) {
      return true;
    }
    
    return false;
  }

  /**
   * Gets the storage type being used for the API key
   */
  getStorageType(): ApiKeyStorageType | null {
    // Check localStorage first for storage type
    const localStorageType = localStorage.getItem(this.storageTypeKey) as ApiKeyStorageType | null;
    if (localStorageType && localStorage.getItem(this.storageKey)) {
      return localStorageType;
    }
    
    // Then check sessionStorage
    const sessionStorageType = sessionStorage.getItem(this.storageTypeKey) as ApiKeyStorageType | null;
    if (sessionStorageType && sessionStorage.getItem(this.storageKey)) {
      return sessionStorageType;
    }
    
    return null;
  }

  /**
   * Gets the expiration setting for the stored API key
   */
  getExpiration(): ApiKeyExpiration | null {
    const storageType = this.getStorageType();
    if (!storageType) {
      return null;
    }
    
    const storage = this.getStorage(storageType);
    const expiration = storage.getItem(this.expirationKey) as ApiKeyExpiration | null;
    
    return expiration;
  }

  /**
   * Checks if the stored API key has expired
   */
  hasExpired(): boolean {
    const storageType = this.getStorageType();
    if (!storageType) {
      return false;
    }
    
    const storage = this.getStorage(storageType);
    
    // Session storage keys expire with the session, so they never "expire" while available
    if (storageType === 'session') {
      return false;
    }
    
    const expirationTimeStr = storage.getItem(this.expirationTimeKey);
    if (!expirationTimeStr) {
      // If no expiration time is set, the key doesn't expire
      return false;
    }
    
    const expirationTime = parseInt(expirationTimeStr, 10);
    return Date.now() > expirationTime;
  }

  /**
   * Checks if API key is password protected
   */
  isPasswordProtected(): boolean {
    const storageType = this.getStorageType();
    if (!storageType) {
      return false;
    }
    
    const storage = this.getStorage(storageType);
    return storage.getItem(this.protectedKey) === 'true';
  }

  /**
   * Validates the format of an API key
   */
  validateApiKey(apiKey: string): boolean {
    // Perform basic validation of API key format
    return this.validationRegex.test(apiKey);
  }

  /**
   * Removes the API key from storage
   */
  clearApiKey(): void {
    // Clear from localStorage
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.protectedKey);
    localStorage.removeItem(this.storageTypeKey);
    localStorage.removeItem(this.expirationKey);
    localStorage.removeItem(this.expirationTimeKey);
    
    // Clear from sessionStorage
    sessionStorage.removeItem(this.storageKey);
    sessionStorage.removeItem(this.protectedKey);
    sessionStorage.removeItem(this.storageTypeKey);
    sessionStorage.removeItem(this.expirationKey);
    sessionStorage.removeItem(this.expirationTimeKey);
  }
}

// Create a singleton instance for easy import
export const webApiKeyStorage = new WebApiKeyStorage();
