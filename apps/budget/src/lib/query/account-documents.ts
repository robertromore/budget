import type { AccountDocument, DocumentType } from "$lib/schema/account-documents";
import { trpc } from "$lib/trpc/client";
import { cachePatterns } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

/**
 * Query Keys for account document operations
 */
export const accountDocumentKeys = createQueryKeys("account-documents", {
  all: () => ["account-documents", "all"] as const,
  lists: () => ["account-documents", "list"] as const,
  detail: (id: number) => ["account-documents", "detail", id] as const,
  byAccount: (accountId: number) => ["account-documents", "account", accountId] as const,
  byAccountAndYear: (accountId: number, taxYear: number) =>
    ["account-documents", "account", accountId, "year", taxYear] as const,
  byTaxYear: (taxYear: number) => ["account-documents", "year", taxYear] as const,
  availableTaxYears: () => ["account-documents", "years"] as const,
  availableTaxYearsForAccount: (accountId: number) =>
    ["account-documents", "years", "account", accountId] as const,
  counts: (taxYear?: number) =>
    taxYear
      ? (["account-documents", "counts", taxYear] as const)
      : (["account-documents", "counts"] as const),
});

// ============================================================================
// Account Document Queries
// ============================================================================

/**
 * Get all documents (optionally filtered by tax year)
 */
