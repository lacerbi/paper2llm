// AI Summary: Hook for managing API key security settings including expiration and advanced lockout protection.
// Handles progressively longer lockouts with persistent tracking after failed authentication attempts.
// Implements extended 24-hour lockout after threshold and uses tiered expiration options for key security.

import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiKeyExpiration } from '../../../../types/interfaces';
import { SelectChangeEvent } from '@mui/material';

// Constants for lockout mechanism
const LOCKOUT_THRESHOLDS = {
  FIRST_LOCKOUT: 3,       // Start lockout after this many failed attempts
  EXTENDED_LOCKOUT: 10,   // Extended lockout after this many total attempts
};

const LOCKOUT_STORAGE_KEY = 'paper2llm_security_lockout';
const EXTENDED_LOCKOUT_DURATION = 24 * 60 * 60; // 24 hours in seconds

/**
 * Security lockout state interface
 */
interface LockoutState {
  attempts: number;        // Total incorrect attempts
  timestamp: number;       // Time of last attempt
  lockoutUntil: number;    // Timestamp when lockout expires
  isExtended: boolean;     // Whether lockout is extended (24 hours)
}

/**
 * Custom hook for managing security options and advanced lockout state
 */
export const useSecurityOptions = () => {
  // Expiration and security options
  const [expiration, setExpiration] = useState<ApiKeyExpiration>('session');
  
  // States for password retry mechanism
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockCountdown, setLockCountdown] = useState<number>(0);
  const [incorrectAttempts, setIncorrectAttempts] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isExtendedLockout, setIsExtendedLockout] = useState<boolean>(false);
  
  // Use a ref to track the timer
  const lockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load lockout state from localStorage on mount
  useEffect(() => {
    const loadLockoutState = () => {
      try {
        const storedState = localStorage.getItem(LOCKOUT_STORAGE_KEY);
        if (storedState) {
          const lockoutState: LockoutState = JSON.parse(storedState);
          
          // Check if there's an active lockout
          const now = Date.now();
          
          // Handle any active lockout
          if (lockoutState.lockoutUntil > now) {
            const remainingSeconds = Math.ceil((lockoutState.lockoutUntil - now) / 1000);
            setLockCountdown(remainingSeconds);
            setIsLocked(true);
            setIncorrectAttempts(lockoutState.attempts);
            setIsExtendedLockout(lockoutState.isExtended);
          } else if (lockoutState.attempts >= LOCKOUT_THRESHOLDS.FIRST_LOCKOUT) {
            // If lockout has expired but we have previous attempts, keep the count
            setIncorrectAttempts(lockoutState.attempts);
          }
        }
      } catch (error) {
        console.error('Error loading security lockout state:', error);
        // Reset state if there's an error
        localStorage.removeItem(LOCKOUT_STORAGE_KEY);
      }
    };
    
    loadLockoutState();
  }, []);

  // Save lockout state to localStorage whenever it changes
  const saveLockoutState = useCallback((state: LockoutState) => {
    try {
      localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving security lockout state:', error);
    }
  }, []);

  // Countdown timer for lockout period
  useEffect(() => {
    if (lockCountdown > 0) {
      // Clear any existing timer
      if (lockTimerRef.current) {
        clearTimeout(lockTimerRef.current);
      }
      
      // Set new timer
      lockTimerRef.current = setTimeout(() => {
        setLockCountdown(lockCountdown - 1);
      }, 1000);

      return () => {
        if (lockTimerRef.current) {
          clearTimeout(lockTimerRef.current);
        }
      };
    } else if (lockCountdown === 0 && isLocked) {
      setIsLocked(false);
      setIsExtendedLockout(false);
    }

    return undefined;
  }, [lockCountdown, isLocked]);

  // Handle expiration change from select
  const handleExpirationChange = useCallback((event: SelectChangeEvent) => {
    setExpiration(event.target.value as ApiKeyExpiration);
  }, []);

  // Calculate lockout duration based on number of attempts
  const calculateLockoutDuration = useCallback((attempts: number): number => {
    if (attempts < LOCKOUT_THRESHOLDS.FIRST_LOCKOUT) {
      return 0; // No lockout yet
    }
    
    // Extended 24-hour lockout after threshold
    if (attempts >= LOCKOUT_THRESHOLDS.EXTENDED_LOCKOUT) {
      return EXTENDED_LOCKOUT_DURATION;
    }
    
    // Progressive lockout durations in seconds
    // 3 attempts: 1 minute
    // 4 attempts: 5 minutes
    // 5 attempts: 15 minutes
    // 6 attempts: 30 minutes
    // 7 attempts: 1 hour
    // 8 attempts: 3 hours
    // 9 attempts: 6 hours
    
    const attemptsSinceLockout = attempts - LOCKOUT_THRESHOLDS.FIRST_LOCKOUT + 1;
    
    // Base lockout durations in seconds
    const durations = [
      60,       // 1 minute
      300,      // 5 minutes
      900,      // 15 minutes
      1800,     // 30 minutes
      3600,     // 1 hour
      10800,    // 3 hours
      21600     // 6 hours
    ];
    
    const durationIndex = Math.min(attemptsSinceLockout - 1, durations.length - 1);
    return durations[durationIndex];
  }, []);

  // Format lockout time for display
  const formatLockoutTime = useCallback((seconds: number): string => {
    if (seconds < 60) {
      return `${seconds} seconds`;
    } else if (seconds < 3600) {
      const minutes = Math.ceil(seconds / 60);
      return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    } else if (seconds < 86400) { // Less than a day
      const hours = Math.ceil(seconds / 3600);
      return `${hours} hour${hours > 1 ? 's' : ''}`;
    } else {
      const days = Math.ceil(seconds / 86400);
      return `${days} day${days > 1 ? 's' : ''}`;
    }
  }, []);

  // Apply temporary lock after multiple failed attempts
  const applyTemporaryLock = useCallback(() => {
    const newAttempts = incorrectAttempts + 1;
    setIncorrectAttempts(newAttempts);
    
    // Calculate lockout duration based on number of attempts
    const lockoutDuration = calculateLockoutDuration(newAttempts);
    const isExtended = newAttempts >= LOCKOUT_THRESHOLDS.EXTENDED_LOCKOUT;
    
    if (lockoutDuration > 0) {
      setIsLocked(true);
      setLockCountdown(lockoutDuration);
      setIsExtendedLockout(isExtended);
      
      // Save lockout state
      saveLockoutState({
        attempts: newAttempts,
        timestamp: Date.now(),
        lockoutUntil: Date.now() + (lockoutDuration * 1000),
        isExtended: isExtended
      });
      
      if (isExtended) {
        return `Too many failed attempts. Your account is locked for ${formatLockoutTime(lockoutDuration)} for security reasons.`;
      } else {
        return `Too many failed attempts. Your account is locked for ${formatLockoutTime(lockoutDuration)}.`;
      }
    }
    
    // Just save the attempts count if no lockout yet
    saveLockoutState({
      attempts: newAttempts,
      timestamp: Date.now(),
      lockoutUntil: 0,
      isExtended: false
    });
    
    return null;
  }, [incorrectAttempts, calculateLockoutDuration, formatLockoutTime, saveLockoutState]);

  // Reset security state (e.g., after successful authentication)
  const resetSecurityState = useCallback(() => {
    setIncorrectAttempts(0);
    setIsLocked(false);
    setLockCountdown(0);
    setIsExtendedLockout(false);
    
    // Clear lockout state
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
  }, []);

  // Clear lockout (for testing or administrative purposes)
  const clearLockout = useCallback(() => {
    setIsLocked(false);
    setIncorrectAttempts(0);
    setLockCountdown(0);
    setIsExtendedLockout(false);
    
    // Clear lockout state
    localStorage.removeItem(LOCKOUT_STORAGE_KEY);
  }, []);

  return {
    expiration,
    isLocked,
    lockCountdown,
    isProcessing,
    isExtendedLockout,
    incorrectAttempts,
    handleExpirationChange,
    applyTemporaryLock,
    resetSecurityState,
    clearLockout,
    formatLockoutTime,
    setIsProcessing,
    setExpiration
  };
};
