import type {
  DocumentExtractionMethod,
  DocumentExtractionPreferences,
  LLMPreferences,
} from "$lib/schema/workspaces";
import type { ExtractionMethod, ExtractionStatus } from "$lib/schema/account-documents";
import type { AccountDocumentRepository } from "../account-documents/repository";
import { extractPdfText, hasPdfText } from "./extractors/pdf-extractor";
import { extractWithOcr } from "./extractors/ocr-extractor";
import { extractWithAiVision, supportsVision } from "./extractors/ai-vision-extractor";

export interface ExtractionResult {
  success: boolean;
  text: string | null;
  method: ExtractionMethod;
  error?: string;
  confidence?: number;
  metadata?: {
    pageCount?: number;
    processingTimeMs?: number;
    provider?: string;
    model?: string;
  };
}

export interface ExtractionOptions {
  method?: DocumentExtractionMethod;
  fallbackToOcr?: boolean;
  fallbackToAi?: boolean;
  tesseractLanguage?: string;
}

/**
 * Document Extraction Service
 *
 * Orchestrates text extraction from documents using multiple methods:
 * - pdf-parse: Fast extraction for text-based PDFs
 * - tesseract: OCR for images and scanned documents
 * - ai-vision: AI-powered extraction using LLM vision capabilities
 */
export class DocumentExtractionService {
  constructor(
    private documentRepository: AccountDocumentRepository,
    private getExtractionPreferences: () => Promise<DocumentExtractionPreferences>,
    private getLLMPreferences: () => Promise<LLMPreferences>
  ) {}

  /**
   * Extract text from a document
   */
  async extractText(
    documentId: number,
    filePath: string,
    mimeType: string,
    options?: ExtractionOptions
  ): Promise<ExtractionResult> {
    const startTime = Date.now();
    const prefs = await this.getExtractionPreferences();

    // Merge options with preferences
    const method = options?.method ?? prefs.method;
    const fallbackToOcr = options?.fallbackToOcr ?? prefs.fallbackToOcr;
    const fallbackToAi = options?.fallbackToAi ?? prefs.fallbackToAi;
    const tesseractLanguage = options?.tesseractLanguage ?? prefs.tesseractLanguage;

    // Update status to processing
    await this.updateExtractionStatus(documentId, "processing");

    try {
      // Select extraction method based on file type and preferences
      const selectedMethod = this.selectExtractionMethod(mimeType, method);
      let result = await this.performExtraction(
        filePath,
        mimeType,
        selectedMethod,
        tesseractLanguage
      );

      // Handle fallbacks if extraction failed or returned empty text
      if (!result.success || !result.text?.trim()) {
        // Try OCR fallback for PDFs
        if (fallbackToOcr && selectedMethod === "pdf-parse" && this.isImage(mimeType)) {
          result = await this.performExtraction(filePath, mimeType, "tesseract", tesseractLanguage);
        }

        // For PDFs that pdf-parse couldn't extract, try OCR on images
        if (
          fallbackToOcr &&
          selectedMethod === "pdf-parse" &&
          (!result.success || !result.text?.trim())
        ) {
          // Note: For full PDF OCR support, you'd need to convert PDF pages to images first
          // This is a simplified version that only works if the file is already an image
          if (this.isImage(mimeType)) {
            result = await this.performExtraction(filePath, mimeType, "tesseract", tesseractLanguage);
          }
        }

        // Try AI fallback if still no text
        if (fallbackToAi && (!result.success || !result.text?.trim())) {
          result = await this.performExtraction(filePath, mimeType, "ai-vision", tesseractLanguage);
        }
      }

      // Add processing time
      result.metadata = {
        ...result.metadata,
        processingTimeMs: Date.now() - startTime,
      };

      // Update document with results
      await this.updateDocumentWithExtraction(documentId, result);

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown extraction error";
      const failedResult: ExtractionResult = {
        success: false,
        text: null,
        method: "none",
        error: errorMessage,
        metadata: { processingTimeMs: Date.now() - startTime },
      };

      await this.updateDocumentWithExtraction(documentId, failedResult);
      return failedResult;
    }
  }

  /**
   * Queue extraction for async processing
   * This is called after document upload
   */
  async queueExtraction(documentId: number): Promise<void> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const prefs = await this.getExtractionPreferences();
    if (!prefs.enabled || !prefs.autoExtractOnUpload) {
      // Mark as skipped if extraction is disabled
      await this.updateExtractionStatus(documentId, "skipped");
      return;
    }

    // Get full file path
    const uploadsDir = process.cwd() + "/uploads/documents";
    const filePath = `${uploadsDir}/${document.storagePath}`;

