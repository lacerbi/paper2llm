// AI Summary: Implements secure API key storage for multiple providers using localStorage/sessionStorage with XOR encryption.
// Requires password for persistent storage while using auto-generated keys for session storage.
// Supports provider-specific validation, storage, retrieval with improved security practices.
// Includes key integrity verification to detect incorrect passwords and prevent returning corrupted keys.

import {
  ApiKeyStorage,
  ApiKeyStorageType,
  ApiKeyExpiration,
  ApiKeyStorageOptions,
  ApiProvider,
} from "../../types/interfaces";

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

    const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(
      Boolean
    ).length;

    return charTypesCount >= 2;
  },

  /**
   * Returns detailed error message about password requirements
   */
  getPasswordRequirementsMessage(): string {
    return "Password must be at least 8 characters long and contain at least two different types of characters (letters, digits, special characters)";
  },
};

/**
 * Storage format for encrypted API keys
 * Includes validation data to verify decryption with the correct password
 */
interface EncryptedKeyData {
  encryptedKey: string; // Base64 encoded XOR-encrypted API key
  validation: string; // Base64 encoded HMAC for validation
  version: number; // Storage format version for migrations
  provider?: ApiProvider; // Provider identifier (added in version 3)
}

/**
 * Implements the ApiKeyStorage interface for web browsers
 * using localStorage or sessionStorage with encryption for secure storage
 */
export class WebApiKeyStorage implements ApiKeyStorage {
  // Default provider
  private readonly defaultProvider: ApiProvider = "mistral";

  // Storage key patterns (with {provider} placeholder)
  private readonly storageKeyPattern = "paper2llm_api_key_{provider}";
  private readonly protectedKeyPattern =
    "paper2llm_api_key_{provider}_protected";
  private readonly storageTypeKeyPattern = "paper2llm_storage_type_{provider}";
  private readonly expirationKeyPattern =
    "paper2llm_api_key_{provider}_expiration";
  private readonly expirationTimeKeyPattern =
    "paper2llm_api_key_{provider}_expiration_time";

  // Legacy storage keys (for backward compatibility)
  private readonly legacyStorageKey = "paper2llm_api_key";
  private readonly legacyProtectedKey = "paper2llm_api_key_protected";
  private readonly legacyStorageTypeKey = "paper2llm_storage_type";
  private readonly legacyExpirationKey = "paper2llm_api_key_expiration";
  private readonly legacyExpirationTimeKey =
    "paper2llm_api_key_expiration_time";

  // Validation patterns for different providers
  private readonly validationPatterns: Record<ApiProvider, RegExp> = {
    mistral: /^[A-Za-z0-9-_]{32,64}$/, // Common format for Mistral API keys
    openai: /^sk-[A-Za-z0-9]{32,64}$/, // OpenAI API keys typically start with 'sk-'
  };

  private readonly storageVersion = 3; // Increment when storage format changes

  // Expiration durations in milliseconds
  private readonly expirationDurations: Record<ApiKeyExpiration, number> = {
    session: 0, // Session expiration is handled by sessionStorage
    "1day": 24 * 60 * 60 * 1000,
    "7days": 7 * 24 * 60 * 60 * 1000,
    "30days": 30 * 24 * 60 * 60 * 1000,
    never: 0, // No expiration
  };

  /**
   * Get a storage key for a specific provider
   *
   * @param keyPattern The key pattern with {provider} placeholder
   * @param provider The provider to get key for
   * @returns The storage key for the specified provider
   */
  private getProviderKey(keyPattern: string, provider: ApiProvider): string {
    return keyPattern.replace("{provider}", provider);
  }

  /**
   * Securely encrypts the API key using provided password or a session-based key
   *
   * Security model:
   * - For persistent storage (localStorage), a user-provided password is required
   * - For session storage, an auto-generated random key is used
   *
   * @param apiKey The API key to encrypt
   * @param password Optional user password (required for localStorage)
   * @param provider The provider for this API key
   * @returns Encrypted API key data structure
   */
  private encryptApiKey(
    apiKey: string,
    password?: string,
    provider?: ApiProvider
  ): string {
    // For session-based encryption (no password provided)
    if (!password) {
      password = this.getSessionKey();
    }

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
      version: this.storageVersion,
      provider: provider || this.defaultProvider,
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
  }

  /**
   * Creates a validation hash from the API key and password
   * This allows verification that decryption was performed with the correct password
   */
  private createValidationData(
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
        return this.decryptLegacyApiKey(
          parsedData.encryptedKey || encryptedData,
          password
        );
      }

