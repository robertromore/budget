import { accounts } from "$lib/schema/accounts";
import { ALLOWED_RECEIPT_MIMES, MAX_RECEIPT_SIZE } from "$lib/schema/expense-receipts";
import { medicalExpenses } from "$lib/schema/medical-expenses";
import { workspaceMembers } from "$lib/schema/workspace-members";
import { auth } from "$lib/server/auth";
import { db } from "$lib/server/db";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { lazyService } from "$lib/server/shared/container/lazy-service";
import { formatFileSize } from "$lib/utils/formatters";
import { error, json } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import type { RequestHandler } from "./$types";

const receiptService = lazyService(() => serviceFactory.getReceiptService());

export const POST: RequestHandler = async ({ request }) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      throw error(401, "Authentication required");
    }

    const userId = session.user.id;

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

    const [expense] = await db
      .select({ workspaceId: accounts.workspaceId })
      .from(medicalExpenses)
      .innerJoin(accounts, eq(medicalExpenses.hsaAccountId, accounts.id))
      .where(
        and(
          eq(medicalExpenses.id, expenseId),
          isNull(medicalExpenses.deletedAt),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);
    if (!expense) {
      throw error(404, "Medical expense not found");
    }

    const [membership] = await db
      .select({ id: workspaceMembers.id })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.userId, userId),
          eq(workspaceMembers.workspaceId, expense.workspaceId)
        )
      )
      .limit(1);
    if (!membership) {
      throw error(403, "You do not have access to this medical expense");
    }

    // Validate file type
    if (!ALLOWED_RECEIPT_MIMES.includes(file.type as any)) {
      throw error(400, "File type must be JPEG, PNG, WebP, or PDF");
    }

    // Validate file size
    if (file.size > MAX_RECEIPT_SIZE) {
      throw error(400, `File size must be less than ${formatFileSize(MAX_RECEIPT_SIZE)}`);
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

    if (err.status) {
      throw err;
    }

    // Generic error
    throw error(500, err.message || "Failed to upload receipt");
  }
};
