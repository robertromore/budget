/**
 * Connection Lifecycle - Integration Tests
 *
 * Tests bank connection lifecycle including creation,
 * status updates, disconnection, and cleanup.
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

describe("Connection Lifecycle", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("connection creation", () => {
    it("should create SimpleFIN connection", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      expect(connection.provider).toBe("simplefin");
      expect(connection.syncStatus).toBe("active");
      expect(connection.institutionName).toBe("Test Bank");
    });

    it("should create Teller connection", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "teller",
          externalAccountId: "teller_acc_67890",
          institutionName: "Chase Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      expect(connection.provider).toBe("teller");
      expect(connection.externalAccountId).toBe("teller_acc_67890");
    });

    it("should check if connection exists for account", async () => {
      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        provider: "simplefin",
        externalAccountId: "sf_12345",
        institutionName: "Test Bank",
        encryptedCredentials: "encrypted_creds_here",
        syncStatus: "active",
      });

      // Check if connection exists
      const existing = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.accountId, ctx.accountId),
      });

      expect(existing).toBeDefined();
    });
  });

  describe("connection sync status", () => {
    it("should create connection with active status", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      expect(connection.syncStatus).toBe("active");
    });

    it("should update lastSyncAt after successful sync", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      const now = new Date().toISOString();
      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "active",
          lastSyncAt: now,
          syncError: null,
        })
        .where(eq(schema.accountConnections.id, connection.id));

      const updated = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(updated?.lastSyncAt).toBe(now);
      expect(updated?.syncError).toBeNull();
    });

    it("should transition to error state on failure", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "error",
          syncError: "Connection timeout",
        })
        .where(eq(schema.accountConnections.id, connection.id));

      const updated = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(updated?.syncStatus).toBe("error");
      expect(updated?.syncError).toBe("Connection timeout");
    });

    it("should recover from error state", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "error",
          syncError: "Token expired",
        })
        .returning();

      // Simulate recovery
      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "active",
          syncError: null,
        })
        .where(eq(schema.accountConnections.id, connection.id));

      const updated = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(updated?.syncStatus).toBe("active");
      expect(updated?.syncError).toBeNull();
    });
  });

  describe("transaction preservation", () => {
    it("should preserve transactions after error", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "error",
        })
        .returning();

      // Create some transactions before error
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-10", amount: -50.00, importedFrom: "simplefin"},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-15", amount: -75.00, importedFrom: "simplefin"},
      ]);

      // Recover from error
      await ctx.db
        .update(schema.accountConnections)
        .set({syncStatus: "active"})
        .where(eq(schema.accountConnections.id, connection.id));

      // Transactions should still exist
      const transactions = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(transactions).toHaveLength(2);
    });
  });

  describe("disconnection", () => {
    it("should mark connection as disconnected", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "disconnected",
        })
        .where(eq(schema.accountConnections.id, connection.id));

      const updated = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(updated?.syncStatus).toBe("disconnected");
    });

    it("should preserve transactions after disconnection", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      // Create transactions
      await ctx.db.insert(schema.transactions).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-10", amount: -50.00},
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, date: "2024-01-15", amount: -75.00},
      ]);

      // Disconnect
      await ctx.db
        .update(schema.accountConnections)
        .set({syncStatus: "disconnected"})
        .where(eq(schema.accountConnections.id, connection.id));

      // Transactions remain
      const transactions = await ctx.db
        .select()
        .from(schema.transactions)
        .where(eq(schema.transactions.accountId, ctx.accountId));

      expect(transactions).toHaveLength(2);
    });

    it("should allow reconnection after disconnection", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "disconnected",
        })
        .returning();

      // Reconnect (update credentials and status)
      await ctx.db
        .update(schema.accountConnections)
        .set({
          syncStatus: "active",
          externalAccountId: "sf_new_67890",
          encryptedCredentials: "new_encrypted_creds",
        })
        .where(eq(schema.accountConnections.id, connection.id));

      const updated = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(updated?.syncStatus).toBe("active");
    });
  });

  describe("cleanup", () => {
    it("should delete connection and preserve account", async () => {
      const [connection] = await ctx.db
        .insert(schema.accountConnections)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.accountId,
          provider: "simplefin",
          externalAccountId: "sf_12345",
          institutionName: "Test Bank",
          encryptedCredentials: "encrypted_creds_here",
          syncStatus: "active",
        })
        .returning();

      // Delete connection
      await ctx.db
        .delete(schema.accountConnections)
        .where(eq(schema.accountConnections.id, connection.id));

      // Account should still exist
      const account = await ctx.db.query.accounts.findFirst({
        where: eq(schema.accounts.id, ctx.accountId),
      });

      expect(account).toBeDefined();

      // Connection should be gone
      const deletedConnection = await ctx.db.query.accountConnections.findFirst({
        where: eq(schema.accountConnections.id, connection.id),
      });

      expect(deletedConnection).toBeUndefined();
    });

    it("should allow deleting connection before account", async () => {
      const [connection] = await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        provider: "simplefin",
        externalAccountId: "sf_12345",
        institutionName: "Test Bank",
        encryptedCredentials: "encrypted_creds_here",
        syncStatus: "active",
      }).returning();

      // Delete connection first
      await ctx.db.delete(schema.accountConnections).where(eq(schema.accountConnections.id, connection.id));

      // Then delete account
      await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, ctx.accountId));

      // Both should be deleted
      const connections = await ctx.db
        .select()
        .from(schema.accountConnections)
        .where(eq(schema.accountConnections.accountId, ctx.accountId));

      const account = await ctx.db.query.accounts.findFirst({
        where: eq(schema.accounts.id, ctx.accountId),
      });

      expect(connections).toHaveLength(0);
      expect(account).toBeUndefined();
    });
  });

  describe("workspace connections", () => {
    it("should list all connections for workspace", async () => {
      // Create multiple accounts with connections
      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          slug: "savings",
          type: "savings",
        })
        .returning();

      await ctx.db.insert(schema.accountConnections).values([
        {workspaceId: ctx.workspaceId, accountId: ctx.accountId, provider: "simplefin", externalAccountId: "sf_checking", institutionName: "Test Bank", encryptedCredentials: "creds1", syncStatus: "active"},
      ]);

      // Create separate connection for account2
      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: account2.id,
        provider: "simplefin",
        externalAccountId: "sf_savings",
        institutionName: "Test Bank",
        encryptedCredentials: "creds2",
        syncStatus: "active",
      });

      const connections = await ctx.db
        .select()
        .from(schema.accountConnections)
        .where(eq(schema.accountConnections.workspaceId, ctx.workspaceId));

      expect(connections).toHaveLength(2);
    });

    it("should find connections needing attention", async () => {
      // Create second account for additional connections
      const [account2] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Savings",
          slug: "savings",
          type: "savings",
        })
        .returning();

      const [account3] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Credit Card",
          slug: "credit-card",
          type: "credit_card",
        })
        .returning();

      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: ctx.accountId,
        provider: "simplefin",
        externalAccountId: "sf_1",
        institutionName: "Test Bank",
        encryptedCredentials: "creds1",
        syncStatus: "active",
      });

      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: account2.id,
        provider: "simplefin",
        externalAccountId: "sf_2",
        institutionName: "Test Bank",
        encryptedCredentials: "creds2",
        syncStatus: "error",
        syncError: "Token expired",
      });

      await ctx.db.insert(schema.accountConnections).values({
        workspaceId: ctx.workspaceId,
        accountId: account3.id,
        provider: "simplefin",
        externalAccountId: "sf_3",
        institutionName: "Test Bank",
        encryptedCredentials: "creds3",
        syncStatus: "disconnected",
      });

      const allConnections = await ctx.db
        .select()
        .from(schema.accountConnections)
        .where(eq(schema.accountConnections.workspaceId, ctx.workspaceId));

      const needsAttention = allConnections.filter(
        (c) => c.syncStatus === "error" || c.syncStatus === "disconnected"
      );

      expect(needsAttention).toHaveLength(2);
    });
  });
});
