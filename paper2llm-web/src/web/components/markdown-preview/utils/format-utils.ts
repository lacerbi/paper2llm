/**
 * Formats an ISO timestamp to a human-readable string
 * 
 * @param isoString The ISO timestamp to format
 * @returns Formatted date and time string
 */
export const formatTimestamp = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleString();
};

/**
 * Formats file size in bytes to a human-readable string
 * 
 * @param bytes The file size in bytes
 * @returns Formatted file size string (B, KB, MB)
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
};
