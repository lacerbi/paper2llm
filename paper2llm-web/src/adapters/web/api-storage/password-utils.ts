// AI Summary: Provides utilities for password validation with consistent security requirements.
// Includes functions to validate password strength and generate user-friendly error messages.

/**
 * Password validation helper functions
 * 
 * This module provides utilities for validating passwords used to protect API keys.
 * It enforces consistent security requirements across the application:
 * - Minimum length requirement (8 characters)
 * - Character variety requirement (at least two types of characters)
 * 
 * These requirements help ensure that passwords provide adequate security
 * for protecting sensitive API keys stored in the browser.
 */
export const passwordValidation = {
  /**
   * Checks if password meets minimum requirements:
   * - At least 8 characters long
   * - Contains at least two types of characters (letters, digits, special chars)
   * 
   * This validation is used when storing API keys with password protection
   * to ensure adequate security for the encryption.
   * 
   * @param password The password to validate
   * @returns true if the password meets requirements, false otherwise
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
   * 
   * Provides a user-friendly message explaining the password requirements
   * that can be displayed in the UI when validation fails.
   * 
   * @returns A string containing the password requirements message
   */
  getPasswordRequirementsMessage(): string {
    return "Password must be at least 8 characters long and contain at least two different types of characters (letters, digits, special characters)";
  },
};
