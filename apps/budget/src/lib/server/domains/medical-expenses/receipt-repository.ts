import { BaseRepository } from "$lib/server/shared/database/base-repository";
import { db } from "$lib/server/shared/database";
import {
  expenseReceipts,
  type ExpenseReceipt,
  type ReceiptType,
} from "$lib/schema/expense-receipts";
import { eq, and, isNull, desc } from "drizzle-orm";

// Types for receipt operations
export interface CreateReceiptInput {
  medicalExpenseId: number;
  receiptType?: ReceiptType;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
  storageUrl?: string;
  description?: string;
}

export interface UpdateReceiptInput {
  receiptType?: ReceiptType;
  description?: string;
  extractedText?: string;
  extractedData?: string;
}

/**
 * Receipt repository with domain-specific operations
 */
export class ReceiptRepository extends BaseRepository<
  typeof expenseReceipts,
  ExpenseReceipt,
  CreateReceiptInput,
  UpdateReceiptInput
> {
  constructor() {
    super(db, expenseReceipts, "ExpenseReceipt");
  }

  /**
   * Find all receipts for a medical expense
   */
  async findByMedicalExpenseId(medicalExpenseId: number): Promise<ExpenseReceipt[]> {
    return await db
      .select()
      .from(expenseReceipts)
      .where(
        and(
          eq(expenseReceipts.medicalExpenseId, medicalExpenseId),
          isNull(expenseReceipts.deletedAt)
        )
      )
      .orderBy(desc(expenseReceipts.uploadedAt))
      .execute();
  }

  /**
   * Find receipts by type
   */
  async findByType(medicalExpenseId: number, receiptType: ReceiptType): Promise<ExpenseReceipt[]> {
    return await db
      .select()
      .from(expenseReceipts)
      .where(
        and(
          eq(expenseReceipts.medicalExpenseId, medicalExpenseId),
          eq(expenseReceipts.receiptType, receiptType),
          isNull(expenseReceipts.deletedAt)
        )
      )
      .orderBy(desc(expenseReceipts.uploadedAt))
      .execute();
  }

  /**
   * Count receipts for a medical expense
   */
  async countByMedicalExpenseId(medicalExpenseId: number): Promise<number> {
    const result = await db
      .select({ count: db.$count(expenseReceipts.id) })
      .from(expenseReceipts)
      .where(
        and(
          eq(expenseReceipts.medicalExpenseId, medicalExpenseId),
          isNull(expenseReceipts.deletedAt)
        )
      )
      .execute();

    return result[0]?.count || 0;
  }
}
