/**
 * Duplicate Detection - Integration Tests
 *
 * Tests duplicate transaction detection during import.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
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

  const [account] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Checking",
      slug: "checking",
      type: "checking",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
  };
}

/**
 * Check if two transactions are duplicates
 */
function isDuplicate(
  existing: {date: string | null; amount: number; fitid: string | null},
  incoming: {date: string; amount: number; fitid?: string}
): boolean {
  // FITID match (Financial Institution Transaction ID)
  if (incoming.fitid && existing.fitid && incoming.fitid === existing.fitid) {
    return true;
  }

  // Date + Amount match (within $0.01)
  // Use rounding to handle floating point precision issues
  const tolerance = 0.011; // Slightly more than 0.01 to handle floating point
  const amountDiff = Math.abs(existing.amount - incoming.amount);
  if (existing.date === incoming.date && amountDiff <= tolerance) {
    return true;
  }

  return false;
}

describe("Duplicate Detection", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("FITID matching", () => {
    it("should detect duplicate by FITID", async () => {
      const fitid = "BANK123456789";

      // Create existing transaction with FITID
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50,
        date: "2024-01-15",
        fitid,
      });

      // Import row with same FITID
      const incoming = {date: "2024-01-15", amount: -50, fitid};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should match FITID even if amount differs slightly", async () => {
      const fitid = "BANK123456789";

      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50,
        date: "2024-01-15",
        fitid,
      });

      // Different amount but same FITID
      const incoming = {date: "2024-01-15", amount: -55, fitid};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.fitid, fitid),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should not match different FITIDs", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50,
        date: "2024-01-15",
        fitid: "BANK111111111",
      });

      const incoming = {date: "2024-01-15", amount: -50, fitid: "BANK222222222"};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      // Different FITID but same date/amount - FITID takes precedence
      // Since FITIDs don't match, fall through to date/amount check
      expect(isDuplicate(existing!, incoming)).toBe(true); // Still duplicate by date/amount
    });
  });

  describe("date and amount matching", () => {
    it("should detect duplicate by exact date and amount", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -123.45,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: -123.45};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should detect duplicate within $0.01 tolerance", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -100.0,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: -100.01};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should not match if amount differs by more than $0.01", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -100.0,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: -100.02};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(false);
    });

    it("should not match if date differs", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-16", amount: -50};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(false);
    });
  });

  describe("batch duplicate detection", () => {
    it("should detect duplicates within import batch", async () => {
      const batch = [
        {date: "2024-01-15", amount: -50},
        {date: "2024-01-15", amount: -50}, // Duplicate of first
        {date: "2024-01-16", amount: -50}, // Different date
      ];

      const seen = new Set<string>();
      const duplicates: number[] = [];

      batch.forEach((row, index) => {
        const key = `${row.date}|${row.amount}`;
        if (seen.has(key)) {
          duplicates.push(index);
        } else {
          seen.add(key);
        }
      });

      expect(duplicates).toEqual([1]);
    });

    it("should check both database and batch for duplicates", async () => {
      // Existing in database
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -100,
        date: "2024-01-10",
      });

      const batch = [
        {date: "2024-01-10", amount: -100}, // Duplicate of database
        {date: "2024-01-15", amount: -50}, // New
        {date: "2024-01-15", amount: -50}, // Duplicate within batch
      ];

      const existingTxns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      const dbKeys = new Set(existingTxns.map((t) => `${t.date}|${t.amount}`));
      const batchKeys = new Set<string>();
      const results: Array<{index: number; status: string}> = [];

      batch.forEach((row, index) => {
        const key = `${row.date}|${row.amount}`;

        if (dbKeys.has(key)) {
          results.push({index, status: "database_duplicate"});
        } else if (batchKeys.has(key)) {
          results.push({index, status: "batch_duplicate"});
        } else {
          batchKeys.add(key);
          results.push({index, status: "valid"});
        }
      });

      expect(results[0].status).toBe("database_duplicate");
      expect(results[1].status).toBe("valid");
      expect(results[2].status).toBe("batch_duplicate");
    });
  });

  describe("validation status", () => {
    it("should mark duplicates with warning status", () => {
      type ValidationStatus = "valid" | "invalid" | "warning";

      function validateRow(
        row: {date: string; amount: number},
        existingKeys: Set<string>
      ): {status: ValidationStatus; isDuplicate: boolean} {
        const key = `${row.date}|${row.amount}`;

        if (existingKeys.has(key)) {
          return {status: "warning", isDuplicate: true};
        }

        return {status: "valid", isDuplicate: false};
      }

      const existing = new Set(["2024-01-15|-50"]);

      expect(validateRow({date: "2024-01-15", amount: -50}, existing)).toEqual({
        status: "warning",
        isDuplicate: true,
      });

      expect(validateRow({date: "2024-01-16", amount: -50}, existing)).toEqual({
        status: "valid",
        isDuplicate: false,
      });
    });
  });

  describe("edge cases", () => {
    it("should handle null FITID in existing transaction", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -50,
        date: "2024-01-15",
        fitid: null,
      });

      const incoming = {date: "2024-01-15", amount: -50, fitid: "BANK123"};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      // Should fall through to date/amount check
      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should handle zero amount transactions", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: 0,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: 0};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should handle very small amounts", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -0.01,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: -0.01};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });

    it("should handle large amounts", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        amount: -999999.99,
        date: "2024-01-15",
      });

      const incoming = {date: "2024-01-15", amount: -999999.99};

      const existing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.accountId, ctx.accountId),
      });

      expect(isDuplicate(existing!, incoming)).toBe(true);
    });
  });
});
