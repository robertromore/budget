import { readFile } from "fs/promises";
import { PDFParse } from "pdf-parse";

export interface PdfExtractionResult {
  text: string;
  pageCount: number;
  info?: {
    title?: string;
    author?: string;
    creationDate?: Date;
  };
}

/**
 * Extract text from a PDF file using pdf-parse
 * Best for text-based PDFs (not scanned documents)
 */
export async function extractPdfText(filePath: string): Promise<PdfExtractionResult> {
  const buffer = await readFile(filePath);

  // pdf-parse v2 requires data in constructor
  const parser = new PDFParse({ data: buffer });

  try {
    const textResult = await parser.getText();

    // Get info if available
    const infoResult = await parser.getInfo().catch(() => null);

    // Get dates from the date helper
    const dateNode = infoResult?.getDateNode();

    return {
      text: textResult.text.trim(),
      pageCount: textResult.total,
      info: infoResult?.info
        ? {
            title: infoResult.info.Title as string | undefined,
            author: infoResult.info.Author as string | undefined,
            creationDate: dateNode?.CreationDate ?? undefined,
          }
        : undefined,
    };
  } finally {
    // Clean up parser resources
    await parser.destroy().catch(() => {});
  }
}

/**
 * Check if PDF has extractable text
 * Returns false if the PDF appears to be scanned/image-based
 */
export async function hasPdfText(filePath: string): Promise<boolean> {
  try {
    const result = await extractPdfText(filePath);
    // If we get very little text relative to page count, it's likely scanned
    const avgCharsPerPage = result.text.length / Math.max(result.pageCount, 1);
    return avgCharsPerPage > 100; // Arbitrary threshold
  } catch {
    return false;
  }
}
