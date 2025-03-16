// AI Summary: Displays and manages API key security settings including storage type and expiration.
// Shows warning messages for security requirements and includes lockout information with alerts.

import React from 'react';
import {
  Box,
  Typography,
  Stack,
  Tooltip,
  IconButton,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  SelectChangeEvent,
  Grid,
  Button,
  Chip
} from '@mui/material';
import {
  Info as InfoIcon,
  Lock as LockIcon,
  Warning as WarningIcon,
  AccessTime as AccessTimeIcon
} from '@mui/icons-material';
import { ApiKeyExpiration } from '../../../types/interfaces';

interface SecurityOptionsProps {
  expiration: ApiKeyExpiration;
  password: string;
  passwordError: string | null;
  isLocked: boolean;
  lockCountdown: number;
  isExtendedLockout?: boolean;
  incorrectAttempts?: number;
  formatLockoutTime?: (seconds: number) => string;
  onExpirationChange: (event: SelectChangeEvent) => void;
  onClearLockout?: () => void;
}

/**
 * Component that renders security options for API key storage
 */
const SecurityOptions: React.FC<SecurityOptionsProps> = ({
  expiration,
  password,
  passwordError,
  isLocked,
  lockCountdown,
  isExtendedLockout = false,
  incorrectAttempts = 0,
  formatLockoutTime = (seconds) => `${seconds} seconds`,
  onExpirationChange,
  onClearLockout
}) => {
  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Grid
        container
        alignItems="center"
        justifyContent="flex-end"
        sx={{ mb: 1 }}
      >
        <Grid item>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              Storage & Expiration:
            </Typography>
            <Tooltip title="Keys are only shared with LLM providers and stored encrypted. We recommend temporary session-only storage. There is the option of password-protected persistent storage with an expiration date.">
              <IconButton size="small" color="primary">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Select
              value={expiration}
              onChange={onExpirationChange}
              size="small"
              sx={{ minWidth: 150 }}
              disabled={isLocked}
            >
              <MenuItem value="session">Session only</MenuItem>
              <MenuItem value="1day">1 Day</MenuItem>
              <MenuItem value="7days">7 Days</MenuItem>
              <MenuItem value="30days">30 Days</MenuItem>
              <MenuItem value="90days">90 Days</MenuItem>
            </Select>

            {expiration !== "session" && (
              <Tooltip title="Password required for persistent storage">
                <LockIcon color="primary" fontSize="small" />
              </Tooltip>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Security Warning - show password requirements for persistent storage */}
      {expiration !== "session" &&
        (!password || passwordError) && (
          <Alert severity="warning" sx={{ mt: 2 }} icon={<LockIcon />}>
            <AlertTitle>Password Requirements</AlertTitle>
            A strong password is required when storing API keys persistently:
            <ul>
              <li>At least 8 characters long</li>
              <li>
                Must contain at least two different types of characters
                (letters, digits, special characters)
              </li>
            </ul>
            This ensures your API key remains securely encrypted between
            browser sessions.
          </Alert>
        )}

      {/* Display lockout information */}
      {isLocked && (
        <Alert 
          severity={isExtendedLockout ? "error" : "warning"} 
          sx={{ mt: 2 }} 
          icon={isExtendedLockout ? <AccessTimeIcon /> : <WarningIcon />}
        >
          <AlertTitle>
            {isExtendedLockout ? "Extended Lockout" : "Temporary Lockout"}
            {incorrectAttempts > 0 && (
              <Chip 
                label={`${incorrectAttempts} failed attempts`} 
                size="small" 
                color={isExtendedLockout ? "error" : "warning"}
                sx={{ ml: 1 }}
              />
            )}
          </AlertTitle>
          
          {isExtendedLockout ? (
            <Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                Your account has been locked for 24 hours due to too many failed authentication attempts.
                This is a security measure to prevent brute force attacks.
              </Typography>
              {onClearLockout && (
                <Button 
                  variant="outlined" 
                  color="error" 
                  size="small" 
                  onClick={onClearLockout}
                  sx={{ mt: 1 }}
                >
                  Clear Lockout (Admin)
                </Button>
              )}
            </Box>
          ) : (
            <Typography variant="body2">
              For security reasons, authentication has been locked for {formatLockoutTime(lockCountdown)}.
              Please wait before trying again.
            </Typography>
          )}
        </Alert>
      )}
    </Box>
  );
};

export default SecurityOptions;
