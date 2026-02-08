/**
 * Document Extraction Query Layer
 *
 * TanStack Query factories for document text extraction operations.
 */

import type {
  DocumentExtractionMethod,
  DocumentExtractionPreferences,
} from "$lib/schema/workspaces";
import type { RouterOutputs } from "$lib/trpc/router";
import { trpc } from "$lib/trpc/client";
import { queryClient } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";
import { accountDocumentKeys } from "./account-documents";

// Infer extraction result type from tRPC router output
type ExtractionResult = RouterOutputs["documentExtractionRouter"]["extractDocument"];

// Query keys
export const documentExtractionKeys = createQueryKeys("documentExtraction", {
  preferences: () => ["documentExtraction", "preferences"] as const,
  status: (documentId: number) => ["documentExtraction", "status", documentId] as const,
  pending: (limit?: number) => ["documentExtraction", "pending", limit] as const,
  languages: () => ["documentExtraction", "languages"] as const,
});

// ==================== Queries ====================

/**
 * Get document extraction preferences
 */
export const getDocumentExtractionPreferences = () =>
  defineQuery<DocumentExtractionPreferences>({
    queryKey: documentExtractionKeys.preferences(),
    queryFn: () => trpc().documentExtractionRouter.getPreferences.query(),
    options: {
      staleTime: 1000 * 60 * 5, // 5 minutes
    },
  });

/**
 * Get extraction status for a document
 */
export const getExtractionStatus = (documentId: number) =>
  defineQuery({
    queryKey: documentExtractionKeys.status(documentId),
    queryFn: () => trpc().documentExtractionRouter.getExtractionStatus.query({ documentId }),
    options: {
      staleTime: 1000 * 10, // 10 seconds - refresh often for status updates
    },
  });

/**
 * Get documents pending extraction
 */
export const getPendingExtractions = (limit?: number) =>
  defineQuery({
    queryKey: documentExtractionKeys.pending(limit),
    queryFn: () => trpc().documentExtractionRouter.getPendingExtractions.query({ limit }),
    options: {
      staleTime: 1000 * 30, // 30 seconds
    },
  });

/**
 * Get available OCR languages
 */
export const getAvailableLanguages = () =>
  defineQuery({
    queryKey: documentExtractionKeys.languages(),
    queryFn: () => trpc().documentExtractionRouter.getAvailableLanguages.query(),
    options: {
      staleTime: 1000 * 60 * 60, // 1 hour - languages don't change
    },
  });

// ==================== Mutations ====================

/**
 * Update document extraction preferences
 */
export const updateDocumentExtractionPreferences = () =>
  defineMutation<Partial<DocumentExtractionPreferences>, DocumentExtractionPreferences>({
    mutationFn: (input) => trpc().documentExtractionRouter.updatePreferences.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentExtractionKeys.preferences() });
    },
    successMessage: "Document extraction settings updated",
    errorMessage: "Failed to update extraction settings",
  });

/**
 * Toggle document extraction on/off
 */
export const toggleDocumentExtraction = () =>
  defineMutation<{ enabled: boolean }, { enabled: boolean }>({
    mutationFn: (input) => trpc().documentExtractionRouter.toggle.mutate(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentExtractionKeys.preferences() });
    },
    successMessage: (data) =>
      data.enabled ? "Document extraction enabled" : "Document extraction disabled",
    errorMessage: "Failed to toggle extraction",
  });

/**
 * Manually trigger extraction for a document
 */
export const extractDocument = () =>
  defineMutation<{ documentId: number; method?: DocumentExtractionMethod }, ExtractionResult>({
    mutationFn: (input) => trpc().documentExtractionRouter.extractDocument.mutate(input),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentExtractionKeys.status(variables.documentId),
      });
      queryClient.invalidateQueries({ queryKey: documentExtractionKeys.pending() });
      queryClient.invalidateQueries({ queryKey: accountDocumentKeys.all() });
    },
    successMessage: (result) =>
      result.success ? "Text extracted successfully" : "Extraction completed with errors",
    errorMessage: "Failed to extract document",
  });

/**
 * Re-extract document with a specific method
 */
export const reExtractDocument = () =>
  defineMutation<{ documentId: number; method: DocumentExtractionMethod }, ExtractionResult>({
    mutationFn: (input) => trpc().documentExtractionRouter.reExtract.mutate(input),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({
        queryKey: documentExtractionKeys.status(variables.documentId),
      });
      queryClient.invalidateQueries({ queryKey: documentExtractionKeys.pending() });
      queryClient.invalidateQueries({ queryKey: accountDocumentKeys.all() });
    },
    successMessage: (result) =>
      result.success ? "Re-extraction successful" : "Re-extraction completed with errors",
    errorMessage: "Failed to re-extract document",
  });

// ==================== Namespace Export ====================

export const DocumentExtraction = {
  keys: documentExtractionKeys,
  getPreferences: getDocumentExtractionPreferences,
  getStatus: getExtractionStatus,
  getPending: getPendingExtractions,
  getLanguages: getAvailableLanguages,
  updatePreferences: updateDocumentExtractionPreferences,
  toggle: toggleDocumentExtraction,
  extract: extractDocument,
  reExtract: reExtractDocument,
};
