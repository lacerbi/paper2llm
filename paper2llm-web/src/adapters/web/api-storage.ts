// AI Summary: Implements secure API key storage using localStorage/sessionStorage with XOR encryption.
// Requires password for persistent storage while using auto-generated keys for session storage.
// Supports validation, storage, retrieval and API key management with improved security practices.
// Includes key integrity verification to detect incorrect passwords and prevent returning corrupted keys.

import { ApiKeyStorage, ApiKeyStorageType, ApiKeyExpiration, ApiKeyStorageOptions } from '../../types/interfaces';

/**
 * Custom error class for API key storage errors
 */
class ApiKeyStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyStorageError";
  }
}

/**
 * Password validation helper functions
 */
const passwordValidation = {
  /**
   * Checks if password meets minimum requirements:
   * - At least 8 characters long
   * - Contains at least two types of characters (letters, digits, special chars)
   */
  validatePassword(password: string): boolean {
    // Check length
    if (password.length < 8) return false;
    
    // Check character variety
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasDigits = /[0-9]/.test(password);
    const hasSpecials = /[^a-zA-Z0-9]/.test(password);
    
    const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(Boolean).length;
    
    return charTypesCount >= 2;
  },
  
  /**
   * Returns detailed error message about password requirements
   */
  getPasswordRequirementsMessage(): string {
    return 'Password must be at least 8 characters long and contain at least two different types of characters (letters, digits, special characters)';
  }
};

/**
 * Storage format for encrypted API keys
 * Includes validation data to verify decryption with the correct password
 */