      const encryptedKey = parsedData.encryptedKey;
      const validationInfo = JSON.parse(atob(parsedData.validation));

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
      const provider = parsedData.provider || this.defaultProvider;
      if (!this.validateApiKey(decrypted, provider)) {
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

      // Verify decrypted value has valid API key format
      if (!this.validateApiKey(decrypted, "mistral")) {
        throw new ApiKeyStorageError(
          "Incorrect password or corrupted storage. The decrypted value is not a valid API key."
        );
      }

      return decrypted;
    } catch (error) {
      if (error instanceof ApiKeyStorageError) {
        throw error;
      }
      throw new ApiKeyStorageError(
        "Failed to decrypt legacy API key format. You may need to clear and re-enter your API key."
      );
    }
  }

  /**
   * Gets or creates a secure session-based encryption key
   * Uses Web Crypto API when available for better randomness
   *
   * @returns A session-specific encryption key
   */
  private getSessionKey(): string {
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

  /**
   * Gets the appropriate storage based on the storage type
   */
  private getStorage(storageType: ApiKeyStorageType = "local"): Storage {
    return storageType === "local" ? localStorage : sessionStorage;
  }

  /**
   * Checks if legacy key exists and migrates it to the new format
   * This ensures backward compatibility with existing stored keys
   */
  private checkAndMigrateLegacyKey(): void {
    const legacyKey =
      localStorage.getItem(this.legacyStorageKey) ||
      sessionStorage.getItem(this.legacyStorageKey);

    if (legacyKey) {
      // Get all the legacy metadata
      let storage: Storage | null = null;

      if (localStorage.getItem(this.legacyStorageKey)) {
        storage = localStorage;
      } else if (sessionStorage.getItem(this.legacyStorageKey)) {
        storage = sessionStorage;
      }

      if (storage) {
        const isProtected = storage.getItem(this.legacyProtectedKey) === "true";
        const storageType =
          (storage.getItem(this.legacyStorageTypeKey) as ApiKeyStorageType) ||
          "local";
        const expiration =
          (storage.getItem(this.legacyExpirationKey) as ApiKeyExpiration) ||
          "never";
        const expirationTime = storage.getItem(this.legacyExpirationTimeKey);

        // Create the provider-specific keys
        const mistralStorageKey = this.getProviderKey(
          this.storageKeyPattern,
          "mistral"
        );
        const mistralProtectedKey = this.getProviderKey(
          this.protectedKeyPattern,
          "mistral"
        );
        const mistralStorageTypeKey = this.getProviderKey(
          this.storageTypeKeyPattern,
          "mistral"
        );
        const mistralExpirationKey = this.getProviderKey(
          this.expirationKeyPattern,
          "mistral"
        );
        const mistralExpirationTimeKey = this.getProviderKey(
          this.expirationTimeKeyPattern,
          "mistral"
        );

        // Move the legacy data to provider-specific keys
        storage.setItem(mistralStorageKey, legacyKey);
        storage.setItem(mistralProtectedKey, isProtected ? "true" : "false");
        storage.setItem(mistralStorageTypeKey, storageType);
        storage.setItem(mistralExpirationKey, expiration);

        if (expirationTime) {
          storage.setItem(mistralExpirationTimeKey, expirationTime);
        }

        // Keep the legacy keys for backward compatibility
        // We'll remove them once the migration is fully tested and stable
      }
    }
  }

  /**
   * Calculate an expiration timestamp based on the expiration type
   */
  private calculateExpirationTime(expiration: ApiKeyExpiration): number | null {
    if (expiration === "never") {
      return null;
    }

    if (expiration === "session") {
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
   * @param options Storage options including storage type, password, expiration, and provider
   * @throws ApiKeyStorageError if trying to use localStorage without a password
   */
  async storeApiKey(
    apiKey: string,
    options: ApiKeyStorageOptions = {}
  ): Promise<void> {
    const {
      password,
      storageType = "local",
      expiration = "never",
      provider = this.defaultProvider,
    } = options;

    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    // Validate API key format for the specified provider
    if (!this.validateApiKey(apiKey, provider)) {
      throw new ApiKeyStorageError("Invalid API key format");
    }

    // For persistent storage (localStorage), password is required
    if (storageType === "local") {
      if (!password) {
        throw new ApiKeyStorageError(
          "Password is required for persistent storage"
        );
      }

      // Validate password strength
      if (!passwordValidation.validatePassword(password)) {
        throw new ApiKeyStorageError(
          passwordValidation.getPasswordRequirementsMessage()
        );
      }
    }

    const storage = this.getStorage(storageType);
    const encryptedKeyData = this.encryptApiKey(apiKey, password, provider);

    // Get provider-specific storage keys
    const storageKey = this.getProviderKey(this.storageKeyPattern, provider);
    const protectedKey = this.getProviderKey(
      this.protectedKeyPattern,
      provider
    );
    const storageTypeKey = this.getProviderKey(
      this.storageTypeKeyPattern,
      provider
    );
    const expirationKey = this.getProviderKey(
      this.expirationKeyPattern,
      provider
    );
    const expirationTimeKey = this.getProviderKey(
      this.expirationTimeKeyPattern,
      provider
    );

    // Store the encrypted key
    storage.setItem(storageKey, encryptedKeyData);

    // Store metadata
    storage.setItem(protectedKey, password ? "true" : "false");
    storage.setItem(storageTypeKey, storageType);
    storage.setItem(expirationKey, expiration);

    // Calculate and store expiration time if applicable
    const expirationTime = this.calculateExpirationTime(expiration);
    if (expirationTime !== null) {
      storage.setItem(expirationTimeKey, expirationTime.toString());
    } else {
      storage.removeItem(expirationTimeKey);
    }
  }

  /**
   * Retrieves the API key from storage, checking expiration first
   *
   * @param password Password for decryption (required if key was stored with password)
   * @param provider The provider to retrieve the key for (defaults to 'mistral')
   * @returns The decrypted API key or null if not found/expired
   * @throws ApiKeyStorageError if password is required but not provided or incorrect
   */
  async retrieveApiKey(
    password?: string,
    provider: ApiProvider = this.defaultProvider
  ): Promise<string | null> {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    // Check if the key has expired
    if (this.hasExpired(provider)) {
      this.clearApiKey(provider);
      return null;
    }

    // Get the storage type being used
    const storageType = this.getStorageType(provider);
    if (!storageType) {
      return null;
    }

    const storage = this.getStorage(storageType);

    // Get provider-specific storage keys
    const storageKey = this.getProviderKey(this.storageKeyPattern, provider);
    const protectedKey = this.getProviderKey(
      this.protectedKeyPattern,
      provider
    );

    // Try to get the encrypted key
    let encryptedData = storage.getItem(storageKey);

    // If not found, check legacy keys for 'mistral' provider (backward compatibility)
    if (!encryptedData && provider === "mistral") {
      encryptedData = storage.getItem(this.legacyStorageKey);

      // If found in legacy, migrate it
      if (encryptedData) {
        this.checkAndMigrateLegacyKey();
        // Try again with the migrated key
        encryptedData = storage.getItem(storageKey);
      }
    }

    if (!encryptedData) {
      return null;
    }

    const isProtected = storage.getItem(protectedKey) === "true";

    // If the key is password-protected but no password provided, throw error
    if (isProtected && !password) {
      throw new ApiKeyStorageError("Password required to retrieve API key");
    }

    try {
      return this.decryptApiKey(
        encryptedData,
        isProtected ? password : undefined
      );
    } catch (error) {
      // Rethrow with a more user-friendly message
      if (error instanceof ApiKeyStorageError) {
        throw error;
      } else {
        throw new ApiKeyStorageError("Failed to decrypt API key");
      }
    }
  }

  /**
   * Checks if an API key is stored in either storage
   *
   * @param provider Optional provider to check (if not specified, checks any provider)
   */
  hasApiKey(provider?: ApiProvider): boolean {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    // If provider is specified, check only that provider
    if (provider) {
      const storageKey = this.getProviderKey(this.storageKeyPattern, provider);

      // Check localStorage first
      if (localStorage.getItem(storageKey) !== null) {
        // If there's a key but it's expired, clear it and return false
        if (this.hasExpired(provider)) {
          this.clearApiKey(provider);
          return false;
        }
        return true;
      }

      // Then check sessionStorage
      if (sessionStorage.getItem(storageKey) !== null) {
        return true;
      }

      // For mistral, also check legacy keys
      if (
        provider === "mistral" &&
        (localStorage.getItem(this.legacyStorageKey) !== null ||
          sessionStorage.getItem(this.legacyStorageKey) !== null)
      ) {
        return true;
      }

      return false;
    }

    // If no provider specified, check all providers
    return this.getStoredProviders().length > 0;
  }

  /**
   * Gets all providers that have stored API keys
   */
  getStoredProviders(): ApiProvider[] {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    const providerSet = new Set<ApiProvider>();

    // Check each known provider
    const knownProviders: ApiProvider[] = ["mistral", "openai"];

    for (const provider of knownProviders) {
      const storageKey = this.getProviderKey(this.storageKeyPattern, provider);

      // Check in localStorage
      if (localStorage.getItem(storageKey) !== null) {
        // If there's a key but it's expired, clear it and continue
        if (this.hasExpired(provider)) {
          this.clearApiKey(provider);
          continue;
        }
        providerSet.add(provider);
      }

      // Check in sessionStorage
      if (sessionStorage.getItem(storageKey) !== null) {
        providerSet.add(provider);
      }
    }

    // Also check legacy keys for 'mistral'
    if (
      localStorage.getItem(this.legacyStorageKey) !== null ||
      sessionStorage.getItem(this.legacyStorageKey) !== null
    ) {
      providerSet.add("mistral");
    }

    return Array.from(providerSet);
  }

  /**
   * Validates if an API key has the correct format
   *
   * @param apiKey The API key to validate
   * @param provider Optional provider to validate against (defaults to 'mistral')
   */
  validateApiKey(
    apiKey: string,
    provider: ApiProvider = this.defaultProvider
  ): boolean {
    // Get the validation pattern for the provider
    const pattern = this.validationPatterns[provider];

    // Perform validation of API key format
    return pattern.test(apiKey);
  }

  /**
   * Gets the storage type being used for the API key
   *
   * @param provider Optional provider to check (defaults to 'mistral')
   */
  getStorageType(
    provider: ApiProvider = this.defaultProvider
  ): ApiKeyStorageType | null {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    // Get provider-specific storage key
    const storageTypeKey = this.getProviderKey(
      this.storageTypeKeyPattern,
      provider
    );
    const storageKey = this.getProviderKey(this.storageKeyPattern, provider);

    // Check localStorage first for storage type
    const localStorageType = localStorage.getItem(
      storageTypeKey
    ) as ApiKeyStorageType | null;
    if (localStorageType && localStorage.getItem(storageKey)) {
      return localStorageType;
    }

    // Then check sessionStorage
    const sessionStorageType = sessionStorage.getItem(
      storageTypeKey
    ) as ApiKeyStorageType | null;
    if (sessionStorageType && sessionStorage.getItem(storageKey)) {
      return sessionStorageType;
    }

    // For mistral, also check legacy keys
    if (provider === "mistral") {
      // Check localStorage first for legacy storage type
      const legacyLocalStorageType = localStorage.getItem(
        this.legacyStorageTypeKey
      ) as ApiKeyStorageType | null;
      if (
        legacyLocalStorageType &&
        localStorage.getItem(this.legacyStorageKey)
      ) {
        return legacyLocalStorageType;
      }

      // Then check sessionStorage for legacy keys
      const legacySessionStorageType = sessionStorage.getItem(
        this.legacyStorageTypeKey
      ) as ApiKeyStorageType | null;
      if (
        legacySessionStorageType &&
        sessionStorage.getItem(this.legacyStorageKey)
      ) {
        return legacySessionStorageType;
      }
    }

    return null;
  }

  /**
   * Gets the expiration setting for the stored API key
   *
   * @param provider Optional provider to check (defaults to 'mistral')
   */
  getExpiration(
    provider: ApiProvider = this.defaultProvider
  ): ApiKeyExpiration | null {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    const storageType = this.getStorageType(provider);
    if (!storageType) {
      return null;
    }

    const storage = this.getStorage(storageType);

    // Get provider-specific storage key
    const expirationKey = this.getProviderKey(
      this.expirationKeyPattern,
      provider
    );

    // Try to get the expiration
    let expiration = storage.getItem(expirationKey) as ApiKeyExpiration | null;

    // If not found and provider is mistral, check legacy keys
    if (!expiration && provider === "mistral") {
      expiration = storage.getItem(
        this.legacyExpirationKey
      ) as ApiKeyExpiration | null;
    }

    return expiration;
  }

  /**
   * Checks if the stored API key has expired
   *
   * @param provider Optional provider to check (defaults to 'mistral')
   */
  hasExpired(provider: ApiProvider = this.defaultProvider): boolean {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    const storageType = this.getStorageType(provider);
    if (!storageType) {
      return false;
    }

    const storage = this.getStorage(storageType);

    // Session storage keys expire with the session, so they never "expire" while available
    if (storageType === "session") {
      return false;
    }

    // Get provider-specific storage key
    const expirationTimeKey = this.getProviderKey(
      this.expirationTimeKeyPattern,
      provider
    );

    // Try to get the expiration time
    let expirationTimeStr = storage.getItem(expirationTimeKey);

    // If not found and provider is mistral, check legacy keys
    if (!expirationTimeStr && provider === "mistral") {
      expirationTimeStr = storage.getItem(this.legacyExpirationTimeKey);
    }

    if (!expirationTimeStr) {
      // If no expiration time is set, the key doesn't expire
      return false;
    }

    const expirationTime = parseInt(expirationTimeStr, 10);
    return Date.now() > expirationTime;
  }

  /**
   * Checks if API key is password protected
   *
   * @param provider Optional provider to check (defaults to 'mistral')
   */
  isPasswordProtected(provider: ApiProvider = this.defaultProvider): boolean {
    // Check for legacy keys and migrate if needed
    this.checkAndMigrateLegacyKey();

    const storageType = this.getStorageType(provider);
    if (!storageType) {
      return false;
    }

    const storage = this.getStorage(storageType);

    // Get provider-specific storage key
    const protectedKey = this.getProviderKey(
      this.protectedKeyPattern,
      provider
    );

    // Try to get the protected status
    let isProtected = storage.getItem(protectedKey) === "true";

    // If not found and provider is mistral, check legacy keys
    if (
      provider === "mistral" &&
      storage.getItem(protectedKey) === null &&
      storage.getItem(this.legacyProtectedKey) !== null
    ) {
      isProtected = storage.getItem(this.legacyProtectedKey) === "true";
    }

    return isProtected;
  }

  /**
   * Removes the stored API key
   *
   * @param provider Optional provider to clear (if not specified, clears all)
   */
  clearApiKey(provider?: ApiProvider): void {
    // If provider is specified, clear only that provider
    if (provider) {
      // Get provider-specific storage keys
      const storageKey = this.getProviderKey(this.storageKeyPattern, provider);
      const protectedKey = this.getProviderKey(
        this.protectedKeyPattern,
        provider
      );
      const storageTypeKey = this.getProviderKey(
        this.storageTypeKeyPattern,
        provider
      );
      const expirationKey = this.getProviderKey(
        this.expirationKeyPattern,
        provider
      );
      const expirationTimeKey = this.getProviderKey(
        this.expirationTimeKeyPattern,
        provider
      );

      // Clear from localStorage
      localStorage.removeItem(storageKey);
      localStorage.removeItem(protectedKey);
      localStorage.removeItem(storageTypeKey);
      localStorage.removeItem(expirationKey);
      localStorage.removeItem(expirationTimeKey);

      // Clear from sessionStorage
      sessionStorage.removeItem(storageKey);
      sessionStorage.removeItem(protectedKey);
      sessionStorage.removeItem(storageTypeKey);
      sessionStorage.removeItem(expirationKey);
      sessionStorage.removeItem(expirationTimeKey);

      // If mistral, also clear legacy keys
      if (provider === "mistral") {
        // Clear from localStorage
        localStorage.removeItem(this.legacyStorageKey);
        localStorage.removeItem(this.legacyProtectedKey);
        localStorage.removeItem(this.legacyStorageTypeKey);
        localStorage.removeItem(this.legacyExpirationKey);
        localStorage.removeItem(this.legacyExpirationTimeKey);

        // Clear from sessionStorage
        sessionStorage.removeItem(this.legacyStorageKey);
        sessionStorage.removeItem(this.legacyProtectedKey);
        sessionStorage.removeItem(this.legacyStorageTypeKey);
        sessionStorage.removeItem(this.legacyExpirationKey);
        sessionStorage.removeItem(this.legacyExpirationTimeKey);
      }
    } else {
      // Clear all providers
      const knownProviders: ApiProvider[] = ["mistral", "openai"];

      // Clear each provider individually
      for (const provider of knownProviders) {
        this.clearApiKey(provider);
      }

      // Also clear legacy keys (just to be safe)
      // Clear from localStorage
      localStorage.removeItem(this.legacyStorageKey);
      localStorage.removeItem(this.legacyProtectedKey);
      localStorage.removeItem(this.legacyStorageTypeKey);
      localStorage.removeItem(this.legacyExpirationKey);
      localStorage.removeItem(this.legacyExpirationTimeKey);

      // Clear from sessionStorage
      sessionStorage.removeItem(this.legacyStorageKey);
      sessionStorage.removeItem(this.legacyProtectedKey);
      sessionStorage.removeItem(this.legacyStorageTypeKey);
      sessionStorage.removeItem(this.legacyExpirationKey);
      sessionStorage.removeItem(this.legacyExpirationTimeKey);
    }
  }
}