    // Perform extraction
    await this.extractText(documentId, filePath, document.mimeType);
  }

  /**
   * Re-extract a document with a specific method
   */
  async reExtract(
    documentId: number,
    method: DocumentExtractionMethod
  ): Promise<ExtractionResult> {
    const document = await this.documentRepository.findById(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const uploadsDir = process.cwd() + "/uploads/documents";
    const filePath = `${uploadsDir}/${document.storagePath}`;

    return this.extractText(documentId, filePath, document.mimeType, {
      method,
      fallbackToOcr: false, // Don't fallback when explicitly selecting method
      fallbackToAi: false,
    });
  }

  /**
   * Select the best extraction method based on file type and preferences
   */
  private selectExtractionMethod(
    mimeType: string,
    preferredMethod: DocumentExtractionMethod
  ): "pdf-parse" | "tesseract" | "ai-vision" {
    if (preferredMethod !== "auto") {
      return preferredMethod;
    }

    // Auto-select based on file type
    if (mimeType === "application/pdf") {
      return "pdf-parse"; // Try pdf-parse first for PDFs
    }

    // For images, use OCR by default
    if (this.isImage(mimeType)) {
      return "tesseract";
    }

    // Default to pdf-parse for unknown types
    return "pdf-parse";
  }

  /**
   * Perform extraction using a specific method
   */
  private async performExtraction(
    filePath: string,
    mimeType: string,
    method: "pdf-parse" | "tesseract" | "ai-vision",
    tesseractLanguage: string
  ): Promise<ExtractionResult> {
    try {
      switch (method) {
        case "pdf-parse": {
          if (mimeType !== "application/pdf") {
            return {
              success: false,
              text: null,
              method: "pdf-parse",
              error: "pdf-parse only supports PDF files",
            };
          }

          const pdfResult = await extractPdfText(filePath);
          const hasText = pdfResult.text.length > 50; // Minimum meaningful text

          return {
            success: hasText,
            text: hasText ? pdfResult.text : null,
            method: "pdf-parse",
            confidence: hasText ? 1.0 : 0,
            metadata: { pageCount: pdfResult.pageCount },
            error: hasText ? undefined : "No extractable text found in PDF (may be scanned)",
          };
        }

        case "tesseract": {
          if (mimeType === "application/pdf") {
            return {
              success: false,
              text: null,
              method: "tesseract",
              error: "Tesseract OCR cannot process PDFs directly. Use PDF Parse or AI Vision instead.",
            };
          }

          const ocrResult = await extractWithOcr(filePath, tesseractLanguage);
          const hasText = ocrResult.text.length > 10;

          return {
            success: hasText,
            text: hasText ? ocrResult.text : null,
            method: "tesseract",
            confidence: ocrResult.confidence,
            error: hasText ? undefined : "OCR could not extract text from image",
          };
        }

        case "ai-vision": {
          const llmPrefs = await this.getLLMPreferences();
          const extractionPrefs = await this.getExtractionPreferences();

          if (!llmPrefs.enabled) {
            return {
              success: false,
              text: null,
              method: "ai-vision",
              error: "AI is not enabled in workspace settings",
            };
          }

          // Check if provider supports vision
          const provider = extractionPrefs.aiVisionProvider || llmPrefs.defaultProvider;
          if (provider) {
            const model = llmPrefs.providers[provider].model;
            if (!supportsVision(provider, model)) {
              return {
                success: false,
                text: null,
                method: "ai-vision",
                error: `Model ${model} does not support vision capabilities`,
              };
            }
          }

          const aiResult = await extractWithAiVision(
            filePath,
            mimeType,
            llmPrefs,
            extractionPrefs.aiVisionProvider
          );

          const hasText = aiResult.text.length > 10;

          return {
            success: hasText,
            text: hasText ? aiResult.text : null,
            method: "ai-vision",
            confidence: aiResult.confidence,
            metadata: { provider: aiResult.provider, model: aiResult.model },
            error: hasText ? undefined : "AI could not extract text from document",
          };
        }

        default:
          return {
            success: false,
            text: null,
            method: "none",
            error: `Unknown extraction method: ${method}`,
          };
      }
    } catch (error) {
      return {
        success: false,
        text: null,
        method,
        error: error instanceof Error ? error.message : "Extraction failed",
      };
    }
  }

  /**
   * Update document with extraction results
   */
  private async updateDocumentWithExtraction(
    documentId: number,
    result: ExtractionResult
  ): Promise<void> {
    await this.documentRepository.update(documentId, {
      extractedText: result.text || undefined,
      extractionStatus: result.success ? "completed" : "failed",
      extractionMethod: result.method,
      extractionError: result.error || undefined,
      extractedAt: result.success ? new Date().toISOString() : undefined,
    });
  }

  /**
   * Update extraction status
   */
  private async updateExtractionStatus(
    documentId: number,
    status: ExtractionStatus
  ): Promise<void> {
    await this.documentRepository.update(documentId, {
      extractionStatus: status,
    });
  }

  /**
   * Check if MIME type is an image
   */
  private isImage(mimeType: string): boolean {
    return mimeType.startsWith("image/");
  }
}
