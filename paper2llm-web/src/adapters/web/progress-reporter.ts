// AI Summary: Implements progress reporting for asynchronous operations.
// Provides event-based system for tracking progress stages, errors, and completion.

import { 
  ProgressReporter, 
  ProgressUpdate, 
  ProgressListener, 
  ErrorListener, 
  CompleteListener,
  OcrResult 
} from '../../types/interfaces';

/**
 * Implements the ProgressReporter interface for web browsers
 * using an event-based system for progress tracking
 */
export class WebProgressReporter implements ProgressReporter {
  private progressListeners: ProgressListener[] = [];
  private errorListeners: ErrorListener[] = [];
  private completeListeners: CompleteListener[] = [];
  
  /**
   * Reports a progress update to all registered listeners
   */
  public reportProgress(update: ProgressUpdate): void {
    this.progressListeners.forEach(listener => listener(update));
  }
  
  /**
   * Reports an error to all registered listeners
   */
  public reportError(error: Error, stage: string): void {
    this.errorListeners.forEach(listener => listener(error, stage));
  }
  
  /**
   * Reports completion to all registered listeners
   */
  public reportComplete(result: OcrResult): void {
    this.completeListeners.forEach(listener => listener(result));
  }
  
  /**
   * Adds a progress update listener
   */
  public addProgressListener(listener: ProgressListener): void {
    this.progressListeners.push(listener);
  }
  
  /**
   * Removes a progress update listener
   */
  public removeProgressListener(listener: ProgressListener): void {
    this.progressListeners = this.progressListeners.filter(l => l !== listener);
  }
  
  /**
   * Adds an error listener
   */
  public addErrorListener(listener: ErrorListener): void {
    this.errorListeners.push(listener);
  }
  
  /**
   * Removes an error listener
   */
  public removeErrorListener(listener: ErrorListener): void {
    this.errorListeners = this.errorListeners.filter(l => l !== listener);
  }
  
  /**
   * Adds a completion listener
   */
  public addCompleteListener(listener: CompleteListener): void {
    this.completeListeners.push(listener);
  }
  
  /**
   * Removes a completion listener
   */
  public removeCompleteListener(listener: CompleteListener): void {
    this.completeListeners = this.completeListeners.filter(l => l !== listener);
  }
}

// Create a singleton instance for easy import
export const webProgressReporter = new WebProgressReporter();
