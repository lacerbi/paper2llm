// AI Summary: Renders provider selection tabs with authentication status indicators.
// Allows users to switch between different API providers with visual feedback.

import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { Check as CheckIcon } from '@mui/icons-material';
import { ApiProvider } from '../../../types/interfaces';
import { PROVIDER_INFO } from './constants';

interface ProviderTabsProps {
  currentProvider: ApiProvider;
  isAuthenticated: Record<ApiProvider, boolean>;
  onProviderChange: (event: React.SyntheticEvent, newProvider: ApiProvider) => void;
}

/**
 * Component that renders tabs for selecting between different API providers
 */
const ProviderTabs: React.FC<ProviderTabsProps> = ({
  currentProvider,
  isAuthenticated,
  onProviderChange
}) => {
  return (
    <Tabs
      value={currentProvider}
      onChange={onProviderChange}
      sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
    >
      {Object.entries(PROVIDER_INFO).map(([provider, info]) => (
        <Tab
          key={provider}
          value={provider}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {info.name}
              {isAuthenticated[provider as ApiProvider] && (
                <CheckIcon
                  sx={{ ml: 1, fontSize: '0.9rem', color: 'success.main' }}
                />
              )}
            </Box>
          }
        />
      ))}
    </Tabs>
  );
};

export default ProviderTabs;
