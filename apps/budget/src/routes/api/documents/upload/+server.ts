import {
  ALLOWED_DOCUMENT_MIMES,
  MAX_DOCUMENT_SIZE,
  documentTypeKeys,
} from "$lib/schema/account-documents";
import {
  DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
  DEFAULT_LLM_PREFERENCES,
  workspaces,
} from "$lib/schema/workspaces";
import { db } from "$lib/server/db";
import { DocumentExtractionService } from "$lib/server/domains/document-extraction";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { formatFileSize } from "$lib/utils/formatters";
import { error, json } from "@sveltejs/kit";
import { eq } from "drizzle-orm";
import type { RequestHandler } from "./$types";

/**
 * Trigger document extraction asynchronously
 * This runs after the upload response is sent so it doesn't block the user
 */
async function triggerExtractionAsync(documentId: number, accountId: number): Promise<void> {
  // Get account to find workspaceId
  const accountRepo = serviceFactory.getAccountRepository();
  const account = await accountRepo.findById(accountId);
  if (!account?.workspaceId) {
    console.log(`Skipping extraction: account ${accountId} has no workspace`);
    return;
  }

  // Get workspace preferences
  const workspace = await db.query.workspaces.findFirst({
    where: eq(workspaces.id, account.workspaceId),
  });

  if (!workspace) {
    console.log(`Skipping extraction: workspace ${account.workspaceId} not found`);
    return;
  }

  const prefs = workspace.preferences ? JSON.parse(workspace.preferences) : {};
  const extractionPrefs = {
    ...DEFAULT_DOCUMENT_EXTRACTION_PREFERENCES,
    ...prefs.documentExtraction,
  };

  // Check if extraction is enabled
  if (!extractionPrefs.enabled || !extractionPrefs.autoExtractOnUpload) {
    console.log(`Skipping extraction: extraction disabled or auto-extract off`);
    // Mark as skipped
    const docRepo = serviceFactory.getAccountDocumentRepository();
    await docRepo.update(documentId, { extractionStatus: "skipped" });
    return;
  }

  // Create extraction service and queue extraction
  const llmPrefs = { ...DEFAULT_LLM_PREFERENCES, ...prefs.llm };
  const docRepo = serviceFactory.getAccountDocumentRepository();

  const extractionService = new DocumentExtractionService(
    docRepo,
    async () => extractionPrefs,
    async () => llmPrefs
  );

  await extractionService.queueExtraction(documentId);
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract fields
    const accountId = formData.get("accountId");
    const taxYear = formData.get("taxYear");
    const documentType = formData.get("documentType");
    const title = formData.get("title");
    const description = formData.get("description");
    const file = formData.get("file");

    // Validate required fields
    if (!accountId) {
      throw error(400, "Account ID is required");
    }

    if (!taxYear) {
      throw error(400, "Tax year is required");
    }

    if (!file || !(file instanceof File)) {
      throw error(400, "File is required");
    }

    // Parse account ID
    const parsedAccountId = parseInt(accountId.toString(), 10);
    if (isNaN(parsedAccountId) || parsedAccountId <= 0) {
      throw error(400, "Invalid account ID");
    }

    // Parse tax year
    const parsedTaxYear = parseInt(taxYear.toString(), 10);
    if (isNaN(parsedTaxYear) || parsedTaxYear < 2000 || parsedTaxYear > 2100) {
      throw error(400, "Invalid tax year (must be between 2000 and 2100)");
    }

    // Validate document type if provided
    let parsedDocumentType: (typeof documentTypeKeys)[number] | undefined;
    if (documentType) {
      const docTypeStr = documentType.toString();
      if (documentTypeKeys.includes(docTypeStr as any)) {
        parsedDocumentType = docTypeStr as (typeof documentTypeKeys)[number];
      } else {
        throw error(400, "Invalid document type");
      }
    }

    // Validate file type
    if (!ALLOWED_DOCUMENT_MIMES.includes(file.type as any)) {
      throw error(400, "File type must be JPEG, PNG, WebP, or PDF");
    }

    // Validate file size
    if (file.size > MAX_DOCUMENT_SIZE) {
      throw error(400, `File size must be less than ${formatFileSize(MAX_DOCUMENT_SIZE)}`);
    }

    // Upload document
    const documentService = serviceFactory.getAccountDocumentService();
    const document = await documentService.uploadDocument({
      accountId: parsedAccountId,
      taxYear: parsedTaxYear,
      documentType: parsedDocumentType,
      file,
      title: title?.toString() || undefined,
      description: description?.toString() || undefined,
    });

    // Trigger extraction asynchronously (non-blocking)
    triggerExtractionAsync(document.id, parsedAccountId).catch((err) => {
      console.error(`Failed to trigger extraction for document ${document.id}:`, err);
    });

    return json(
      {
        success: true,
        document,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Document upload error:", err);

    // Handle different error types
    if (err.statusCode === 404) {
      throw error(404, err.message || "Account not found");
    }

    if (err.statusCode === 400 || err.name === "ValidationError") {
      throw error(400, err.message || "Invalid request");
    }

    // Check if error is already a SvelteKit error (has status property)
    if (err.status) {
      throw err;
    }

    // Generic error
    throw error(500, err.message || "Failed to upload document");
  }
};
