import { accounts } from "$core/schema/accounts";
import { expenseReceipts } from "$core/schema/expense-receipts";
import { medicalExpenses } from "$core/schema/medical-expenses";
import { workspaceMembers } from "$core/schema/workspace-members";
import { auth } from "$core/server/auth";
import { db } from "$core/server/db";
import { serviceFactory } from "$core/server/shared/container/service-factory";
import { lazyService } from "$core/server/shared/container/lazy-service";
import { error } from "@sveltejs/kit";
import { and, eq, isNull } from "drizzle-orm";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import type { RequestHandler } from "./$types";

const receiptService = lazyService(() => serviceFactory.getReceiptService());

export const GET: RequestHandler = async ({ params, request }) => {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });
    if (!session?.user?.id) {
      throw error(401, "Authentication required");
    }

    const userId = session.user.id;

    const receiptId = parseInt(params.id, 10);

    if (isNaN(receiptId) || receiptId <= 0) {
      throw error(400, "Invalid receipt ID");
    }

    // Resolve the owning workspace via the receipt → medical expense → account
    // chain BEFORE calling the service (the service requires workspaceId), then
    // verify the caller is a member.
    const [owner] = await db
      .select({ workspaceId: accounts.workspaceId })
      .from(expenseReceipts)
      .innerJoin(medicalExpenses, eq(expenseReceipts.medicalExpenseId, medicalExpenses.id))
      .innerJoin(accounts, eq(medicalExpenses.hsaAccountId, accounts.id))
      .where(
        and(
          eq(expenseReceipts.id, receiptId),
          isNull(expenseReceipts.deletedAt),
          isNull(medicalExpenses.deletedAt),
          isNull(accounts.deletedAt)
        )
      )
      .limit(1);
    if (!owner) {
      throw error(404, "Receipt not found");
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
      throw error(403, "You do not have access to this receipt");
    }

    // Load receipt through the workspace-scoped service path (defense in depth).
    const receipt = await receiptService.getReceipt(receiptId, owner.workspaceId);

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
    return new Response(new Uint8Array(fileBuffer), {
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

    if (err.status) {
      throw err;
    }

    throw error(500, err.message || "Failed to download receipt");
  }
};
