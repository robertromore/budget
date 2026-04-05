import Tesseract from "tesseract.js";

export interface OcrExtractionResult {
  text: string;
  confidence: number; // 0-1 scale
  words?: number;
}

/**
 * Extract text from an image using Tesseract.js OCR
 * Supports JPEG, PNG, WebP, and can also handle PDF pages converted to images
 */
export async function extractWithOcr(
  filePath: string,
  language: string = "eng"
): Promise<OcrExtractionResult> {
  const worker = await Tesseract.createWorker(language);

  try {
    const { data } = await worker.recognize(filePath);

    return {
      text: data.text.trim(),
      confidence: data.confidence / 100, // Convert to 0-1 scale
      // Note: word count removed as API changed in tesseract.js v7
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Extract text from multiple images/pages using OCR
 * Useful for multi-page documents
 */
export async function extractMultipleWithOcr(
  filePaths: string[],
  language: string = "eng"
): Promise<OcrExtractionResult> {
  const worker = await Tesseract.createWorker(language);

  try {
    const results: string[] = [];
    let totalConfidence = 0;

    for (const filePath of filePaths) {
      const { data } = await worker.recognize(filePath);
      results.push(data.text.trim());
      totalConfidence += data.confidence;
    }

    return {
      text: results.join("\n\n--- Page Break ---\n\n"),
      confidence: totalConfidence / (filePaths.length * 100), // Average confidence 0-1
    };
  } finally {
    await worker.terminate();
  }
}

/**
 * Get list of available Tesseract languages
 */
export function getAvailableLanguages(): string[] {
  // Common languages - Tesseract.js downloads these on demand
  return [
    "eng", // English
    "spa", // Spanish
    "fra", // French
    "deu", // German
    "ita", // Italian
    "por", // Portuguese
    "chi_sim", // Chinese Simplified
    "chi_tra", // Chinese Traditional
    "jpn", // Japanese
    "kor", // Korean
    "ara", // Arabic
    "rus", // Russian
  ];
}
