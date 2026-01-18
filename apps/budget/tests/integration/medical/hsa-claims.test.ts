/**
 * HSA Claims - Integration Tests
 *
 * Tests the HSA claim tracking system for medical expenses.
 * Supports full claim lifecycle from submission to payment.
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
      amount: -350.0,
      description: "City Medical Center - Lab work",
    })
    .returning();

  // Create medical expense with all required fields
  const [medicalExpense] = await db
    .insert(schema.medicalExpenses)
    .values({
      transactionId: transaction.id,
      hsaAccountId: hsaAccount.id,
      expenseType: "lab_tests",
      amount: 350.0,
      outOfPocket: 350.0,
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

describe("HSA Claims", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("claim creation", () => {
    it("should create a claim with required fields", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 350.0,
          status: "not_submitted",
        })
        .returning();

      expect(claim).toBeDefined();
      expect(claim.medicalExpenseId).toBe(ctx.medicalExpenseId);
      expect(claim.claimedAmount).toBe(350.0);
      expect(claim.status).toBe("not_submitted");
    });

    it("should support all claim statuses", async () => {
      const statuses = [
        "not_submitted",
        "pending_submission",
        "submitted",
        "in_review",
        "approved",
        "partially_approved",
        "denied",
        "resubmission_required",
        "paid",
        "withdrawn",
      ] as const;

      for (const status of statuses) {
        const [claim] = await ctx.db
          .insert(schema.hsaClaims)
          .values({
            medicalExpenseId: ctx.medicalExpenseId,
            claimedAmount: 100.0,
            status,
          })
          .returning();

        expect(claim.status).toBe(status);

        // Clean up
        await ctx.db.delete(schema.hsaClaims).where(eq(schema.hsaClaims.id, claim.id));
      }
    });

    it("should generate CUID", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 200.0,
          status: "not_submitted",
        })
        .returning();

      expect(claim.cuid).toBeDefined();
      expect(claim.cuid?.length).toBeGreaterThan(0);
    });

    it("should track claim number", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 350.0,
          status: "submitted",
          claimNumber: "HSA-2024-001234",
        })
        .returning();

      expect(claim.claimNumber).toBe("HSA-2024-001234");
    });

    it("should track administrator name", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 350.0,
          status: "submitted",
          administratorName: "Fidelity HSA",
        })
        .returning();

      expect(claim.administratorName).toBe("Fidelity HSA");
    });
  });

  describe("claim lifecycle", () => {
    it("should progress through submission lifecycle", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 350.0,
          status: "not_submitted",
        })
        .returning();

      // Submit claim
      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "submitted",
          submittedDate: "2024-01-20",
          claimNumber: "CLM-2024-0001",
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      // Review
      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "in_review",
          reviewDate: "2024-01-25",
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      // Approve
      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "approved",
          approvalDate: "2024-01-28",
          approvedAmount: 350.0,
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      // Pay
      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "paid",
          paymentDate: "2024-02-01",
          paidAmount: 350.0,
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      const [final] = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(eq(schema.hsaClaims.id, claim.id));

      expect(final.status).toBe("paid");
      expect(final.submittedDate).toBe("2024-01-20");
      expect(final.approvalDate).toBe("2024-01-28");
      expect(final.paymentDate).toBe("2024-02-01");
      expect(final.paidAmount).toBe(350.0);
    });

    it("should handle partial approval", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 500.0,
          status: "submitted",
        })
        .returning();

      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "partially_approved",
          approvedAmount: 350.0,
          deniedAmount: 150.0,
          denialReason: "Non-covered service included",
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(eq(schema.hsaClaims.id, claim.id));

      expect(updated.status).toBe("partially_approved");
      expect(updated.approvedAmount).toBe(350.0);
      expect(updated.deniedAmount).toBe(150.0);
      expect(updated.denialReason).toBe("Non-covered service included");
    });

    it("should handle denial", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 200.0,
          status: "submitted",
        })
        .returning();

      await ctx.db
        .update(schema.hsaClaims)
        .set({
          status: "denied",
          deniedAmount: 200.0,
          denialReason: "Expense not HSA eligible",
          denialCode: "NE-001",
        })
        .where(eq(schema.hsaClaims.id, claim.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(eq(schema.hsaClaims.id, claim.id));

      expect(updated.status).toBe("denied");
      expect(updated.deniedAmount).toBe(200.0);
      expect(updated.denialCode).toBe("NE-001");
    });
  });

  describe("claim notes", () => {
    it("should store public notes", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 250.0,
          status: "submitted",
          notes: "Submitted via online portal",
        })
        .returning();

      expect(claim.notes).toBe("Submitted via online portal");
    });

    it("should store internal notes", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 250.0,
          status: "in_review",
          internalNotes: "Need to follow up if not resolved by Friday",
        })
        .returning();

      expect(claim.internalNotes).toBe("Need to follow up if not resolved by Friday");
    });
  });

  describe("claim queries", () => {
    beforeEach(async () => {
      // Create additional medical expenses for testing
      const accounts = await ctx.db
        .select()
        .from(schema.accounts)
        .where(eq(schema.accounts.workspaceId, ctx.workspaceId));

      const hsaAccount = accounts.find((a) => a.accountType === "hsa")!;
      const checkingAccount = accounts.find((a) => a.accountType === "checking")!;

      // Create transactions for the additional expenses
      const transactions = await ctx.db
        .insert(schema.transactions)
        .values([
          {accountId: checkingAccount.id, date: "2024-02-01", amount: -50.0, description: "Pharmacy"},
          {accountId: checkingAccount.id, date: "2024-03-01", amount: -200.0, description: "Eye Doctor"},
        ])
        .returning();

      const expenses = await ctx.db
        .insert(schema.medicalExpenses)
        .values([
          {transactionId: transactions[0].id, hsaAccountId: hsaAccount.id, expenseType: "prescription", amount: 50.0, outOfPocket: 50.0, serviceDate: "2024-02-01", taxYear: 2024, provider: "Pharmacy"},
          {transactionId: transactions[1].id, hsaAccountId: hsaAccount.id, expenseType: "eye_exam", amount: 200.0, outOfPocket: 200.0, serviceDate: "2024-03-01", taxYear: 2024, provider: "Eye Doctor"},
        ])
        .returning();

      // Create claims with different statuses
      await ctx.db.insert(schema.hsaClaims).values([
        {medicalExpenseId: ctx.medicalExpenseId, claimedAmount: 350.0, status: "paid", paidAmount: 350.0},
        {medicalExpenseId: expenses[0].id, claimedAmount: 50.0, status: "submitted"},
        {medicalExpenseId: expenses[1].id, claimedAmount: 200.0, status: "not_submitted"},
      ]);
    });

    it("should filter by status", async () => {
      const submittedClaims = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(eq(schema.hsaClaims.status, "submitted"));

      expect(submittedClaims).toHaveLength(1);
      expect(submittedClaims[0].claimedAmount).toBe(50.0);
    });

    it("should find all paid claims", async () => {
      const paidClaims = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(eq(schema.hsaClaims.status, "paid"));

      expect(paidClaims).toHaveLength(1);
      expect(paidClaims[0].paidAmount).toBe(350.0);
    });

    it("should find pending claims", async () => {
      const pendingStatuses = ["not_submitted", "pending_submission", "submitted", "in_review"];
      const pendingClaims = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(isNull(schema.hsaClaims.deletedAt));

      const pending = pendingClaims.filter((c) => pendingStatuses.includes(c.status));
      expect(pending.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("soft delete", () => {
    it("should soft delete claim", async () => {
      const [claim] = await ctx.db
        .insert(schema.hsaClaims)
        .values({
          medicalExpenseId: ctx.medicalExpenseId,
          claimedAmount: 100.0,
          status: "not_submitted",
        })
        .returning();

      await ctx.db
        .update(schema.hsaClaims)
        .set({deletedAt: new Date().toISOString()})
        .where(eq(schema.hsaClaims.id, claim.id));

      const activeClaims = await ctx.db
        .select()
        .from(schema.hsaClaims)
        .where(
          and(
            eq(schema.hsaClaims.id, claim.id),
            isNull(schema.hsaClaims.deletedAt)
          )
        );

      expect(activeClaims).toHaveLength(0);
    });
  });

  describe("relationships", () => {
    it("should join claim with medical expense", async () => {
      await ctx.db.insert(schema.hsaClaims).values({
        medicalExpenseId: ctx.medicalExpenseId,
        claimedAmount: 350.0,
        status: "approved",
        approvedAmount: 350.0,
      });

      const results = await ctx.db
        .select({
          claim: schema.hsaClaims,
          provider: schema.medicalExpenses.provider,
          expenseType: schema.medicalExpenses.expenseType,
        })
        .from(schema.hsaClaims)
        .innerJoin(schema.medicalExpenses, eq(schema.hsaClaims.medicalExpenseId, schema.medicalExpenses.id))
        .where(eq(schema.hsaClaims.medicalExpenseId, ctx.medicalExpenseId));

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe("City Medical Center");
      expect(results[0].expenseType).toBe("lab_tests");
    });
  });
});
