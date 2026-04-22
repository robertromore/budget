/**
 * PDF File Processor
 *
 * First-class support for PDF statements in the import pipeline.
 * Extracts text via the existing `pdf-parse` infrastructure, then
 * delegates to the parser runtime to turn text into `ImportRow[]`.
 * A no-profile PDF falls back to the `pdf-ai-schema` executor, which
 * asks an LLM to extract transactions against a fixed JSON schema;
 * Phase 2 adds deterministic regex executors for known formats.
 */

import type { LLMPreferences } from "$core/schema/workspaces";
import type { FileProcessor, ImportRow } from "$core/types/import";
import { extractPdfTextFromBuffer } from "$core/server/domains/document-extraction/extractors/pdf-extractor";
import { FileValidationError, ParseError } from "../errors";
import { validateFileType } from "../utils";
import {
  DEFAULT_PDF_AI_CONFIG,
  runPdfExtraction,
  type ParserContext,
  type PdfExtraction,
  type ProfileConfig,
} from "../parser-runtime";

export interface PdfProcessorContextHints {
  workspaceId?: number;
  /**
   * Workspace LLM preferences — required for the `pdf-ai-schema`
   * executor. Callers load this from `workspaces.preferences.llm`
   * and pass it through. Omitting it causes the executor to render
   * an informative "no provider" row rather than crash.
   */
  llmPreferences?: LLMPreferences;
}

export class PDFProcessor implements FileProcessor {
  // Statements can be larger than CSV exports — Chase / Schwab PDFs
  // routinely land in the 2–5MB range. 20MB ceiling matches what
  // `api/documents/upload` allows elsewhere.
  private readonly maxFileSize = 20 * 1024 * 1024;
  private readonly supportedFormats = [".pdf"];
  private readonly profile: ProfileConfig;
  private readonly contextHints: PdfProcessorContextHints;

  /**
   * @param profile Optional profile config that determines which
   *   executor runs. When omitted, falls back to a plain
   *   `pdf-ai-schema` call with defaults — the simplest "just try to
   *   parse this PDF" path.
   * @param contextHints Pass-through fields for the executor (e.g.
   *   `workspaceId`, `llmPreferences`). The File object alone
   *   doesn't carry workspace context, so the caller supplies it.
   */
  constructor(
    profile: ProfileConfig = { formatType: "pdf-ai-schema", config: DEFAULT_PDF_AI_CONFIG },
    contextHints: PdfProcessorContextHints = {},
  ) {
    if (profile.formatType !== "pdf-ai-schema" && profile.formatType !== "pdf-text-regex") {
      throw new Error(
        `PDFProcessor received a non-PDF profile formatType: ${profile.formatType}`,
      );
    }
    this.profile = profile;
    this.contextHints = contextHints;
  }

  getSupportedFormats(): string[] {
    return this.supportedFormats;
  }

  validateFile(file: File): { valid: boolean; error?: string } {
    if (!validateFileType(file.name, this.supportedFormats)) {
      return {
        valid: false,
        error: `Invalid file type. Supported formats: ${this.supportedFormats.join(", ")}`,
      };
    }

    if (file.size > this.maxFileSize) {
      return {
        valid: false,
        error: `File size exceeds limit of ${this.maxFileSize / (1024 * 1024)}MB`,
      };
    }

    if (file.size === 0) {
      return { valid: false, error: "File is empty" };
    }

    return { valid: true };
  }

  async parseFile(file: File): Promise<ImportRow[]> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new FileValidationError(validation.error || "File validation failed", "pdf");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Raw text extraction (pdf-parse). Scanned-only PDFs will yield
    // an empty or very short string — the AI executor still runs but
    // will return zero transactions. A future pass can fall through
    // to tesseract / ai-vision here, matching the document-extraction
    // service's cascade.
    let textResult;
    try {
      textResult = await extractPdfTextFromBuffer(buffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown PDF parse error";
      throw new ParseError(`Failed to extract PDF text: ${message}`);
    }

    if (!textResult.text || textResult.text.trim().length === 0) {
      throw new ParseError(
        "No extractable text found in PDF. The document may be image-only (scanned). OCR fallback is a Phase 2 follow-up.",
      );
    }

    // `pdf-parse` inserts a form-feed between pages. Pre-split so
    // chunk-by-page works without the executor re-scanning the text.
    const pages = textResult.text.split(/\f/).map((p) => p.trim());

    const extraction: PdfExtraction = {
      text: textResult.text,
      pageCount: textResult.pageCount,
      fileName: file.name,
      pages: pages.length > 0 ? pages : [textResult.text],
    };

    const ctx: ParserContext = {
      fileName: file.name,
      ...(this.contextHints.workspaceId != null
        ? { workspaceId: this.contextHints.workspaceId }
        : {}),
      ...(this.contextHints.llmPreferences
        ? { llmPreferences: this.contextHints.llmPreferences }
        : {}),
    };

    return runPdfExtraction(extraction, this.profile, ctx);
  }
}
