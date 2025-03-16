// AI Summary: Hook for managing API key security settings including expiration and lockout.
// Handles temporary lockout with countdown timer after failed authentication attempts.
// Uses tiered expiration options (session, 1/7/30/90 days) for key security.

import { useState, useEffect, useCallback } from 'react';
import { ApiKeyExpiration } from '../../../../types/interfaces';
import { SelectChangeEvent } from '@mui/material';

/**
 * Custom hook for managing security options and lockout state
 */
export const useSecurityOptions = () => {
  // Expiration and security options
  const [expiration, setExpiration] = useState<ApiKeyExpiration>('session');
  
  // States for password retry mechanism
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Countdown timer for lockout period
  useEffect(() => {
    let timer: NodeJS.Timeout;

    if (lockCountdown > 0) {
      timer = setTimeout(() => {
        setLockCountdown(lockCountdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else if (lockCountdown === 0 && isLocked) {
      setIsLocked(false);
    }

    return undefined;
  }, [lockCountdown, isLocked]);

  // Handle expiration change from select
  const handleExpirationChange = useCallback((event: SelectChangeEvent) => {
    setExpiration(event.target.value as ApiKeyExpiration);
  }, []);

  // Apply temporary lock after multiple failed attempts
  const applyTemporaryLock = useCallback(() => {
    const newAttempts = incorrectAttempts + 1;
    setIncorrectAttempts(newAttempts);

    // Apply exponential backoff for repeated failures
    if (newAttempts >= 3) {
      const lockTime = Math.min(Math.pow(2, newAttempts - 2), 30); // Max 30 seconds
      setIsLocked(true);
      setLockCountdown(lockTime);

      return `Too many failed attempts. Please wait ${lockTime} seconds before trying again.`;
    }
    
    return null;
  }, [incorrectAttempts]);

  // Reset security state (e.g., after successful authentication)
  const resetSecurityState = useCallback(() => {
    setIncorrectAttempts(0);
    setIsLocked(false);
    setLockCountdown(0);
  }, []);

  return {
    expiration,
    isLocked,
    lockCountdown,
    isProcessing,
    handleExpirationChange,
    applyTemporaryLock,
    resetSecurityState,
    setIsProcessing,
    setExpiration
  };
};
