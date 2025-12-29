// AI Summary: Component for selecting page range in multi-page PDFs using dual-thumb slider.
// Shows total page count and allows users to select start/end pages for processing.

import React from 'react';
import {
  Box,
  Typography,
  Slider,
  Stack,
  TextField,
  Chip,
  CircularProgress,
  Alert
} from '@mui/material';
import { Description as PageIcon } from '@mui/icons-material';

interface PageRangeSelectorProps {
  pageCount: number | null;
  pageRange: [number, number];
  onPageRangeChange: (range: [number, number]) => void;
  isLoading?: boolean;
  error?: string | null;
  disabled?: boolean;
}

const PageRangeSelector: React.FC<PageRangeSelectorProps> = ({
  pageCount,
  pageRange,
  onPageRangeChange,
  isLoading = false,
  error = null,
  disabled = false
}) => {
  // Show loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 1 }}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">
          Detecting page count...
        </Typography>
      </Box>
    );
  }

  // Show error if page count detection failed
  if (error) {
    return (
      <Alert severity="warning" sx={{ mt: 1 }}>
        Could not detect page count: {error}. All pages will be processed.
      </Alert>
    );
  }

  // Don't show selector if page count unknown
  if (!pageCount || pageCount <= 0) {
    return null;
  }

  // For single-page PDFs, just show info text
  if (pageCount === 1) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
        <PageIcon fontSize="small" color="action" />
        <Typography variant="body2" color="text.secondary">
          1 page
        </Typography>
      </Box>
    );
  }

  // Multi-page PDF: show slider
  const handleSliderChange = (_event: Event, newValue: number | number[]) => {
    if (Array.isArray(newValue) && newValue.length === 2) {
      onPageRangeChange([newValue[0], newValue[1]]);
    }
  };

  const handleStartInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(1, Math.min(Number(event.target.value) || 1, pageRange[1]));
    onPageRangeChange([value, pageRange[1]]);
  };

  const handleEndInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(pageRange[0], Math.min(Number(event.target.value) || pageCount, pageCount));
    onPageRangeChange([pageRange[0], value]);
  };

  const selectedCount = pageRange[1] - pageRange[0] + 1;
  const isFullRange = pageRange[0] === 1 && pageRange[1] === pageCount;

  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <PageIcon fontSize="small" />
          {pageCount} pages total
        </Typography>
        <Chip
          label={isFullRange ? 'All pages' : `${selectedCount} of ${pageCount} pages`}
          size="small"
          color={isFullRange ? 'default' : 'primary'}
          variant="outlined"
        />
      </Box>

      <Box sx={{ px: 1 }}>
        <Slider
          value={pageRange}
          onChange={handleSliderChange}
          min={1}
          max={pageCount}
          step={1}
          marks={pageCount <= 20 ? true : [
            { value: 1, label: '1' },
            { value: pageCount, label: String(pageCount) }
          ]}
          valueLabelDisplay="auto"
          getAriaLabel={() => 'Page range'}
          getAriaValueText={(value) => `Page ${value}`}
          disabled={disabled}
          disableSwap
          sx={{
            '& .MuiSlider-markLabel': {
              fontSize: '0.75rem'
            }
          }}
        />
      </Box>

      <Stack direction="row" spacing={2} sx={{ mt: 1 }} alignItems="center">
        <TextField
          label="From"
          type="number"
          size="small"
          value={pageRange[0]}
          onChange={handleStartInputChange}
          disabled={disabled}
          inputProps={{ min: 1, max: pageRange[1] }}
          sx={{ width: 80 }}
        />
        <Typography variant="body2" color="text.secondary">to</Typography>
        <TextField
          label="To"
          type="number"
          size="small"
          value={pageRange[1]}
          onChange={handleEndInputChange}
          disabled={disabled}
          inputProps={{ min: pageRange[0], max: pageCount }}
          sx={{ width: 80 }}
        />
      </Stack>
    </Box>
  );
};

export default PageRangeSelector;