export const getAllDocuments = (taxYear?: number) => {
  return defineQuery({
    queryKey: taxYear ? accountDocumentKeys.byTaxYear(taxYear) : accountDocumentKeys.all(),
    queryFn: () => trpc().accountDocumentsRouter.getAll.query(taxYear ? { taxYear } : {}),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get documents by account (optionally filtered by tax year)
 */
export const getDocumentsByAccount = (accountId: number, taxYear?: number) => {
  return defineQuery({
    queryKey: taxYear
      ? accountDocumentKeys.byAccountAndYear(accountId, taxYear)
      : accountDocumentKeys.byAccount(accountId),
    queryFn: () =>
      trpc().accountDocumentsRouter.getByAccount.query({ accountId, taxYear }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get documents by tax year
 */
export const getDocumentsByTaxYear = (taxYear: number) => {
  return defineQuery({
    queryKey: accountDocumentKeys.byTaxYear(taxYear),
    queryFn: () => trpc().accountDocumentsRouter.getByTaxYear.query({ taxYear }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get document by ID
 */
export const getDocumentById = (id: number) => {
  return defineQuery({
    queryKey: accountDocumentKeys.detail(id),
    queryFn: () => trpc().accountDocumentsRouter.getById.query({ id }),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

/**
 * Get available tax years
 */
export const getAvailableTaxYears = () => {
  return defineQuery({
    queryKey: accountDocumentKeys.availableTaxYears(),
    queryFn: () => trpc().accountDocumentsRouter.getAvailableTaxYears.query(),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};

/**
 * Get available tax years for a specific account
 */
export const getAvailableTaxYearsForAccount = (accountId: number) => {
  return defineQuery({
    queryKey: accountDocumentKeys.availableTaxYearsForAccount(accountId),
    queryFn: () =>
      trpc().accountDocumentsRouter.getAvailableTaxYearsForAccount.query({ accountId }),
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });
};

/**
 * Get document counts (total and by type)
 */
export const getDocumentCounts = (taxYear?: number) => {
  return defineQuery({
    queryKey: accountDocumentKeys.counts(taxYear),
    queryFn: () => trpc().accountDocumentsRouter.getCounts.query(taxYear ? { taxYear } : {}),
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
};

// ============================================================================
// Account Document Mutations
// ============================================================================

/**
 * Upload document (uses fetch API, not tRPC)
 */
export const uploadDocument = defineMutation<
  {
    accountId: number;
    taxYear: number;
    file: File;
    documentType?: DocumentType;
    title?: string;
    description?: string;
  },
  { success: boolean; document: AccountDocument }
>({
  mutationFn: async (variables) => {
    const formData = new FormData();
    formData.append("accountId", variables.accountId.toString());
    formData.append("taxYear", variables.taxYear.toString());
    formData.append("file", variables.file);
    if (variables.documentType) {
      formData.append("documentType", variables.documentType);
    }
    if (variables.title) {
      formData.append("title", variables.title);
    }
    if (variables.description) {
      formData.append("description", variables.description);
    }

    const response = await fetch("/api/documents/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Upload failed" }));
      throw new Error(error.message || "Failed to upload document");
    }

    return response.json();
  },
  onSuccess: (result, variables) => {
    // Invalidate all document lists
    cachePatterns.invalidatePrefix(accountDocumentKeys.all());
    cachePatterns.invalidatePrefix(accountDocumentKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(accountDocumentKeys.byTaxYear(variables.taxYear));
    cachePatterns.invalidatePrefix(accountDocumentKeys.availableTaxYears());
    cachePatterns.invalidatePrefix(accountDocumentKeys.counts());
    cachePatterns.invalidatePrefix(accountDocumentKeys.counts(variables.taxYear));
  },
  successMessage: "Document uploaded successfully",
  errorMessage: "Failed to upload document",
});

/**
 * Update document metadata
 */
export const updateDocument = defineMutation<
  {
    id: number;
    accountId: number;
    taxYear: number;
    documentType?: DocumentType;
    title?: string | null;
    description?: string | null;
    newTaxYear?: number;
  },
  AccountDocument
>({
  mutationFn: ({ id, documentType, title, description, newTaxYear }) =>
    trpc().accountDocumentsRouter.update.mutate({
      id,
      documentType,
      title,
      description,
      taxYear: newTaxYear,
    }),
  onSuccess: (updatedDocument, variables) => {
    // Update the detail query cache
    cachePatterns.setQueryData(accountDocumentKeys.detail(updatedDocument.id), updatedDocument);

    // Invalidate related lists
    cachePatterns.invalidatePrefix(accountDocumentKeys.all());
    cachePatterns.invalidatePrefix(accountDocumentKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(accountDocumentKeys.byTaxYear(variables.taxYear));
    if (variables.newTaxYear && variables.newTaxYear !== variables.taxYear) {
      cachePatterns.invalidatePrefix(accountDocumentKeys.byTaxYear(variables.newTaxYear));
    }
  },
  successMessage: "Document updated successfully",
  errorMessage: "Failed to update document",
});

/**
 * Delete document
 */
export const deleteDocument = defineMutation<
  { id: number; accountId: number; taxYear: number },
  { success: boolean }
>({
  mutationFn: ({ id }) => trpc().accountDocumentsRouter.delete.mutate({ id }),
  onSuccess: (_result, variables) => {
    // Remove from detail cache
    cachePatterns.invalidateQueries(accountDocumentKeys.detail(variables.id));

    // Invalidate list queries
    cachePatterns.invalidatePrefix(accountDocumentKeys.all());
    cachePatterns.invalidatePrefix(accountDocumentKeys.byAccount(variables.accountId));
    cachePatterns.invalidatePrefix(accountDocumentKeys.byTaxYear(variables.taxYear));
    cachePatterns.invalidatePrefix(accountDocumentKeys.availableTaxYears());
    cachePatterns.invalidatePrefix(accountDocumentKeys.counts());
    cachePatterns.invalidatePrefix(accountDocumentKeys.counts(variables.taxYear));
  },
  successMessage: "Document deleted successfully",
  errorMessage: "Failed to delete document",
});

/**
 * Bulk delete documents
 */
export const bulkDeleteDocuments = defineMutation<
  { ids: number[] },
  { deletedCount: number; errors: string[] }
>({
  mutationFn: (variables) => trpc().accountDocumentsRouter.bulkDelete.mutate(variables),
  onSuccess: () => {
    // Invalidate all document lists since we don't know which accounts/years were affected
    cachePatterns.invalidatePrefix(accountDocumentKeys.all());
    cachePatterns.invalidatePrefix(accountDocumentKeys.lists());
    cachePatterns.invalidatePrefix(accountDocumentKeys.availableTaxYears());
    cachePatterns.invalidatePrefix(accountDocumentKeys.counts());
  },
  successMessage: (data) => `${data.deletedCount} document(s) deleted`,
  errorMessage: "Failed to delete documents",
  importance: "important",
});

// ============================================================================
// AI Document Operations
// ============================================================================

/**
 * Explain document using AI
 * Requires AI to be enabled in workspace settings
 */
export const explainDocument = defineMutation<
  { documentId: number },
  {
    explanation: string;
    documentTitle: string;
    documentType: string | null;
    taxYear: number;
  }
>({
  mutationFn: (variables) => trpc().aiRoutes.explainDocument.mutate(variables),
  errorMessage: (error) => {
    if (error instanceof Error) {
      // Return user-friendly error messages
      if (error.message.includes("AI features are not enabled")) {
        return "AI is not enabled. Enable it in Settings > Intelligence.";
      }
      if (error.message.includes("No LLM provider")) {
        return "No AI provider configured. Set one up in Settings > Intelligence.";
      }
      if (error.message.includes("no extracted text")) {
        return "Document has no text to analyze. OCR may be needed.";
      }
      return error.message;
    }
    return "Failed to explain document";
  },
});
