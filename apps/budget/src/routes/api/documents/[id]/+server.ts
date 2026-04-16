import { accountDocuments } from "$core/schema/account-documents";
import { accounts } from "$core/schema/accounts";
import { workspaceMembers } from "$core/schema/workspace-members";
import { auth } from "$core/server/auth";
import { db } from "$core/server/db";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { error } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      throw error(401, "Authentication required");
    }

    const userId = session.user.id;

    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId) || documentId <= 0) {
      throw error(400, "Invalid document ID");
    }

    // Resolve the owning workspace via the document → account chain BEFORE
    // calling the service, then verify the caller is a member. The service
    // workspace check runs again as defense in depth.
    const [owner] = await db
      .select({ workspaceId: accounts.workspaceId })
      .from(accountDocuments)
      .innerJoin(accounts, eq(accountDocuments.accountId, accounts.id))
      .where(
        and(
          eq(accountDocuments.id, documentId),
          isNull(accountDocuments.deletedAt),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);
    if (!owner) {
      throw error(404, "Document not found");
    }

    const [membership] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, owner.workspaceId)
        )
      )
      .limit(1);
    if (!membership) {
      throw error(403, "You do not have access to this document");
    }

    // Load document via the workspace-scoped service path.
    const documentService = serviceFactory.getAccountDocumentService();
    const document = await documentService.getDocument(documentId, owner.workspaceId);
    if (!document) {
      throw error(404, "Document not found");
    }

    // Get file path
    const filePath = documentService.getDocumentFilePath(document);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`Document file not found: ${filePath}`);
      throw error(404, "Document file not found");
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = document.mimeType || "application/octet-stream";

    // Return file with appropriate headers
    return new Response(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": document.fileSize.toString(),
        "Content-Disposition": `inline; filename="${document.fileName}"`,
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err: any) {
    console.error("Document download error:", err);

    if (err.statusCode === 404 || err.status === 404) {
      throw error(404, err.message || "Document not found");
    }

    // Check if error is already a SvelteKit error (has status property)
    if (err.status) {
      throw err;
    }

    throw error(500, err.message || "Failed to download document");
  }
};
