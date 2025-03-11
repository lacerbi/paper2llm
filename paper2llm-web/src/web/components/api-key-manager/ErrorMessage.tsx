// AI Summary: Displays authentication errors and lock status with appropriate severity levels.
// Shows countdown timer during lockout periods and security requirement alerts.

import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Typography
} from '@mui/material';
import {
  Lock as LockIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { ApiProvider } from '../../../types/interfaces';
import { ApiKeyExpiration } from '../../../types/interfaces';

interface ErrorMessageProps {
  error: string | null;
  isLocked: boolean;
  lockCountdown: number;
  password: string;
  passwordError: string | null;
  isPasswordProtected: (provider?: ApiProvider) => boolean;
  currentProvider: ApiProvider;
  canSubmit: boolean;
}

/**
 * Component for displaying authentication errors and password requirements
 */
const ErrorMessage: React.FC<ErrorMessageProps> = ({
  error,
  isLocked,
  lockCountdown,
  password,
  passwordError,
  isPasswordProtected,
  currentProvider,
  canSubmit
}) => {
  // Render password-related errors
  const renderPasswordErrorMessage = () => {
    if (
      error &&
      (error.includes("password") ||
        error.includes("Password") ||
        error.includes("API key") ||
        error.includes("Too many failed attempts"))
    ) {
      return (
        <Alert
          severity={isLocked ? "warning" : "error"}
          sx={{ mt: 1 }}
          icon={isLocked ? <LockIcon /> : <ErrorIcon />}
        >
          <AlertTitle>
            {isLocked ? "Temporarily Locked" : "Authentication Failed"}
          </AlertTitle>
          {error}
          {isLocked && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">
                Seconds remaining: {lockCountdown}
              </Typography>
            </Box>
          )}
        </Alert>
      );
    }

    return error ? (
      <Alert severity="error" sx={{ mt: 1 }}>
        {error}
      </Alert>
    ) : null;
  };

  // Render password requirements for locked API keys
  const renderPasswordRequirements = () => {
    if (
      !error &&
      isPasswordProtected(currentProvider) &&
      password.length > 0 &&
      !canSubmit
    ) {
      return (
        <Alert severity="info" sx={{ mt: 2 }} icon={<LockIcon />}>
          <AlertTitle>Password Requirements</AlertTitle>
          Your API key is protected with a password that must meet these
          requirements:
          <ul>
            <li>At least 8 characters long</li>
            <li>
              Must contain at least two different types of characters
              (letters, digits, special characters)
            </li>
          </ul>
        </Alert>
      );
    }
    return null;
  };

  return (
    <>
      {renderPasswordErrorMessage()}
      {renderPasswordRequirements()}
    </>
  );
};

export default ErrorMessage;
