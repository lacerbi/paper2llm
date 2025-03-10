// AI Summary: Custom hook for password state management with visibility toggling and validation.
// Handles password requirements checking according to expiration settings with error reporting.

import { useState, useEffect, useCallback } from 'react';
import { ApiKeyExpiration } from '../../../../types/interfaces';
import { validatePasswordRequirements } from '../utils';

/**
 * Custom hook for managing password state and validation
 */
export const usePasswordState = (expiration: ApiKeyExpiration) => {
  // Password state
  const [password, setPassword] = useState<string>('');
  const [showPasswordField, setShowPasswordField] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  
  // Clear password when expiration is set to session
  useEffect(() => {
    if (expiration === 'session') {
      setPassword('');
    }
  }, [expiration]);
  
  // Validate password requirements whenever password or expiration changes
  useEffect(() => {
    validatePasswordRequirementsHandler();
  }, [password, expiration]);

  // Handle password input changes
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
  }, []);

  // Toggle password visibility
  const togglePasswordVisibility = useCallback(() => {
    setShowPasswordField((prev) => !prev);
  }, []);

  // Validate password meets requirements based on expiration setting
  const validatePasswordRequirementsHandler = useCallback(() => {
    // Clear previous errors
    setPasswordError(null);
    
    if (password.length === 0) {
      // Don't show error for empty password field (until submission)
      return expiration === 'session';
    }
    
    // Use extracted utility function
    const result = validatePasswordRequirements(password, expiration);
    if (!result.isValid) {
      setPasswordError(result.errorMessage);
    }
    return result.isValid;
  }, [password, expiration]);

  return {
    password,
    showPasswordField,
    passwordError,
    handlePasswordChange,
    togglePasswordVisibility,
    validatePasswordRequirements: validatePasswordRequirementsHandler,
    setPassword
  };
};
