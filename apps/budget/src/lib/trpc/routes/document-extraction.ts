/**
 * Document Extraction tRPC Routes
 *
 * Provides API endpoints for managing document text extraction settings
 * and triggering extraction operations.
 */

import {
  DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
  type DocumentExtractionMethod,
  type DocumentExtractionPreferences,
  workspaces,
} from "$lib/schema/workspaces";
import { extractionMethodKeys, extractionStatusKeys } from "$lib/schema/account-documents";
import { db } from "$lib/server/db";
import { DocumentExtractionService } from "$lib/server/domains/document-extraction";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { publicProcedure, t } from "$lib/trpc";
import { translateDomainError } from "$lib/trpc/shared/errors";
import { nowISOString } from "$lib/utils/dates";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";

// Zod schemas for validation
const extractionMethodSchema = z.enum(["auto", "pdf-parse", "tesseract", "ai-vision"]);
const llmProviderSchema = z.enum(["openai", "anthropic", "google", "ollama"]);

const documentExtractionPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  method: extractionMethodSchema.optional(),
  autoExtractOnUpload: z.boolean().optional(),
  aiVisionProvider: llmProviderSchema.nullable().optional(),
  fallbackToOcr: z.boolean().optional(),
  fallbackToAi: z.boolean().optional(),
  tesseractLanguage: z.string().optional(),
});

// Helper to get preferences from workspace
async function getWorkspacePreferences(workspaceId: number) {
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, workspaceId),
  });

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  const prefs = workspace.preferences ? JSON.parse(workspace.preferences) : {};
  return prefs;
}

// Helper to get document extraction preferences
function getExtractionPrefs(prefs: any): DocumentExtractionPreferences {
  return {
    ...DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
    ...prefs.documentExtraction,
  };
}

// Helper to get LLM preferences
function getLLMPrefs(prefs: any) {
  return prefs.llm || { enabled: false, defaultProvider: null, providers: {}, featureModes: {} };
}

// Create the extraction service with preference fetchers
function createExtractionService(workspaceId: number): DocumentExtractionService {
  return new DocumentExtractionService(
    serviceFactory.getAccountDocumentRepository(),
    async () => {
      const prefs = await getWorkspacePreferences(workspaceId);
      return getExtractionPrefs(prefs);
    },
    async () => {
      const prefs = await getWorkspacePreferences(workspaceId);
      return getLLMPrefs(prefs);
    }
  );
}

