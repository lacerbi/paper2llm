// AI Summary: Password input field with visibility toggle and validation error display.
// Shows appropriate required status based on storage type and handles disabled state.

import React from 'react';
import {
  TextField,
  InputAdornment,
  IconButton
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Lock as LockIcon
} from '@mui/icons-material';
import { ApiKeyExpiration } from '../../../types/interfaces';

interface PasswordFieldProps {
  password: string;
  showPasswordField: boolean;
  expiration: ApiKeyExpiration;
  passwordError: string | null;
  error: string | null;
  isLocked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleVisibility: () => void;
}

/**
 * Component that renders a password field with visibility toggle
 */
const PasswordField: React.FC<PasswordFieldProps> = ({
  password,
  showPasswordField,
  expiration,
  passwordError,
  error,
  isLocked,
  onChange,
  onToggleVisibility
}) => {
  const isRequired = expiration !== 'session';
  const isDisabled = expiration === 'session';

  return (
    <TextField
      id="password"
      label={isRequired ? "Password (Required)" : "Password (Not needed)"}
      type={showPasswordField ? "text" : "password"}
      value={password}
      onChange={onChange}
      placeholder={isDisabled ? "Auto-generated" : "Enter password"}
      required={isRequired}
      disabled={isDisabled || isLocked}
      error={
        !!passwordError ||
        error?.includes("password") ||
        error?.includes("Password")
      }
      helperText={passwordError}
      fullWidth
      size="small"
      variant="outlined"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <LockIcon
              fontSize="small"
              color={
                isDisabled ? "disabled" : isRequired ? "primary" : "action"
              }
            />
          </InputAdornment>
        ),
        endAdornment: !isDisabled && (
          <InputAdornment position="end">
            <IconButton
              aria-label="toggle password visibility"
              onClick={onToggleVisibility}
              edge="end"
              size="small"
              disabled={isLocked}
            >
              {showPasswordField ? (
                <VisibilityOffIcon />
              ) : (
                <VisibilityIcon />
              )}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
};

export default PasswordField;
