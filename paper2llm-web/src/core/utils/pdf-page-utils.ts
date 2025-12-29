// AI Summary: Utility functions for PDF page operations using pdf-lib.
// Handles page counting for both local files and URL-fetched PDFs, and page extraction for local uploads.

import { PDFDocument } from 'pdf-lib';

/**
 * Result of page count detection
 */
export interface PageCountResult {
  pageCount: number;
  error?: string;
}

/**
 * Gets the page count from a PDF file (Blob, File, or ArrayBuffer)
 * @param content The PDF content
 * @returns Page count result
 */
export async function getPdfPageCount(
  content: File | Blob | ArrayBuffer
): Promise<PageCountResult> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (content instanceof ArrayBuffer) {
      arrayBuffer = content;
    } else {
      arrayBuffer = await content.arrayBuffer();
    }

    const pdfDoc = await PDFDocument.load(arrayBuffer, {
      ignoreEncryption: true,
    });

    return { pageCount: pdfDoc.getPageCount() };
  } catch (error) {
    return {
      pageCount: 0,
      error: error instanceof Error ? error.message : 'Failed to read PDF'
    };
  }
}

/**
 * Extracts specified pages from a PDF and returns a new PDF blob
 * @param content Original PDF content
 * @param startPage Start page (1-indexed, inclusive)
 * @param endPage End page (1-indexed, inclusive)
 * @returns New PDF blob containing only selected pages
 */
export async function extractPdfPages(
  content: File | Blob | ArrayBuffer,
  startPage: number,
  endPage: number
): Promise<Blob> {
  let arrayBuffer: ArrayBuffer;

  if (content instanceof ArrayBuffer) {
    arrayBuffer = content;
  } else {
    arrayBuffer = await content.arrayBuffer();
  }

  const srcDoc = await PDFDocument.load(arrayBuffer);
  const totalPages = srcDoc.getPageCount();

  // Validate page range
  const start = Math.max(1, Math.min(startPage, totalPages));
  const end = Math.max(start, Math.min(endPage, totalPages));

  // Convert to 0-indexed for pdf-lib
  const pageIndices = Array.from(
    { length: end - start + 1 },
    (_, i) => start - 1 + i
  );

  // Create new document with only selected pages
  const newDoc = await PDFDocument.create();
  const copiedPages = await newDoc.copyPages(srcDoc, pageIndices);
  copiedPages.forEach((page) => newDoc.addPage(page));

  const pdfBytes = await newDoc.save();
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Converts 1-indexed page range to 0-indexed array for Mistral API
 * @param startPage Start page (1-indexed)
 * @param endPage End page (1-indexed)
 * @returns Array of 0-indexed page numbers
 */
export function pageRangeToMistralPages(
  startPage: number,
  endPage: number
): number[] {
  return Array.from(
    { length: endPage - startPage + 1 },
    (_, i) => startPage - 1 + i
  );
}
