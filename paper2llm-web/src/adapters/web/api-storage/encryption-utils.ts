// AI Summary: Provides utilities for secure API key encryption and validation.
// Implements XOR encryption with password, validation hash generation, and secure salt creation.
// Supports both password-based and automatic session-based encryption with validation.

import { EncryptedKeyData, ValidationInfo } from "./interfaces";
import { ApiKeyStorageError } from "./errors";
import { ApiProvider } from "../../../types/interfaces";

/**
 * Encryption and validation utilities for secure API key storage
 * 
 * This module provides a set of utilities for encrypting, decrypting, and validating API keys
 * with either user-provided passwords or auto-generated session keys.
 * 
 * Security model:
 * - Uses simple but effective XOR encryption with password expansion
 * - Implements validation to verify decryption was performed with correct password
 * - Supports secure random salt generation using Web Crypto API when available
 * - Handles migration from legacy storage formats
 */
export const encryptionUtils = {
  /**
   * Securely encrypts the API key using provided password or a session-based key
   *
   * Security model:
   * - For persistent storage (localStorage), a user-provided password is required
   * - For session storage, an auto-generated random key is used
   * - Uses XOR encryption with password expansion for basic security
   * - Adds validation data to verify correct decryption
   * - Stores provider information to support multiple API providers
   *
   * @param apiKey The API key to encrypt
   * @param password The password to use for encryption
   * @param provider The provider for this API key
   * @param storageVersion The version number for the storage format
   * @param defaultProvider The default provider to use if none specified
   * @returns Encrypted API key data as a Base64 encoded string
   */
  encryptApiKey(
    apiKey: string,
    password: string,
    provider: ApiProvider | undefined,
    storageVersion: number,
    defaultProvider: ApiProvider
  ): string {
    // Simple XOR encryption (enhanced version)
    // Use password to generate a repeating key of appropriate length
    const keyLength = apiKey.length;
    let repeatedKey = "";

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
      .join("");

    // Create validation data (simple HMAC) for decryption verification
    const validationSalt = this.generateValidationSalt();
    const validationData = this.createValidationData(
      apiKey,
      password,
      validationSalt
    );

    // Create the storage structure with provider information if available
    const encryptedData: EncryptedKeyData = {
      encryptedKey: btoa(encrypted),
      validation: btoa(
        JSON.stringify({
          salt: validationSalt,
          hmac: validationData,
        })
      ),
      version: storageVersion,
      provider: provider || defaultProvider,
    };

    return btoa(JSON.stringify(encryptedData));
  },

  /**
   * Generate a random salt for validation
   * Uses Web Crypto API when available for better randomness, with fallback
   * for older browsers. The salt is used to prevent rainbow table attacks
   * when validating decryption.
   * 
   * @returns A random salt as a Base64 string
   */
  generateValidationSalt(): string {
    if (window.crypto && window.crypto.getRandomValues) {
      // Generate 8 random bytes using Web Crypto API
      const randomBytes = new Uint8Array(8);
      window.crypto.getRandomValues(randomBytes);

      // Convert to base64 string for storage
      let binaryString = "";
      for (let i = 0; i < randomBytes.length; i++) {
        binaryString += String.fromCharCode(randomBytes[i]);
      }
      return btoa(binaryString);
    } else {
      // Fallback to less secure random generation
      return (
        Math.random().toString(36).substring(2, 10) +
        Math.random().toString(36).substring(2, 10)
      );
    }
  },

  /**
   * Creates a validation hash from the API key and password
   * This allows verification that decryption was performed with the correct password.
   * Works similarly to an HMAC function, creating a unique signature based on 
   * the API key, password, and a random salt.
   * 
   * @param apiKey The API key to validate
   * @param password The password used for encryption
   * @param salt A random salt to prevent rainbow table attacks
   * @returns Base64 encoded validation hash
   */
  createValidationData(
    apiKey: string,
    password: string,
    salt: string
  ): string {
    // Simple HMAC-like function using the password and salt
    const message = apiKey + salt;
    let hmac = "";

    // Create a hash using password as the key
    for (let i = 0; i < message.length; i++) {
      const charCode = message.charCodeAt(i);
      const keyChar = password.charCodeAt(i % password.length);
      hmac += String.fromCharCode((charCode + keyChar) % 256);
    }

    return btoa(hmac); // Base64 encode
  },

  /**
   * Decrypts the stored API key
   * This function performs the reverse of encryptApiKey, retrieving the original API key.
   * It includes validation to detect incorrect passwords and verify the decrypted key format.
   *
   * The decryption process:
   * 1. Parses the encrypted data structure
   * 2. Performs XOR decryption using the provided password
   * 3. Validates the decryption using stored validation data
   * 4. Verifies the decrypted key has valid format for the provider
   *
   * @param encryptedData The encrypted API key data (Base64 encoded JSON string)
   * @param password The password to use for decryption
   * @param validateApiKey Function to validate the decrypted API key format
   * @param defaultProvider The default provider to use if none specified
   * @returns The decrypted API key
   * @throws ApiKeyStorageError if password is incorrect or data is corrupted
   */
  decryptApiKey(
    encryptedData: string,
    password: string,
    validateApiKey: (key: string, provider: ApiProvider) => boolean,
    defaultProvider: ApiProvider
  ): string {
    try {
      // Parse the encrypted data
      const parsedData: EncryptedKeyData = JSON.parse(atob(encryptedData));
      const encryptedKey = parsedData.encryptedKey;
      const validationInfo = JSON.parse(atob(parsedData.validation)) as ValidationInfo;

      // Step 1: Decrypt the key using XOR
      const encrypted = atob(encryptedKey); // Base64 decode

      // Use the same repeating key technique for decryption
      const keyLength = encrypted.length;
      let repeatedKey = "";

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
          return String.fromCharCode(
            char.charCodeAt(0) ^ keyChar.charCodeAt(0)
          );
        })
        .join("");

      // Step 2: Validate the decryption using validation data
      const validationSalt = validationInfo.salt;
      const storedValidation = validationInfo.hmac;
      const calculatedValidation = this.createValidationData(
        decrypted,
        password,
        validationSalt
      );

      // If validation doesn't match, the password is incorrect
      if (storedValidation !== calculatedValidation) {
        throw new ApiKeyStorageError("Incorrect password. Please try again.");
      }

      // Step 3: Verify decrypted value has valid API key format for the provider
      const provider = parsedData.provider || defaultProvider;
      if (!validateApiKey(decrypted, provider)) {
        throw new ApiKeyStorageError(
          "Decryption produced an invalid API key. Please try again with the correct password."
        );
      }

      return decrypted;
    } catch (error) {
      // Convert any JSON parsing errors to more user-friendly messages
      if (error instanceof SyntaxError) {
        throw new ApiKeyStorageError(
          "Stored API key appears to be corrupted. You may need to clear it and enter a new key."
        );
      }

      // Pass through ApiKeyStorageError instances
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }

      // Generic error
      throw new ApiKeyStorageError(
        "Failed to decrypt API key. Please check that your password is correct."
      );
    }
  },

  /**
   * Gets or creates a secure session-based encryption key
   * This function either retrieves an existing session key or generates a new one
   * when needed. Session keys are automatically generated and do not require user input.
   * 
   * The key generation:
   * - Uses Web Crypto API when available for cryptographically secure randomness
   * - Falls back to Math.random() with sufficient entropy when Web Crypto is unavailable
   * - Stores the key in sessionStorage so it persists only for the current browser session
   *
   * @returns A session-specific encryption key
   */
  getSessionKey(): string {
    const sessionKeyName = "paper2llm_session_key";
    let sessionKey = sessionStorage.getItem(sessionKeyName);

    if (!sessionKey) {
      // Generate a random session key with enhanced security when available
      if (window.crypto && window.crypto.getRandomValues) {
        // Generate 32 random bytes (256 bits) using Web Crypto API
        const randomBytes = new Uint8Array(32);
        window.crypto.getRandomValues(randomBytes);

        // Convert to base64 string for storage without using spread operator
        // This avoids TypeScript downlevelIteration issues
        let binaryString = "";
        for (let i = 0; i < randomBytes.length; i++) {
          binaryString += String.fromCharCode(randomBytes[i]);
        }
        sessionKey = btoa(binaryString);
      } else {
        // Fallback to less secure random generation
        sessionKey = Array.from({ length: 32 }, () =>
          Math.floor(Math.random() * 36).toString(36)
        ).join("");
      }

      sessionStorage.setItem(sessionKeyName, sessionKey);
    }

    return sessionKey;
  }
};
