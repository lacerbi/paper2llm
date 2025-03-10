// AI Summary: Displays current status of API keys across providers.
// Shows visual indicators for active/inactive states with color-coded status cards.

import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Grid
} from '@mui/material';
import { ApiProvider } from '../../../types/interfaces';
import { PROVIDER_INFO } from './constants';

interface StatusDisplayProps {
  isAuthenticated: Record<ApiProvider, boolean>;
}

/**
 * Component that renders a summary of API key status for all providers
 */
const StatusDisplay: React.FC<StatusDisplayProps> = ({
  isAuthenticated
}) => {
  // Only render if we have multiple providers
  if (Object.keys(PROVIDER_INFO).length <= 1) {
    return null;
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        API Key Status
      </Typography>
      <Grid container spacing={1}>
        {Object.entries(PROVIDER_INFO).map(([provider, info]) => (
          <Grid item xs={6} sm={4} key={provider}>
            <Paper
              variant="outlined"
              sx={{
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderLeft: '4px solid',
                borderColor: isAuthenticated[provider as ApiProvider]
                  ? 'success.main'
                  : 'warning.main',
              }}
            >
              <Typography variant="body2">{info.name}</Typography>
              {isAuthenticated[provider as ApiProvider] ? (
                <Chip
                  label="Active"
                  color="success"
                  size="small"
                  variant="outlined"
                />
              ) : (
                <Chip
                  label="Inactive"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default StatusDisplay;
