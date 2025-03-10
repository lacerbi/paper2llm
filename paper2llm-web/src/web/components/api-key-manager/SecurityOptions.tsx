// AI Summary: Displays and manages API key security settings including storage type and expiration.
// Shows warning messages for security requirements and includes helpful tooltips.

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
  Grid
} from '@mui/material';
import {
  Info as InfoIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { ApiKeyExpiration } from '../../../types/interfaces';

interface SecurityOptionsProps {
  expiration: ApiKeyExpiration;
  password: string;
  passwordError: string | null;
  isLocked: boolean;
  onExpirationChange: (event: SelectChangeEvent) => void;
}

/**
 * Component that renders security options for API key storage
 */
const SecurityOptions: React.FC<SecurityOptionsProps> = ({
  expiration,
  password,
  passwordError,
  isLocked,
  onExpirationChange
}) => {
  return (
    <Box sx={{ mt: 2, mb: 1 }}>
      <Grid
        container
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Grid item>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="subtitle2">
              API Key Security Information
            </Typography>
            <Tooltip title="Keys are only shared with LLM providers and stored encrypted. We recommend temporary session-only storage. There is the option of password-protected persistent storage with an expiration date.">
              <IconButton size="small" color="primary">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        </Grid>

        <Grid item>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2">
              Storage & Expiration:
            </Typography>
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
              <MenuItem value="never">Never expire</MenuItem>
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
            <AlertTitle>Password Requirements</AlertTitle>A strong
            password is required when storing API keys persistently:
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
    </Box>
  );
};

export default SecurityOptions;
