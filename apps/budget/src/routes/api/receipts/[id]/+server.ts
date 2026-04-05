import { accounts } from "$core/schema/accounts";
import { medicalExpenses } from "$core/schema/medical-expenses";
import { workspaceMembers } from "$core/schema/workspace-members";
import { auth } from "$core/server/auth";
import { db } from "$core/server/db";
import { serviceFactory } from "$lib/server/shared/container/service-factory";
import { lazyService } from "$lib/server/shared/container/lazy-service";
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

    // Get receipt metadata from database
    const receipt = await receiptService.getReceipt(receiptId);

    if (!receipt) {
      throw error(404, "Receipt not found");
    }

    const [expense] = await db
      .select({ workspaceId: accounts.workspaceId })
      .from(medicalExpenses)
      .innerJoin(accounts, eq(medicalExpenses.hsaAccountId, accounts.id))
      .where(
        and(
          eq(medicalExpenses.id, receipt.medicalExpenseId),
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
      throw error(403, "You do not have access to this receipt");
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
