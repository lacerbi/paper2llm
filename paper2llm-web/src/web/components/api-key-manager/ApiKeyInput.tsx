// AI Summary: Component for API key input with visibility toggle and validation.
// Displays masked or visible API key with appropriate input controls and provider documentation link.

import React from "react";
import {
  TextField,
  InputAdornment,
  IconButton,
  FormHelperText,
  Tooltip,
  useTheme,
} from "@mui/material";
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Info as InfoIcon,
} from "@mui/icons-material";
import { ApiProvider } from "../../../types/interfaces";
import { ProviderApiKeyInfo } from "../../../types/interfaces";

interface ApiKeyInputProps {
  provider: ApiProvider;
  providerInfo: ProviderApiKeyInfo;
  apiKey: string;
  maskedApiKey: string;
  isAuthenticated: boolean;
  showApiKeyField: boolean;
  isLocked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleVisibility: () => void;
}

/**
 * Component that renders an API key input field with visibility toggle
 */
const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  provider,
  providerInfo,
  apiKey,
  maskedApiKey,
  isAuthenticated,
  showApiKeyField,
  isLocked,
  onChange,
  onToggleVisibility,
}) => {
  const theme = useTheme();

  return (
    <>
      <TextField
        id={`apiKey-${provider}`}
        label={`${providerInfo.name} API Key`}
        type={isAuthenticated ? "text" : showApiKeyField ? "text" : "password"}
        value={isAuthenticated ? maskedApiKey : apiKey}
        onChange={onChange}
        placeholder={`Enter your ${providerInfo.name} API key`}
        disabled={isAuthenticated || isLocked}
        required
        fullWidth
        size="small"
        variant="outlined"
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Tooltip title={providerInfo.description}>
                <InfoIcon fontSize="small" color="action" />
              </Tooltip>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label="toggle API key visibility"
                onClick={onToggleVisibility}
                edge="end"
                size="small"
                disabled={isLocked}
              >
                {showApiKeyField ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      <FormHelperText>
        <a
          href={providerInfo.docsUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: theme.palette.primary.main }}
        >
          {`Get ${providerInfo.name} API key`}
        </a>
      </FormHelperText>
    </>
  );
};

export default ApiKeyInput;
