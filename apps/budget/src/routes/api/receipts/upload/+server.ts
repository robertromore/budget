import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { ReceiptService } from "$lib/server/domains/medical-expenses";
import { ALLOWED_RECEIPT_MIMES, MAX_RECEIPT_SIZE } from "$lib/schema/expense-receipts";

const receiptService = new ReceiptService();

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Parse multipart form data
    const formData = await request.formData();

    // Extract fields
    const medicalExpenseId = formData.get("medicalExpenseId");
    const receiptType = formData.get("receiptType");
    const description = formData.get("description");
    const file = formData.get("file");

    // Validate required fields
    if (!medicalExpenseId) {
      throw error(400, "Medical expense ID is required");
    }

    if (!file || !(file instanceof File)) {
      throw error(400, "File is required");
    }

    // Parse medical expense ID
    const expenseId = parseInt(medicalExpenseId.toString(), 10);
    if (isNaN(expenseId) || expenseId <= 0) {
      throw error(400, "Invalid medical expense ID");
    }

    // Validate file type
    if (!ALLOWED_RECEIPT_MIMES.includes(file.type as any)) {
      throw error(400, "File type must be JPEG, PNG, WebP, or PDF");
    }

    // Validate file size
    if (file.size > MAX_RECEIPT_SIZE) {
      throw error(400, `File size must be less than ${MAX_RECEIPT_SIZE / 1024 / 1024}MB`);
    }

    // Upload receipt
    const receipt = await receiptService.uploadReceipt({
      medicalExpenseId: expenseId,
      receiptType: receiptType?.toString() as any,
      file,
      description: description?.toString(),
    });

    return json(
      {
        success: true,
        receipt,
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("Receipt upload error:", err);

    // Handle different error types
    if (err.statusCode === 404) {
      throw error(404, err.message || "Medical expense not found");
    }

    if (err.statusCode === 400 || err.name === "ValidationError") {
      throw error(400, err.message || "Invalid request");
    }

    // Generic error
    throw error(500, err.message || "Failed to upload receipt");
  }
};