export const documentExtractionRouter = t.router({
  /**
   * Get document extraction preferences
   */
  getPreferences: publicProcedure.query(async ({ ctx }) => {
    try {
      const workspaceId = ctx.workspaceId;
      if (!workspaceId) throw new Error("Workspace ID required");

      const prefs = await getWorkspacePreferences(workspaceId);
      return getExtractionPrefs(prefs);
    } catch (error) {
      throw translateDomainError(error);
    }
  }),

  /**
   * Update document extraction preferences
   */
  updatePreferences: publicProcedure
    .input(documentExtractionPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      try {
        const workspaceId = ctx.workspaceId;
        if (!workspaceId) throw new Error("Workspace ID required");

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
        });

        if (!workspace) {
          throw new Error("Workspace not found");
        }

        const existingPrefs = workspace.preferences ? JSON.parse(workspace.preferences) : {};
        const existingExtractionPrefs = existingPrefs.documentExtraction || {};

        const updatedExtractionPrefs: DocumentExtractionPreferences = {
          ...DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
          ...existingExtractionPrefs,
          ...input,
        };

        const updatedPrefs = {
          ...existingPrefs,
          documentExtraction: updatedExtractionPrefs,
        };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify(updatedPrefs),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, workspaceId))
          .execute();

        return updatedExtractionPrefs;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Toggle document extraction on/off
   */
  toggle: publicProcedure
    .input(z.object({ enabled: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const workspaceId = ctx.workspaceId;
        if (!workspaceId) throw new Error("Workspace ID required");

        const workspace = await db.query.workspaces.findFirst({
          where: eq(workspaces.id, workspaceId),
        });

        if (!workspace) {
          throw new Error("Workspace not found");
        }

        const existingPrefs = workspace.preferences ? JSON.parse(workspace.preferences) : {};
        const existingExtractionPrefs = existingPrefs.documentExtraction || {};

        const updatedExtractionPrefs = {
          ...DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
          ...existingExtractionPrefs,
          enabled: input.enabled,
        };

        const updatedPrefs = {
          ...existingPrefs,
          documentExtraction: updatedExtractionPrefs,
        };

        await db
          .update(workspaces)
          .set({
            preferences: JSON.stringify(updatedPrefs),
            updatedAt: nowISOString(),
          })
          .where(eq(workspaces.id, workspaceId))
          .execute();

        return { enabled: input.enabled };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Manually trigger extraction for a document
   */
  extractDocument: publicProcedure
    .input(
      z.object({
        documentId: z.number().positive(),
        method: extractionMethodSchema.optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspaceId = ctx.workspaceId;
        if (!workspaceId) throw new Error("Workspace ID required");

        const extractionService = createExtractionService(workspaceId);
        const docRepo = serviceFactory.getAccountDocumentRepository();

        const document = await docRepo.findById(input.documentId);
        if (!document) {
          throw new Error("Document not found");
        }

        const uploadsDir = process.cwd() + "/uploads/documents";
        const filePath = `${uploadsDir}/${document.storagePath}`;

        const result = await extractionService.extractText(
          input.documentId,
          filePath,
          document.mimeType,
          input.method ? { method: input.method } : undefined
        );

        return result;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Re-extract a document with a specific method
   */
  reExtract: publicProcedure
    .input(
      z.object({
        documentId: z.number().positive(),
        method: extractionMethodSchema,
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const workspaceId = ctx.workspaceId;
        if (!workspaceId) throw new Error("Workspace ID required");

        const extractionService = createExtractionService(workspaceId);
        const result = await extractionService.reExtract(input.documentId, input.method);

        return result;
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get extraction status for a document
   */
  getExtractionStatus: publicProcedure
    .input(z.object({ documentId: z.number().positive() }))
    .query(async ({ ctx, input }) => {
      try {
        const docRepo = serviceFactory.getAccountDocumentRepository();
        const document = await docRepo.findById(input.documentId);

        if (!document) {
          throw new Error("Document not found");
        }

        return {
          documentId: document.id,
          status: document.extractionStatus,
          method: document.extractionMethod,
          error: document.extractionError,
          extractedAt: document.extractedAt,
          hasText: !!document.extractedText,
          textLength: document.extractedText?.length || 0,
        };
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get documents pending extraction
   */
  getPendingExtractions: publicProcedure
    .input(z.object({ limit: z.number().positive().max(100).optional() }))
    .query(async ({ ctx, input }) => {
      try {
        const docRepo = serviceFactory.getAccountDocumentRepository();
        const documents = await docRepo.findPendingExtractions(input.limit || 10);

        return documents.map((doc) => ({
          id: doc.id,
          fileName: doc.fileName,
          mimeType: doc.mimeType,
          uploadedAt: doc.uploadedAt,
        }));
      } catch (error) {
        throw translateDomainError(error);
      }
    }),

  /**
   * Get available OCR languages
   */
  getAvailableLanguages: publicProcedure.query(() => {
    return [
      { code: "eng", name: "English" },
      { code: "spa", name: "Spanish" },
      { code: "fra", name: "French" },
      { code: "deu", name: "German" },
      { code: "ita", name: "Italian" },
      { code: "por", name: "Portuguese" },
      { code: "chi_sim", name: "Chinese (Simplified)" },
      { code: "chi_tra", name: "Chinese (Traditional)" },
      { code: "jpn", name: "Japanese" },
      { code: "kor", name: "Korean" },
      { code: "ara", name: "Arabic" },
      { code: "rus", name: "Russian" },
    ];
  }),
});
