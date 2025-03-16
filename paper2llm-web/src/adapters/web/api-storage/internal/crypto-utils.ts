// AI Summary: Implements secure cryptography using Web Crypto API.
// Provides authenticated encryption (AES-GCM), key derivation (PBKDF2), and secure
// random number generation with appropriate encoding utilities and fallbacks.

import { EncryptedKeyData, ValidationInfo, CRYPTO_ALGORITHMS, CRYPTO_DEFAULTS } from "./interfaces";
import { ApiKeyStorageError } from "../errors";
import { ApiProvider } from "../api-key-storage";

/**
 * Modern cryptography utilities for secure API key storage
 *
 * This module implements secure cryptography using the Web Crypto API:
 * - AES-GCM for authenticated encryption (provides confidentiality and integrity)
 * - PBKDF2 for secure password-based key derivation
 * - Secure random number generation using Crypto.getRandomValues()
 * - Proper binary data handling with TypedArrays and text encoders
 *
 * Security features:
 * - High iteration count for PBKDF2 to resist brute-force attacks
 * - Random salt for each encryption to prevent rainbow table attacks
 * - Authenticated encryption to prevent tampering
 * - Secure random generation for all cryptographic parameters
 */
export const cryptoUtils = {
  /**
   * Checks if the Web Crypto API is available
   * 
   * @returns true if Web Crypto API is available, false otherwise
   */
  isWebCryptoAvailable(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  },

  /**
   * Generates cryptographically secure random bytes
   * 
   * Uses the Web Crypto API's getRandomValues for secure randomness.
   * Falls back to a less secure method if Web Crypto is unavailable.
   * 
   * @param length Number of bytes to generate
   * @returns Uint8Array containing random bytes
   */
  generateRandomBytes(length: number): Uint8Array {
    const bytes = new Uint8Array(length);
    
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
    } else {
      // Fallback to less secure random generation
      // This should never happen in modern browsers but is included as a failsafe
      for (let i = 0; i < length; i++) {
        bytes[i] = Math.floor(Math.random() * 256);
      }
      console.warn('Using insecure random number generation. This should not happen in modern browsers.');
    }
    
    return bytes;
  },

  /**
   * Converts a Uint8Array to a Base64 string
   * 
   * @param bytes Uint8Array to convert
   * @returns Base64 encoded string
   */
  bytesToBase64(bytes: Uint8Array): string {
    // Convert binary data to a binary string
    let binaryString = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binaryString += String.fromCharCode(bytes[i]);
    }
    // Use built-in btoa function to convert to base64
    return btoa(binaryString);
  },

  /**
   * Converts a Base64 string to a Uint8Array
   * 
   * @param base64 Base64 encoded string
   * @returns Uint8Array containing the decoded bytes
   */
  base64ToBytes(base64: string): Uint8Array {
    // Use built-in atob function to convert from base64 to binary string
    const binaryString = atob(base64);
    // Convert binary string to Uint8Array
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  },

  /**
   * Converts a string to a Uint8Array using UTF-8 encoding
   * 
   * @param str String to convert
   * @returns Uint8Array containing the UTF-8 encoded string
   */
  stringToBytes(str: string): Uint8Array {
    if (typeof TextEncoder !== 'undefined') {
      return new TextEncoder().encode(str);
    }
    
    // Fallback for browsers without TextEncoder
    const bytes = new Uint8Array(str.length * 4); // UTF-8 can use up to 4 bytes per character
    let byteIndex = 0;
    
    for (let i = 0; i < str.length; i++) {
      const codePoint = str.codePointAt(i) || 0;
      
      if (codePoint <= 0x7F) {
        // Single byte character (ASCII)
        bytes[byteIndex++] = codePoint;
      } else if (codePoint <= 0x7FF) {
        // Two byte character
        bytes[byteIndex++] = 0xC0 | (codePoint >> 6);
        bytes[byteIndex++] = 0x80 | (codePoint & 0x3F);
      } else if (codePoint <= 0xFFFF) {
        // Three byte character
        bytes[byteIndex++] = 0xE0 | (codePoint >> 12);
        bytes[byteIndex++] = 0x80 | ((codePoint >> 6) & 0x3F);
        bytes[byteIndex++] = 0x80 | (codePoint & 0x3F);
      } else {
        // Four byte character
        bytes[byteIndex++] = 0xF0 | (codePoint >> 18);
        bytes[byteIndex++] = 0x80 | ((codePoint >> 12) & 0x3F);
        bytes[byteIndex++] = 0x80 | ((codePoint >> 6) & 0x3F);
        bytes[byteIndex++] = 0x80 | (codePoint & 0x3F);
        i++; // Skip the second surrogate pair code unit
      }
    }
    
    return bytes.slice(0, byteIndex);
  },

  /**
   * Converts a Uint8Array to a string using UTF-8 decoding
   * 
   * @param bytes Uint8Array to convert
   * @returns Decoded UTF-8 string
   */
  bytesToString(bytes: Uint8Array): string {
    if (typeof TextDecoder !== 'undefined') {
      return new TextDecoder('utf-8').decode(bytes);
    }
    
    // Fallback for browsers without TextDecoder
    let result = '';
    let i = 0;
    
    while (i < bytes.length) {
      const byte1 = bytes[i++];
      
      if (byte1 <= 0x7F) {
        // Single byte character
        result += String.fromCharCode(byte1);
      } else if (byte1 >= 0xC0 && byte1 < 0xE0) {
        // Two byte character
        const byte2 = bytes[i++] & 0x3F;
        result += String.fromCharCode(((byte1 & 0x1F) << 6) | byte2);
      } else if (byte1 >= 0xE0 && byte1 < 0xF0) {
        // Three byte character
        const byte2 = bytes[i++] & 0x3F;
        const byte3 = bytes[i++] & 0x3F;
        result += String.fromCharCode(((byte1 & 0x0F) << 12) | (byte2 << 6) | byte3);
      } else if (byte1 >= 0xF0 && byte1 < 0xF8) {
        // Four byte character
        const byte2 = bytes[i++] & 0x3F;
        const byte3 = bytes[i++] & 0x3F;
        const byte4 = bytes[i++] & 0x3F;
        
        // Calculate the Unicode code point
        let codePoint = ((byte1 & 0x07) << 18) | (byte2 << 12) | (byte3 << 6) | byte4;
        
        // Split into a surrogate pair
        if (codePoint >= 0x10000) {
          codePoint -= 0x10000;
          result += String.fromCharCode(
            (codePoint >> 10) + 0xD800,
            (codePoint & 0x3FF) + 0xDC00
          );
        } else {
          result += String.fromCharCode(codePoint);
        }
      }
    }
    
    return result;
  },

  /**
   * Imports a password as a CryptoKey for PBKDF2
   * 
   * @param password The password to import
   * @returns Promise resolving to a CryptoKey
   * @throws ApiKeyStorageError if Web Crypto API is unavailable
   */
  async importPassword(password: string): Promise<CryptoKey> {
    if (!this.isWebCryptoAvailable()) {
      throw new ApiKeyStorageError(
        "Your browser doesn't support the required cryptographic features. Please use a modern browser."
      );
    }

    try {
      const passwordData = this.stringToBytes(password);
      return await window.crypto.subtle.importKey(
        'raw',
        passwordData,
        { name: CRYPTO_ALGORITHMS.PBKDF2 },
        false, // Not extractable
        ['deriveBits', 'deriveKey'] // Can be used for key derivation
      );
    } catch (error) {
      throw new ApiKeyStorageError(
        "Failed to process password for encryption. Please try again."
      );
    }
  },

  /**
   * Derives an encryption key from a password using PBKDF2
   * 
   * @param passwordKey The imported password CryptoKey
   * @param salt A random salt for key derivation
   * @param iterations Number of PBKDF2 iterations
   * @returns Promise resolving to a CryptoKey for AES-GCM
   * @throws ApiKeyStorageError if key derivation fails
   */
  async deriveKey(
    passwordKey: CryptoKey,
    salt: Uint8Array,
    iterations: number = CRYPTO_DEFAULTS.KEY_ITERATIONS
  ): Promise<CryptoKey> {
    try {
      return await window.crypto.subtle.deriveKey(
        {
          name: CRYPTO_ALGORITHMS.PBKDF2,
          salt: salt,
          iterations: iterations,
          hash: 'SHA-256'
        },
        passwordKey,
        {
          name: CRYPTO_ALGORITHMS.AES_GCM,
          length: CRYPTO_DEFAULTS.KEY_LENGTH
        },
        false, // Not extractable
        ['encrypt', 'decrypt'] // Can be used for encryption and decryption
      );
    } catch (error) {
      throw new ApiKeyStorageError(
        "Failed to derive encryption key. Please try again."
      );
    }
  },

  /**
   * Encrypts data using AES-GCM
   * 
   * @param data The data to encrypt as a Uint8Array
   * @param key The CryptoKey to use for encryption
   * @param iv The initialization vector for AES-GCM
   * @returns Promise resolving to the encrypted data as a Uint8Array
   * @throws ApiKeyStorageError if encryption fails
   */
  async encrypt(
    data: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: CRYPTO_ALGORITHMS.AES_GCM,
          iv: iv,
          tagLength: CRYPTO_DEFAULTS.TAG_LENGTH
        },
        key,
        data
      );
      
      return new Uint8Array(encryptedBuffer);
    } catch (error) {
      throw new ApiKeyStorageError(
        "Encryption failed. Please try again."
      );
    }
  },

  /**
   * Decrypts data using AES-GCM
   * 
   * @param encryptedData The encrypted data as a Uint8Array
   * @param key The CryptoKey to use for decryption
   * @param iv The initialization vector used during encryption
   * @returns Promise resolving to the decrypted data as a Uint8Array
   * @throws ApiKeyStorageError if decryption fails
   */
  async decrypt(
    encryptedData: Uint8Array,
    key: CryptoKey,
    iv: Uint8Array
  ): Promise<Uint8Array> {
    try {
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: CRYPTO_ALGORITHMS.AES_GCM,
          iv: iv,
          tagLength: CRYPTO_DEFAULTS.TAG_LENGTH
        },
        key,
        encryptedData
      );
      
      return new Uint8Array(decryptedBuffer);
    } catch (error) {
      throw new ApiKeyStorageError(
        "Decryption failed. The password may be incorrect or the data may be corrupted."
      );
    }
  },

  /**
   * Securely encrypts the API key using provided password or a session-based key
   *
   * This uses modern cryptography:
   * - PBKDF2 for secure key derivation from the password
   * - AES-GCM for authenticated encryption
   * - Random salt for key derivation
   * - Random initialization vector (IV) for encryption
   * - All cryptographic parameters stored alongside the encrypted data
   *
   * @param apiKey The API key to encrypt
   * @param password The password to use for encryption
   * @param provider The provider for this API key
   * @param storageVersion The version number for the storage format
   * @param defaultProvider The default provider to use if none specified
   * @returns Promise resolving to a Base64 encoded JSON string of the encrypted data
   * @throws ApiKeyStorageError if encryption fails
   */
  async encryptApiKey(
    apiKey: string,
    password: string,
    provider: ApiProvider | undefined,
    storageVersion: number,
    defaultProvider: ApiProvider
  ): Promise<string> {
    try {
      // Generate random salt for key derivation
      const salt = this.generateRandomBytes(CRYPTO_DEFAULTS.SALT_LENGTH);
      
      // Generate random IV for encryption
      const iv = this.generateRandomBytes(CRYPTO_DEFAULTS.IV_LENGTH);
      
      // Import the password as a CryptoKey
      const passwordKey = await this.importPassword(password);
      
      // Derive the encryption key using PBKDF2
      const encryptionKey = await this.deriveKey(
        passwordKey,
        salt,
        CRYPTO_DEFAULTS.KEY_ITERATIONS
      );
      
      // Convert the API key to bytes and encrypt it
      const apiKeyBytes = this.stringToBytes(apiKey);
      const encryptedBytes = await this.encrypt(apiKeyBytes, encryptionKey, iv);
      
      // Create the storage structure with all cryptographic parameters
      const encryptedData: EncryptedKeyData = {
        encryptedKey: this.bytesToBase64(encryptedBytes),
        salt: this.bytesToBase64(salt),
        iv: this.bytesToBase64(iv),
        iterations: CRYPTO_DEFAULTS.KEY_ITERATIONS,
        algorithm: CRYPTO_ALGORITHMS.AES_GCM,
        version: storageVersion,
        provider: provider || defaultProvider
      };
      
      // Encode the complete structure as a Base64 string
      return btoa(JSON.stringify(encryptedData));
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      
      throw new ApiKeyStorageError(
        "Failed to encrypt API key. Please try again."
      );
    }
  },

  /**
   * Decrypts the stored API key
   *
   * This function decrypts the API key using the stored cryptographic parameters:
   * 1. Parses the encrypted data structure
   * 2. Imports the password as a CryptoKey
   * 3. Derives the encryption key using the stored salt and iterations
   * 4. Decrypts the API key using AES-GCM
   * 5. Verifies the decrypted key has valid format for the provider
   *
   * @param encryptedData The encrypted API key data (Base64 encoded JSON string)
   * @param password The password to use for decryption
   * @param validateApiKey Function to validate the decrypted API key format
   * @param defaultProvider The default provider to use if none specified
   * @returns Promise resolving to the decrypted API key
   * @throws ApiKeyStorageError if password is incorrect or data is corrupted
   */
  async decryptApiKey(
    encryptedData: string,
    password: string,
    validateApiKey: (key: string, provider: ApiProvider) => boolean,
    defaultProvider: ApiProvider
  ): Promise<string> {
    try {
      // Parse the encrypted data
      const parsedData: EncryptedKeyData = JSON.parse(atob(encryptedData));
      
      // Get all the cryptographic parameters
      const encryptedKeyBase64 = parsedData.encryptedKey;
      const saltBase64 = parsedData.salt;
      const ivBase64 = parsedData.iv;
      const iterations = parsedData.iterations || CRYPTO_DEFAULTS.KEY_ITERATIONS;
      const algorithm = parsedData.algorithm || CRYPTO_ALGORITHMS.AES_GCM;
      
      // Verify the algorithm is supported
      if (algorithm !== CRYPTO_ALGORITHMS.AES_GCM) {
        throw new ApiKeyStorageError(
          `Unsupported encryption algorithm: ${algorithm}`
        );
      }
      
      // Convert Base64 encoded data to Uint8Arrays
      const encryptedKeyBytes = this.base64ToBytes(encryptedKeyBase64);
      const salt = this.base64ToBytes(saltBase64);
      const iv = this.base64ToBytes(ivBase64);
      
      // Import the password as a CryptoKey
      const passwordKey = await this.importPassword(password);
      
      // Derive the encryption key using PBKDF2
      const encryptionKey = await this.deriveKey(
        passwordKey,
        salt,
        iterations
      );
      
      // Decrypt the API key
      const decryptedBytes = await this.decrypt(encryptedKeyBytes, encryptionKey, iv);
      const decryptedApiKey = this.bytesToString(decryptedBytes);
      
      // Verify the decrypted key has a valid format for the provider
      const provider = parsedData.provider || defaultProvider;
      if (!validateApiKey(decryptedApiKey, provider)) {
        throw new ApiKeyStorageError(
          "Decryption produced an invalid API key. Please try again with the correct password."
        );
      }
      
      return decryptedApiKey;
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
   *
   * This function generates a cryptographically secure random key
   * for session-based encryption, using the Web Crypto API for
   * maximum security.
   *
   * @returns A session-specific encryption key
   */
  getSessionKey(): string {
    const sessionKeyName = "paper2llm_session_key";
    let sessionKey = sessionStorage.getItem(sessionKeyName);

    if (!sessionKey) {
      // Generate a secure random key
      const randomBytes = this.generateRandomBytes(32); // 256 bits
      sessionKey = this.bytesToBase64(randomBytes);
      sessionStorage.setItem(sessionKeyName, sessionKey);
    }

    return sessionKey;
  }
};
