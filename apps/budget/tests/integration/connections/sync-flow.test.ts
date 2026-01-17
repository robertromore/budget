/**
 * Connection Sync Flow - Integration Tests
 *
 * Tests bank connection sync flow including transaction
 * fetching, deduplication, and status updates.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  workspaceId: number;
  accountId: number;
  connectionId: number;
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

  const [connection] = await db
    .insert(schema.accountConnections)
    .values({
      workspaceId: workspace.id,
      accountId: account.id,
      provider: "simplefin",
      externalAccountId: "sf_account_12345",
      institutionName: "Test Bank",
      encryptedCredentials: "encrypted_test_credentials",
      syncStatus: "active",
      lastSyncAt: null,
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    accountId: account.id,
    connectionId: connection.id,
  };
}

/**
 * Simulated external transaction from provider
 */
interface ExternalTransaction {
  id: string; // FITID
  date: string;
  amount: number;
  description: string;
  pending: boolean;
}

/**
 * Check if transaction is duplicate
 */
function isDuplicate(
  existing: Array<{fitid: string | null; date: string; amount: number}>,
  incoming: ExternalTransaction
): boolean {
  // Check by FITID first
  if (incoming.id && existing.some((e) => e.fitid === incoming.id)) {
    return true;
  }

  // Check by date + amount (within $0.01)
  const tolerance = 0.01;
  return existing.some(
    (e) =>
      e.date === incoming.date && Math.abs(e.amount - incoming.amount) <= tolerance
  );
}

