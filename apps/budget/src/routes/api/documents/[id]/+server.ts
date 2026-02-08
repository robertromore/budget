import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { error } from "@sveltejs/kit";
import { existsSync } from "fs";
import { readFile } from "fs/promises";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ params }) => {
  try {
    const documentId = parseInt(params.id, 10);

    if (isNaN(documentId) || documentId <= 0) {
      throw error(400, "Invalid document ID");
    }

    // Get document metadata from database
    const documentService = serviceFactory.getAccountDocumentService();
    const document = await documentService.getDocument(documentId);

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
