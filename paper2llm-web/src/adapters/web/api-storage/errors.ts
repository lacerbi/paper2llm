// AI Summary: Defines custom error class for API key storage exceptions.
// Provides meaningful error messages for storage, retrieval, and validation failures.

/**
 * Custom error class for API key storage errors
 * 
 * This error class is used throughout the API key storage module to provide
 * consistent, user-friendly error messages for various failure scenarios including:
 * - Incorrect passwords
 * - API key validation failures
 * - Storage/retrieval errors
 * - Format migration issues
 * 
 * These errors are designed to be displayed directly to users when appropriate.
 */
export class ApiKeyStorageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiKeyStorageError";
  }
}
