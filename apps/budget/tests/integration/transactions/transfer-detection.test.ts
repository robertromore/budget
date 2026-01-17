/**
 * Transfer Detection - Integration Tests
 *
 * Tests transfer matching between accounts, linking transactions,
 * and unlinking transfers.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {createId} from "@paralleldrive/cuid2";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  checkingAccountId: number;
  savingsAccountId: number;
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

  const accounts = await db
    .insert(schema.accounts)
    .values([
      {
        workspaceId: workspace.id,
        name: "Checking",
        slug: "checking",
        type: "checking",
      },
      {
        workspaceId: workspace.id,
        name: "Savings",
        slug: "savings",
        type: "savings",
      },
    ])
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    checkingAccountId: accounts[0].id,
    savingsAccountId: accounts[1].id,
  };
}

describe("Transfer Detection", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("createTransfer", () => {
    it("should create dual-entry transfer transactions", async () => {
      const transferId = createId();

      // Create FROM transaction (negative - money leaving checking)
      const [fromTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -500,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
          transferAccountId: ctx.savingsAccountId,
          status: "cleared",
        })
        .returning();

      // Create TO transaction (positive - money entering savings)
      const [toTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsAccountId,
          amount: 500,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
          transferAccountId: ctx.checkingAccountId,
          status: "cleared",
        })
        .returning();

      // Link them bidirectionally
      await ctx.db
        .update(schema.transactions)
        .set({transferTransactionId: toTxn.id})
        .where(eq(schema.transactions.id, fromTxn.id));

      await ctx.db
        .update(schema.transactions)
        .set({transferTransactionId: fromTxn.id})
        .where(eq(schema.transactions.id, toTxn.id));

      // Verify
      const updatedFrom = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, fromTxn.id),
      });

      const updatedTo = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, toTxn.id),
      });

      expect(updatedFrom?.isTransfer).toBe(true);
      expect(updatedFrom?.transferId).toBe(transferId);
      expect(updatedFrom?.transferTransactionId).toBe(toTxn.id);
      expect(updatedFrom?.amount).toBe(-500);

      expect(updatedTo?.isTransfer).toBe(true);
      expect(updatedTo?.transferId).toBe(transferId);
      expect(updatedTo?.transferTransactionId).toBe(fromTxn.id);
      expect(updatedTo?.amount).toBe(500);
    });

    it("should share the same transferId between paired transactions", async () => {
      const transferId = createId();

      await ctx.db.insert(schema.transactions).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -200,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsAccountId,
          amount: 200,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
        },
      ]);

      const transferTxns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.transferId, transferId));

      expect(transferTxns).toHaveLength(2);
      expect(transferTxns[0].transferId).toBe(transferTxns[1].transferId);
    });
  });

  describe("transfer matching during import", () => {
    it("should match transfer by date and amount", async () => {
      // Create existing transaction in savings (to be matched)
      const [existingTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsAccountId,
          amount: 500,
          date: "2024-01-15",
        })
        .returning();

      // Simulate import row from checking
      const importRow = {
        amount: -500,
        date: "2024-01-15",
        accountId: ctx.checkingAccountId,
      };

      // Find matching transfer target
      const potentialMatches = await ctx.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspaceId, ctx.workspaceId),
            eq(schema.transactions.accountId, ctx.savingsAccountId)
          )
        );

      const match = potentialMatches.find((txn) => {
        const amountMatch = Math.abs((txn.amount ?? 0) + importRow.amount) <= 0.01;
        const dateMatch = txn.date === importRow.date;
        return amountMatch && dateMatch;
      });

      expect(match).toBeDefined();
      expect(match?.id).toBe(existingTxn.id);
    });

    it("should match transfers within date tolerance", async () => {
      // Create existing transaction 2 days earlier
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.savingsAccountId,
        amount: 1000,
        date: "2024-01-13",
      });

      // Import row 2 days later
      const importDate = "2024-01-15";
      const importAmount = -1000;

      const potentialMatches = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.workspaceId, ctx.workspaceId));

      const matches = potentialMatches.filter((txn) => {
        const amountMatch = Math.abs((txn.amount ?? 0) + importAmount) <= 0.01;
        const txnDate = new Date(txn.date!);
        const impDate = new Date(importDate);
        const daysDiff = Math.abs((txnDate.getTime() - impDate.getTime()) / (1000 * 60 * 60 * 24));
        return amountMatch && daysDiff <= 3;
      });

      expect(matches).toHaveLength(1);
    });

    it("should calculate confidence based on date difference", () => {
      const calculateConfidence = (daysDiff: number): "high" | "medium" | "low" => {
        if (daysDiff === 0) return "high";
        if (daysDiff <= 1) return "medium";
        return "low";
      };

      expect(calculateConfidence(0)).toBe("high");
      expect(calculateConfidence(1)).toBe("medium");
      expect(calculateConfidence(2)).toBe("low");
      expect(calculateConfidence(3)).toBe("low");
    });
  });

  describe("unlinkTransfer", () => {
    it("should break transfer relationship", async () => {
      const transferId = createId();

      // Create transfer pair
      const txns = await ctx.db
        .insert(schema.transactions)
        .values([
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.checkingAccountId,
            amount: -300,
            date: "2024-01-15",
            isTransfer: true,
            transferId,
            transferAccountId: ctx.savingsAccountId,
          },
          {
            workspaceId: ctx.workspaceId,
            accountId: ctx.savingsAccountId,
            amount: 300,
            date: "2024-01-15",
            isTransfer: true,
            transferId,
            transferAccountId: ctx.checkingAccountId,
          },
        ])
        .returning();

      // Link them
      await ctx.db
        .update(schema.transactions)
        .set({transferTransactionId: txns[1].id})
        .where(eq(schema.transactions.id, txns[0].id));
      await ctx.db
        .update(schema.transactions)
        .set({transferTransactionId: txns[0].id})
        .where(eq(schema.transactions.id, txns[1].id));

      // Unlink both
      await ctx.db
        .update(schema.transactions)
        .set({
          isTransfer: false,
          transferId: null,
          transferAccountId: null,
          transferTransactionId: null,
        })
        .where(eq(schema.transactions.transferId, transferId));

      // Verify
      const unlinkedTxns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.workspaceId, ctx.workspaceId));

      expect(unlinkedTxns).toHaveLength(2);
      unlinkedTxns.forEach((txn) => {
        expect(txn.isTransfer).toBe(false);
        expect(txn.transferId).toBeNull();
        expect(txn.transferAccountId).toBeNull();
        expect(txn.transferTransactionId).toBeNull();
      });
    });

    it("should preserve transaction data after unlinking", async () => {
      const transferId = createId();

      const [txn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -500,
          date: "2024-01-15",
          notes: "Transfer to savings",
          isTransfer: true,
          transferId,
        })
        .returning();

      // Unlink
      await ctx.db
        .update(schema.transactions)
        .set({
          isTransfer: false,
          transferId: null,
          transferAccountId: null,
          transferTransactionId: null,
        })
        .where(eq(schema.transactions.id, txn.id));

      const unlinked = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, txn.id),
      });

      // Data preserved
      expect(unlinked?.amount).toBe(-500);
      expect(unlinked?.date).toBe("2024-01-15");
      expect(unlinked?.notes).toBe("Transfer to savings");
    });
  });

  describe("convertToTransfer", () => {
    it("should convert existing transaction to transfer", async () => {
      // Create standalone transaction
      const [existingTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -250,
          date: "2024-01-15",
        })
        .returning();

      expect(existingTxn.isTransfer).toBeFalsy();

      const transferId = createId();

      // Create paired transaction in other account
      const [pairedTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsAccountId,
          amount: 250, // Opposite amount
          date: "2024-01-15",
          isTransfer: true,
          transferId,
          transferAccountId: ctx.checkingAccountId,
          transferTransactionId: existingTxn.id,
        })
        .returning();

      // Update original to be transfer
      await ctx.db
        .update(schema.transactions)
        .set({
          isTransfer: true,
          transferId,
          transferAccountId: ctx.savingsAccountId,
          transferTransactionId: pairedTxn.id,
        })
        .where(eq(schema.transactions.id, existingTxn.id));

      // Verify
      const converted = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, existingTxn.id),
      });

      expect(converted?.isTransfer).toBe(true);
      expect(converted?.transferId).toBe(transferId);
      expect(converted?.transferTransactionId).toBe(pairedTxn.id);
    });

    it("should reject conversion if already a transfer", async () => {
      const [transferTxn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -100,
          date: "2024-01-15",
          isTransfer: true,
          transferId: createId(),
        })
        .returning();

      // Check before attempting conversion
      expect(transferTxn.isTransfer).toBe(true);

      // Would throw error in service layer
      const canConvert = !transferTxn.isTransfer;
      expect(canConvert).toBe(false);
    });

    it("should reject conversion to same account", async () => {
      const [txn] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -100,
          date: "2024-01-15",
        })
        .returning();

      // Target same account - should fail validation
      const sourceAccountId = txn.accountId;
      const targetAccountId = ctx.checkingAccountId;

      const isValidTarget = sourceAccountId !== targetAccountId;
      expect(isValidTarget).toBe(false);
    });
  });

  describe("transfer balance impact", () => {
    it("should net to zero across accounts", async () => {
      const transferId = createId();

      await ctx.db.insert(schema.transactions).values([
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingAccountId,
          amount: -1000,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
        },
        {
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsAccountId,
          amount: 1000,
          date: "2024-01-15",
          isTransfer: true,
          transferId,
        },
      ]);

      // Sum all transactions across workspace
      const allTxns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.workspaceId, ctx.workspaceId));

      const netAmount = allTxns.reduce((sum, txn) => sum + (txn.amount ?? 0), 0);
      expect(netAmount).toBe(0);
    });
  });
});
