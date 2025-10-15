import { error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ReceiptService } from "$lib/server/domains/medical-expenses";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

const receiptService = new ReceiptService();

export const GET: RequestHandler = async ({ params }) => {
  try {
    const receiptId = parseInt(params.id, 10);

    if (isNaN(receiptId) || receiptId <= 0) {
      throw error(400, "Invalid receipt ID");
    }

    // Get receipt metadata from database
    const receipt = await receiptService.getReceipt(receiptId);

    if (!receipt) {
      throw error(404, "Receipt not found");
    }

    // Get file path
    const filePath = receiptService.getReceiptFilePath(receipt);

    // Check if file exists
    if (!existsSync(filePath)) {
      console.error(`Receipt file not found: ${filePath}`);
      throw error(404, "Receipt file not found");
    }

    // Read file
    const fileBuffer = await readFile(filePath);

    // Determine content type
    const contentType = receipt.mimeType || "application/octet-stream";

    // Return file with appropriate headers
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": receipt.fileSize.toString(),
        "Content-Disposition": `inline; filename="${receipt.fileName}"`,
        "Cache-Control": "private, max-age=3600", // Cache for 1 hour
      },
    });
  } catch (err: any) {
    console.error("Receipt download error:", err);

    if (err.statusCode === 404 || err.status === 404) {
      throw error(404, err.message || "Receipt not found");
    }

    throw error(500, err.message || "Failed to download receipt");
  }
};
