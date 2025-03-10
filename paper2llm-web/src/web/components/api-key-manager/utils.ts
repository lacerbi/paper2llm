// AI Summary: Utility functions for API key display and security validation.
// Includes functions for masking API keys and validating password requirements.

import { ApiKeyExpiration, ApiProvider } from "../../../types/interfaces";

/**
 * Creates a fully masked API key (all characters replaced with dots)
 * @param key The API key to mask
 * @returns A string with all characters masked as dots
 */
export const getFullyMaskedApiKey = (key: string): string => {
  if (!key || key.length <= 4) return "••••••••";
  return "•".repeat(key.length);
};

/**
 * Creates a partially masked API key (all but last 4 characters replaced with dots)
 * @param key The API key to mask
 * @returns A string with all but the last 4 characters masked as dots
 */
export const getPartiallyMaskedApiKey = (key: string): string => {
  if (!key || key.length <= 4) return key;
  const lastFour = key.slice(-4);
  return `${"•".repeat(key.length - 4)}${lastFour}`;
};

/**
 * Update masked API keys for display in the UI
 * 
 * @param apiKeys Record of API keys by provider
 * @param isAuthenticated Record of authentication status by provider
 * @param showApiKeyField Whether to show the API key fully or partially
 * @returns Record of masked API keys by provider
 */
export const updateMaskedApiKeys = (
  apiKeys: Record<ApiProvider, string>,
  isAuthenticated: Record<ApiProvider, boolean>,
  showApiKeyField: boolean
): Record<ApiProvider, string> => {
  const newMaskedKeys: Record<ApiProvider, string> = {} as Record<ApiProvider, string>;
  
  Object.keys(isAuthenticated).forEach((provider) => {
    const typedProvider = provider as ApiProvider;
    if (isAuthenticated[typedProvider] && apiKeys[typedProvider]) {
      newMaskedKeys[typedProvider] = showApiKeyField
        ? getPartiallyMaskedApiKey(apiKeys[typedProvider])
        : getFullyMaskedApiKey(apiKeys[typedProvider]);
    } else {
      newMaskedKeys[typedProvider] = "";
    }
  });
  
  return newMaskedKeys;
};

/**
 * Validates password requirements based on expiration type
 * 
 * @param password The password to validate
 * @param expiration The selected expiration option
 * @returns An object with validation result and error message
 */
export const validatePasswordRequirements = (
  password: string,
  expiration: ApiKeyExpiration
): { isValid: boolean; errorMessage: string | null } => {
  // For session storage, no password requirements
  if (expiration === "session") {
    return { isValid: true, errorMessage: null };
  }

  // For persistent storage, password is required
  if (!password || password.length < 1) {
    return {
      isValid: false,
      errorMessage: "Password is required for persistent storage",
    };
  }

  // Check minimum length requirement
  if (password.length < 8) {
    return {
      isValid: false,
      errorMessage: "Password must be at least 8 characters long",
    };
  }

  // Check character variety requirement
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasDigits = /[0-9]/.test(password);
  const hasSpecials = /[^a-zA-Z0-9]/.test(password);

  const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(
    Boolean
  ).length;

  if (charTypesCount < 2) {
    return {
      isValid: false,
      errorMessage:
        "Password must contain at least two different types of characters (letters, digits, or special characters)",
    };
  }

  return { isValid: true, errorMessage: null };
};

/**
 * Checks if the form can be submitted based on the current state
 * 
 * @param state The current state of the API key manager
 * @param expiration The current expiration setting
 * @param passwordError Any current password error message
 * @param isLocked Whether the form is currently locked
 * @param isProcessing Whether the form is currently processing
 * @returns Boolean indicating if the form can be submitted
 */
export const canSubmitForm = (
  currentProvider: ApiProvider,
  apiKeys: Record<ApiProvider, string>,
  isStored: Record<ApiProvider, boolean>,
  isAuthenticated: Record<ApiProvider, boolean>,
  isValid: Record<ApiProvider, boolean>,
  password: string,
  expiration: ApiKeyExpiration,
  passwordError: string | null,
  isLocked: boolean,
  isProcessing: boolean,
  isPasswordProtected: (provider?: ApiProvider) => boolean
): boolean => {
  // Prevent submission if locked or processing
  if (isLocked || isProcessing) return false;

  if (isStored[currentProvider] && !isAuthenticated[currentProvider]) {
    // For retrieving a stored key
    // Must have a password AND it must meet requirements if the key is password protected
    if (!password || password.length === 0) return false;

    // If it's password protected, apply the same validation as when storing
    if (isPasswordProtected(currentProvider)) {
      // Check minimum length requirement
      if (password.length < 8) return false;

      // Check character variety requirement
      const hasLetters = /[a-zA-Z]/.test(password);
      const hasDigits = /[0-9]/.test(password);
      const hasSpecials = /[^a-zA-Z0-9]/.test(password);

      const charTypesCount = [hasLetters, hasDigits, hasSpecials].filter(
        Boolean
      ).length;
      if (charTypesCount < 2) return false;
    }

    return true;
  } else {
    // For storing a new key
    if (!isValid[currentProvider]) return false;

    // For non-session storage, require valid password
    if (expiration !== "session" && (!password || passwordError)) return false;

    return true;
  }
};
