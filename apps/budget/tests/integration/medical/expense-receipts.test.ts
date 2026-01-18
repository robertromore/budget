/**
 * Expense Receipts - Integration Tests
 *
 * Tests the receipt attachment system for medical expenses.
 * Supports images and PDFs with metadata tracking.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and, isNull} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  medicalExpenseId: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  // Create HSA account
  const [hsaAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "HSA Account",
      slug: "hsa-account",
      accountType: "hsa",
    })
    .returning();

  // Create checking account for transactions
  const [checkingAccount] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Checking Account",
      slug: "checking-account",
      accountType: "checking",
    })
    .returning();

  // Create a transaction (required for medical expense)
  const [transaction] = await db
    .insert(schema.transactions)
    .values({
      accountId: checkingAccount.id,
      date: "2024-01-15",
      amount: -250.0,
      description: "City Medical Center - Annual checkup",
    })
    .returning();

  // Create medical expense with all required fields
  const [medicalExpense] = await db
    .insert(schema.medicalExpenses)
    .values({
      transactionId: transaction.id,
      hsaAccountId: hsaAccount.id,
      expenseType: "annual_physical",
      amount: 250.0,
      outOfPocket: 250.0,
      serviceDate: "2024-01-15",
      taxYear: 2024,
      provider: "City Medical Center",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    medicalExpenseId: medicalExpense.id,
  };
}

describe("Expense Receipts", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("receipt creation", () => {
    it("should create a receipt with required fields", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "receipt-2024-01.pdf",
          fileSize: 125000,
          mimeType: "application/pdf",
          storagePath: "/uploads/receipts/2024/01/receipt-2024-01.pdf",
        })
        .returning();

      expect(receipt).toBeDefined();
      expect(receipt.medicalExpenseId).toBe(ctx.medicalExpenseId);
      expect(receipt.fileName).toBe("receipt-2024-01.pdf");
      expect(receipt.fileSize).toBe(125000);
      expect(receipt.mimeType).toBe("application/pdf");
    });

    it("should support all receipt types", async () => {
      const receiptTypes = ["receipt", "bill", "invoice", "eob", "statement", "prescription", "other"] as const;

      for (const receiptType of receiptTypes) {
        const [receipt] = await ctx.db
          .insert(schema.expenseReceipts)
          .values({
            medicalExpenseId: ctx.medicalExpenseId,
            receiptType,
            fileName: `${receiptType}-file.pdf`,
            fileSize: 50000,
            mimeType: "application/pdf",
            storagePath: `/uploads/${receiptType}.pdf`,
          })
          .returning();

        expect(receipt.receiptType).toBe(receiptType);
      }
    });

    it("should default receipt type to receipt", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "default-type.pdf",
          fileSize: 10000,
          mimeType: "application/pdf",
          storagePath: "/uploads/default.pdf",
        })
        .returning();

      expect(receipt.receiptType).toBe("receipt");
    });

    it("should support image mime types", async () => {
      const mimeTypes = ["image/jpeg", "image/png", "image/webp"];

      for (const mimeType of mimeTypes) {
        const ext = mimeType.split("/")[1];
        const [receipt] = await ctx.db
          .insert(schema.expenseReceipts)
          .values({
            medicalExpenseId: ctx.medicalExpenseId,
            fileName: `image.${ext}`,
            fileSize: 200000,
            mimeType,
            storagePath: `/uploads/image.${ext}`,
          })
          .returning();

        expect(receipt.mimeType).toBe(mimeType);
      }
    });

    it("should store optional description", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "with-description.pdf",
          fileSize: 50000,
          mimeType: "application/pdf",
          storagePath: "/uploads/with-desc.pdf",
          description: "Original receipt from doctor's office",
        })
        .returning();

      expect(receipt.description).toBe("Original receipt from doctor's office");
    });

    it("should generate CUID", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "cuid-test.pdf",
          fileSize: 10000,
          mimeType: "application/pdf",
          storagePath: "/uploads/cuid.pdf",
        })
        .returning();

      expect(receipt.cuid).toBeDefined();
      expect(receipt.cuid?.length).toBeGreaterThan(0);
    });
  });

  describe("receipt queries", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.expenseReceipts).values([
        {medicalExpenseId: ctx.medicalExpenseId, receiptType: "receipt", fileName: "receipt1.pdf", fileSize: 50000, mimeType: "application/pdf", storagePath: "/r1.pdf"},
        {medicalExpenseId: ctx.medicalExpenseId, receiptType: "eob", fileName: "eob1.pdf", fileSize: 75000, mimeType: "application/pdf", storagePath: "/e1.pdf"},
        {medicalExpenseId: ctx.medicalExpenseId, receiptType: "bill", fileName: "bill1.jpg", fileSize: 100000, mimeType: "image/jpeg", storagePath: "/b1.jpg"},
      ]);
    });

    it("should find all receipts for expense", async () => {
      const receipts = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(
          and(
            eq(schema.expenseReceipts.medicalExpenseId, ctx.medicalExpenseId),
            isNull(schema.expenseReceipts.deletedAt)
          )
        );

      expect(receipts).toHaveLength(3);
    });

    it("should filter by receipt type", async () => {
      const eobReceipts = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(
          and(
            eq(schema.expenseReceipts.medicalExpenseId, ctx.medicalExpenseId),
            eq(schema.expenseReceipts.receiptType, "eob"),
            isNull(schema.expenseReceipts.deletedAt)
          )
        );

      expect(eobReceipts).toHaveLength(1);
      expect(eobReceipts[0].fileName).toBe("eob1.pdf");
    });
  });

  describe("receipt updates", () => {
    it("should update description", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "update-test.pdf",
          fileSize: 25000,
          mimeType: "application/pdf",
          storagePath: "/update.pdf",
        })
        .returning();

      await ctx.db
        .update(schema.expenseReceipts)
        .set({description: "Updated description"})
        .where(eq(schema.expenseReceipts.id, receipt.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(eq(schema.expenseReceipts.id, receipt.id));

      expect(updated.description).toBe("Updated description");
    });

    it("should store extracted text from OCR", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "ocr-test.jpg",
          fileSize: 500000,
          mimeType: "image/jpeg",
          storagePath: "/ocr.jpg",
        })
        .returning();

      const extractedText = "City Medical Center\nDate: 01/15/2024\nAmount: $250.00";
      await ctx.db
        .update(schema.expenseReceipts)
        .set({extractedText})
        .where(eq(schema.expenseReceipts.id, receipt.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(eq(schema.expenseReceipts.id, receipt.id));

      expect(updated.extractedText).toBe(extractedText);
    });
  });

  describe("soft delete", () => {
    it("should soft delete receipt", async () => {
      const [receipt] = await ctx.db
        .insert(schema.expenseReceipts)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          fileName: "delete-test.pdf",
          fileSize: 10000,
          mimeType: "application/pdf",
          storagePath: "/delete.pdf",
        })
        .returning();

      await ctx.db
        .update(schema.expenseReceipts)
        .set({deletedAt: new Date().toISOString()})
        .where(eq(schema.expenseReceipts.id, receipt.id));

      // Should not find in active query
      const activeReceipts = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(
          and(
            eq(schema.expenseReceipts.id, receipt.id),
            isNull(schema.expenseReceipts.deletedAt)
          )
        );

      expect(activeReceipts).toHaveLength(0);
    });
  });

  describe("multiple expenses", () => {
    it("should isolate receipts between expenses", async () => {
      // Get the HSA account and a checking account for creating another transaction
      const accounts = await ctx.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.workspaceId, ctx.workspaceId));

      const hsaAccount = accounts.find((a) => a.accountType === "hsa")!;
      const checkingAccount = accounts.find((a) => a.accountType === "checking")!;

      // Create a second transaction
      const [transaction2] = await ctx.db
        .insert(schema.transactions)
        .values({
          accountId: checkingAccount.id,
          date: "2024-02-15",
          amount: -150.0,
          description: "Dental Clinic - Dental cleaning",
        })
        .returning();

      // Create second medical expense with correct schema fields
      const [expense2] = await ctx.db
        .insert(schema.medicalExpenses)
        .values({
          transactionId: transaction2.id,
          hsaAccountId: hsaAccount.id,
          expenseType: "dental_exam",
          amount: 150.0,
          outOfPocket: 150.0,
          serviceDate: "2024-02-15",
          taxYear: 2024,
          provider: "Dental Clinic",
        })
        .returning();

      // Add receipts to both expenses
      await ctx.db.insert(schema.expenseReceipts).values([
        {medicalExpenseId: ctx.medicalExpenseId, fileName: "exp1.pdf", fileSize: 10000, mimeType: "application/pdf", storagePath: "/e1.pdf"},
        {medicalExpenseId: expense2.id, fileName: "exp2.pdf", fileSize: 20000, mimeType: "application/pdf", storagePath: "/e2.pdf"},
      ]);

      const exp1Receipts = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(eq(schema.expenseReceipts.medicalExpenseId, ctx.medicalExpenseId));

      const exp2Receipts = await ctx.db
        .select()
        .from(schema.expenseReceipts)
        .where(eq(schema.expenseReceipts.medicalExpenseId, expense2.id));

      expect(exp1Receipts).toHaveLength(1);
      expect(exp2Receipts).toHaveLength(1);
    });
  });

  describe("relationships", () => {
    it("should join receipt with medical expense", async () => {
      await ctx.db.insert(schema.expenseReceipts).values({
        medicalExpenseId: ctx.medicalExpenseId,
        receiptType: "eob",
        fileName: "join-test.pdf",
        fileSize: 50000,
        mimeType: "application/pdf",
        storagePath: "/join.pdf",
      });

      const results = await ctx.db
        .select({
          receipt: schema.expenseReceipts,
          provider: schema.medicalExpenses.provider,
          amount: schema.medicalExpenses.amount,
        })
        .from(schema.expenseReceipts)
        .innerJoin(schema.medicalExpenses, eq(schema.expenseReceipts.medicalExpenseId, schema.medicalExpenses.id))
        .where(eq(schema.expenseReceipts.medicalExpenseId, ctx.medicalExpenseId));

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe("City Medical Center");
      expect(results[0].amount).toBe(250.0);
    });
  });
});