interface EncryptedKeyData {
  encryptedKey: string;      // Base64 encoded XOR-encrypted API key
  validation: string;        // Base64 encoded HMAC for validation
  version: number;           // Storage format version for migrations
}

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
  private readonly storageVersion = 2; // Increment when storage format changes

  // Expiration durations in milliseconds
  private readonly expirationDurations: Record<ApiKeyExpiration, number> = {
    'session': 0, // Session expiration is handled by sessionStorage
    '1day': 24 * 60 * 60 * 1000,
    '7days': 7 * 24 * 60 * 60 * 1000,
    '30days': 30 * 24 * 60 * 60 * 1000,
    'never': 0 // No expiration
  };

  /**
   * Securely encrypts the API key using provided password or a session-based key
   * 
   * Security model:
   * - For persistent storage (localStorage), a user-provided password is required
   * - For session storage, an auto-generated random key is used
   * 
   * @param apiKey The API key to encrypt
   * @param password Optional user password (required for localStorage)
   * @returns Encrypted API key data structure
   */
  private encryptApiKey(apiKey: string, password?: string): string {
    // For session-based encryption (no password provided)
    if (!password) {
      password = this.getSessionKey();
    }
    
    // Simple XOR encryption (enhanced version)
    // Use password to generate a repeating key of appropriate length
    const keyLength = apiKey.length;
    let repeatedKey = '';
    
    // Repeat the password to match or exceed the API key length
    while (repeatedKey.length < keyLength) {
      repeatedKey += password;
    }
    
    // Trim to exact length needed
    repeatedKey = repeatedKey.substring(0, keyLength);
    
    // XOR operation between API key and expanded password
    const encrypted = Array.from(apiKey)
      .map((char, i) => {
        const keyChar = repeatedKey[i];
        return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
      })
      .join('');
    
    // Create validation data (simple HMAC) for decryption verification
    const validationSalt = this.generateValidationSalt();
    const validationData = this.createValidationData(apiKey, password, validationSalt);
    
    // Create the storage structure
    const encryptedData: EncryptedKeyData = {
      encryptedKey: btoa(encrypted),
      validation: btoa(JSON.stringify({
        salt: validationSalt,
        hmac: validationData
      })),
      version: this.storageVersion
    };
    
    return btoa(JSON.stringify(encryptedData));
  }

  /**
   * Generate a random salt for validation
   */
  private generateValidationSalt(): string {
    if (window.crypto && window.crypto.getRandomValues) {
      // Generate 8 random bytes using Web Crypto API
      const randomBytes = new Uint8Array(8);
      window.crypto.getRandomValues(randomBytes);
      
      // Convert to base64 string for storage
      let binaryString = '';
      for (let i = 0; i < randomBytes.length; i++) {
        binaryString += String.fromCharCode(randomBytes[i]);
      }
      return btoa(binaryString);
    } else {
      // Fallback to less secure random generation
      return Math.random().toString(36).substring(2, 10) + 
             Math.random().toString(36).substring(2, 10);
    }
  }

  /**
   * Creates a validation hash from the API key and password
   * This allows verification that decryption was performed with the correct password
   */
  private createValidationData(apiKey: string, password: string, salt: string): string {
    // Simple HMAC-like function using the password and salt
    const message = apiKey + salt;
    let hmac = '';
    
    // Create a hash using password as the key
    for (let i = 0; i < message.length; i++) {
      const charCode = message.charCodeAt(i);
      const keyChar = password.charCodeAt(i % password.length);
      hmac += String.fromCharCode((charCode + keyChar) % 256);
    }
    
    return btoa(hmac); // Base64 encode
  }

  /**
   * Decrypts the stored API key
   * Added validation to detect incorrect passwords
   * 
   * @param encryptedData The encrypted API key data (Base64 encoded JSON string)
   * @param password Optional user password (required if key was encrypted with password)
   * @returns The decrypted API key
   * @throws ApiKeyStorageError if password is incorrect or data is corrupted
   */
  private decryptApiKey(encryptedData: string, password?: string): string {
    if (!password) {
      // Use a session-based key if no password provided
      password = this.getSessionKey();
    }
    
    try {
      // Parse the encrypted data
      const parsedData: EncryptedKeyData = JSON.parse(atob(encryptedData));
      
      // Handle legacy format migration (version 1 or undefined)
      if (!parsedData.version || parsedData.version < 2) {
        return this.decryptLegacyApiKey(parsedData.encryptedKey || encryptedData, password);
      }
      
      const encryptedKey = parsedData.encryptedKey;
      const validationInfo = JSON.parse(atob(parsedData.validation));
      
      // Step 1: Decrypt the key using XOR
      const encrypted = atob(encryptedKey); // Base64 decode
      
      // Use the same repeating key technique for decryption
      const keyLength = encrypted.length;
      let repeatedKey = '';
      
      // Repeat the password to match the encrypted data length
      while (repeatedKey.length < keyLength) {
        repeatedKey += password;
      }
      
      // Trim to exact length needed
      repeatedKey = repeatedKey.substring(0, keyLength);
      
      // XOR decryption
      const decrypted = Array.from(encrypted)
        .map((char, i) => {
          const keyChar = repeatedKey[i];
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        })
        .join('');
      
      // Step 2: Validate the decryption using validation data
      const validationSalt = validationInfo.salt;
      const storedValidation = validationInfo.hmac;
      const calculatedValidation = this.createValidationData(decrypted, password, validationSalt);
      
      // If validation doesn't match, the password is incorrect
      if (storedValidation !== calculatedValidation) {
        throw new ApiKeyStorageError("Incorrect password. Please try again.");
      }
      
      // Step 3: Verify decrypted value has valid API key format
      if (!this.validateApiKey(decrypted)) {
        throw new ApiKeyStorageError("Decryption produced an invalid API key. Please try again with the correct password.");
      }
      
      return decrypted;
    } catch (error) {
      // Convert any JSON parsing errors to more user-friendly messages
      if (error instanceof SyntaxError) {
        throw new ApiKeyStorageError("Stored API key appears to be corrupted. You may need to clear it and enter a new key.");
      }
      
      // Pass through ApiKeyStorageError instances
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      
      // Generic error
      throw new ApiKeyStorageError("Failed to decrypt API key. Please check that your password is correct.");
    }
  }

  /**
   * Legacy decryption method for backward compatibility
   * Used for keys stored with version 1 of the storage format
   */
  private decryptLegacyApiKey(encryptedKey: string, password: string): string {
    try {
      const encrypted = atob(encryptedKey); // Base64 decode
      
      // Use the same repeating key technique for decryption
      const keyLength = encrypted.length;
      let repeatedKey = '';
      
      // Repeat the password to match the encrypted data length
      while (repeatedKey.length < keyLength) {
        repeatedKey += password;
      }
      
      // Trim to exact length needed
      repeatedKey = repeatedKey.substring(0, keyLength);
      
      // XOR decryption
      const decrypted = Array.from(encrypted)
        .map((char, i) => {
          const keyChar = repeatedKey[i];
          return String.fromCharCode(char.charCodeAt(0) ^ keyChar.charCodeAt(0));
        })
        .join('');
      
      // Verify decrypted value has valid API key format
      if (!this.validateApiKey(decrypted)) {
        throw new ApiKeyStorageError("Incorrect password or corrupted storage. The decrypted value is not a valid API key.");
      }
      
      return decrypted;
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError("Failed to decrypt legacy API key format. You may need to clear and re-enter your API key.");
    }
  }

  /**
   * Gets or creates a secure session-based encryption key
   * Uses Web Crypto API when available for better randomness
   * 
   * @returns A session-specific encryption key
   */
  private getSessionKey(): string {
    const sessionKeyName = 'paper2llm_session_key';
    let sessionKey = sessionStorage.getItem(sessionKeyName);
    
    if (!sessionKey) {
      // Generate a random session key with enhanced security when available
      if (window.crypto && window.crypto.getRandomValues) {
        // Generate 32 random bytes (256 bits) using Web Crypto API
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);
        
        // Convert to base64 string for storage without using spread operator
        // This avoids TypeScript downlevelIteration issues
        let binaryString = '';
        for (let i = 0; i < randomBytes.length; i++) {
          binaryString += String.fromCharCode(randomBytes[i]);
        }
        sessionKey = btoa(binaryString);
      } else {
        // Fallback to less secure random generation
        sessionKey = Array.from(
          { length: 32 },
          () => Math.floor(Math.random() * 36).toString(36)
        ).join('');
      }
      
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
   * 
   * Security rules:
   * - For localStorage (persistent), a password is REQUIRED
   * - For sessionStorage, password is optional (auto-generated if not provided)
   * 
   * @param apiKey The API key to store
   * @param options Storage options including storage type, password, and expiration
   * @throws ApiKeyStorageError if trying to use localStorage without a password
   */
  async storeApiKey(apiKey: string, options: ApiKeyStorageOptions = {}): Promise<void> {
    const { password, storageType = 'local', expiration = 'never' } = options;
    
    // Validate API key format
    if (!this.validateApiKey(apiKey)) {
      throw new ApiKeyStorageError('Invalid API key format');
    }
    
    // For persistent storage (localStorage), password is required
    if (storageType === 'local') {
      if (!password) {
        throw new ApiKeyStorageError('Password is required for persistent storage');
      }
      
      // Validate password strength
      if (!passwordValidation.validatePassword(password)) {
        throw new ApiKeyStorageError(passwordValidation.getPasswordRequirementsMessage());
      }
    }
    
    const storage = this.getStorage(storageType);
    const encryptedKeyData = this.encryptApiKey(apiKey, password);
    
    // Store the encrypted key
    storage.setItem(this.storageKey, encryptedKeyData);
    
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
   * 
   * @param password Password for decryption (required if key was stored with password)
   * @returns The decrypted API key or null if not found/expired
   * @throws ApiKeyStorageError if password is required but not provided or incorrect
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
    const encryptedData = storage.getItem(this.storageKey);
    
    if (!encryptedData) {
      return null;
    }
    
    const isProtected = storage.getItem(this.protectedKey) === 'true';
    
    // If the key is password-protected but no password provided, throw error
    if (isProtected && !password) {
      throw new ApiKeyStorageError('Password required to retrieve API key');
    }
    
    try {
      return this.decryptApiKey(encryptedData, isProtected ? password : undefined);
    } catch (error) {
      // Rethrow with a more user-friendly message
      if (error instanceof ApiKeyStorageError) {
        throw error;
      } else {
        throw new ApiKeyStorageError('Failed to decrypt API key');
      }
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