describe("Connection Sync Flow", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("connection status", () => {
    it("should create connection with active status", async () => {
      const connection = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, ctx.connectionId),
      });

      expect(connection?.syncStatus).toBe("active");
      expect(connection?.provider).toBe("simplefin");
    });

    it("should update lastSyncAt after successful sync", async () => {
      const now = new Date().toISOString();

      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "active",
          lastSyncAt: now,
          syncError: null,
        })
        .where(eq(schema.accountConnections.id, ctx.connectionId));

      const connection = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, ctx.connectionId),
      });

      expect(connection?.lastSyncAt).toBe(now);
      expect(connection?.syncError).toBeNull();
    });

    it("should record error on sync failure", async () => {
      const errorMessage = "Failed to authenticate with provider";

      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "error",
          syncError: errorMessage,
        })
        .where(eq(schema.accountConnections.id, ctx.connectionId));

      const connection = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, ctx.connectionId),
      });

      expect(connection?.syncStatus).toBe("error");
      expect(connection?.syncError).toBe(errorMessage);
    });
  });

  describe("transaction import", () => {
    it("should import new transactions from provider", async () => {
      const externalTransactions: ExternalTransaction[] = [
        {id: "fitid_001", date: "2024-01-15", amount: -50.00, description: "WALMART", pending: false},
        {id: "fitid_002", date: "2024-01-16", amount: -25.00, description: "STARBUCKS", pending: false},
      ];

      // Simulate import
      for (const ext of externalTransactions) {
        await ctx.db.insert(schema.transactions).values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          fitid: ext.id,
          date: ext.date,
          amount: ext.amount,
          originalPayeeName: ext.description,
          status: ext.pending ? "pending" : "cleared",
          importedFrom: "simplefin",
          importedAt: new Date().toISOString(),
        });
      }

      const imported = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(imported).toHaveLength(2);
      expect(imported[0].fitid).toBe("fitid_001");
    });

    it("should skip duplicate transactions by FITID", async () => {
      // Create existing transaction
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        fitid: "fitid_existing",
        date: "2024-01-10",
        amount: -100.00,
        status: "cleared",
      });

      const existing = await ctx.db
        .select({fitid: schema.transactions.fitid, date: schema.transactions.date, amount: schema.transactions.amount})
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      // Incoming with same FITID
      const incoming: ExternalTransaction = {
        id: "fitid_existing",
        date: "2024-01-10",
        amount: -100.00,
        description: "SAME TRANSACTION",
        pending: false,
      };

      expect(isDuplicate(existing, incoming)).toBe(true);
    });

    it("should detect duplicates by date and amount", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        date: "2024-01-15",
        amount: -50.00,
        status: "cleared",
      });

      const existing = await ctx.db
        .select({fitid: schema.transactions.fitid, date: schema.transactions.date, amount: schema.transactions.amount})
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      const incoming: ExternalTransaction = {
        id: "fitid_new",
        date: "2024-01-15",
        amount: -50.00, // Same date and amount
        description: "POSSIBLE DUPE",
        pending: false,
      };

      expect(isDuplicate(existing, incoming)).toBe(true);
    });

    it("should not flag different amounts as duplicates", async () => {
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        date: "2024-01-15",
        amount: -50.00,
        status: "cleared",
      });

      const existing = await ctx.db
        .select({fitid: schema.transactions.fitid, date: schema.transactions.date, amount: schema.transactions.amount})
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      const incoming: ExternalTransaction = {
        id: "fitid_new",
        date: "2024-01-15",
        amount: -75.00, // Different amount
        description: "DIFFERENT",
        pending: false,
      };

      expect(isDuplicate(existing, incoming)).toBe(false);
    });
  });

  describe("pending transaction handling", () => {
    it("should import pending transactions", async () => {
      const [pending] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          fitid: "pending_001",
          date: "2024-01-15",
          amount: -50.00,
          status: "pending",
          importedFrom: "simplefin",
        })
        .returning();

      expect(pending.status).toBe("pending");
    });

    it("should update pending to cleared when transaction clears", async () => {
      // Create pending transaction
      const [pending] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          fitid: "pending_001",
          date: "2024-01-15",
          amount: -50.00,
          status: "pending",
        })
        .returning();

      // Simulate clearing
      await ctx.db
        .update(schema.transactions)
        .set({status: "cleared"})
        .where(eq(schema.transactions.id, pending.id));

      const cleared = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, pending.id),
      });

      expect(cleared?.status).toBe("cleared");
    });

    it("should remove pending that were canceled", async () => {
      const [pending] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          fitid: "pending_canceled",
          date: "2024-01-15",
          amount: -50.00,
          status: "pending",
        })
        .returning();

      // Simulate removal (pending wasn't in next sync, so it was canceled)
      await ctx.db.delete(schema.transactions).where(eq(schema.transactions.id, pending.id));

      const removed = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, pending.id),
      });

      expect(removed).toBeUndefined();
    });
  });

  describe("balance tracking", () => {
    it("should update account balance after sync", async () => {
      // Import transactions
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-01", amount: 1000.00, status: "cleared"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-15", amount: -50.00, status: "cleared"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-16", amount: -25.00, status: "cleared"},
      ]);

      // Calculate balance
      const transactions = await ctx.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.accountId, ctx.accountId),
            eq(schema.transactions.status, "cleared")
          )
        );

      const balance = transactions.reduce((sum, t) => sum + t.amount, 0);
      expect(balance).toBe(925.00); // 1000 - 50 - 25
    });
  });

  describe("incremental sync", () => {
    it("should fetch only new transactions since date", () => {
      const cursor = "2024-01-15";
      const allTransactions = [
        {date: "2024-01-10", amount: -100},
        {date: "2024-01-12", amount: -50},
        {date: "2024-01-15", amount: -75}, // At cursor
        {date: "2024-01-18", amount: -25}, // After cursor
        {date: "2024-01-20", amount: -60}, // After cursor
      ];

      const newTransactions = allTransactions.filter((t) => t.date > cursor);
      expect(newTransactions).toHaveLength(2);
    });
  });

  describe("multiple accounts", () => {
    it("should handle multiple connections for same workspace", async () => {
      // Create second account with connection
      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          slug: "savings",
          type: "savings",
        })
        .returning();

      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: account2.id,
        provider: "simplefin",
        externalAccountId: "sf_savings_67890",
        institutionName: "Test Bank",
        encryptedCredentials: "encrypted_test_credentials",
        syncStatus: "active",
      });

      const connections = await ctx.db
        .select()
        .from(schema.accountConnections)
        .where(eq(schema.accountConnections.workspaceId, ctx.workspaceId));

      expect(connections).toHaveLength(2);
    });

    it("should sync accounts independently", async () => {
      // Import to first account
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        date: "2024-01-15",
        amount: -50.00,
        importedFrom: "simplefin",
      });

      // Create second account and import
      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          slug: "savings",
          type: "savings",
        })
        .returning();

      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: account2.id,
        date: "2024-01-15",
        amount: 100.00,
        importedFrom: "simplefin",
      });

      const account1Txns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      const account2Txns = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, account2.id));

      expect(account1Txns).toHaveLength(1);
      expect(account2Txns).toHaveLength(1);
      expect(account1Txns[0].amount).toBe(-50.00);
      expect(account2Txns[0].amount).toBe(100.00);
    });
  });

  describe("sync statistics", () => {
    it("should track import statistics", async () => {
      const externalTransactions = [
        {id: "new_001", date: "2024-01-15", amount: -50.00, description: "NEW 1", pending: false},
        {id: "new_002", date: "2024-01-16", amount: -25.00, description: "NEW 2", pending: false},
        {id: "existing_001", date: "2024-01-10", amount: -100.00, description: "DUPE", pending: false},
      ];

      // Create existing transaction
      await ctx.db.insert(schema.transactions).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        fitid: "existing_001",
        date: "2024-01-10",
        amount: -100.00,
      });

      const existing = await ctx.db
        .select({fitid: schema.transactions.fitid, date: schema.transactions.date, amount: schema.transactions.amount})
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      // Calculate stats
      const stats = {
        total: externalTransactions.length,
        imported: 0,
        duplicates: 0,
        pending: 0,
      };

      for (const ext of externalTransactions) {
        if (isDuplicate(existing, ext)) {
          stats.duplicates++;
        } else {
          stats.imported++;
          if (ext.pending) stats.pending++;
        }
      }

      expect(stats.total).toBe(3);
      expect(stats.imported).toBe(2);
      expect(stats.duplicates).toBe(1);
    });
  });
});
