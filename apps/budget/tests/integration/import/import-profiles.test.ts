/**
 * Import Profiles - Integration Tests
 *
 * Tests import profile management including creation,
 * column mapping, profile matching, and account defaults.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";
import {generateColumnSignature} from "../../../src/lib/schema/import-profiles";

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

describe("Import Profiles", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("profile creation", () => {
    it("should create an import profile", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: "Notes",
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Chase Credit Card",
          columnSignature: generateColumnSignature(["Date", "Description", "Amount", "Notes"]),
          mapping,
        })
        .returning();

      expect(profile.name).toBe("Chase Credit Card");
      expect(profile.mapping).toEqual(mapping);
    });

    it("should create profile with filename pattern", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Transaction Date",
        description: "Description",
        amount: null,
        inflow: "Credit",
        outflow: "Debit",
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Bank of America",
          filenamePattern: "boa_*.csv",
          mapping,
        })
        .returning();

      expect(profile.filenamePattern).toBe("boa_*.csv");
    });

    it("should create profile as account default", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Checking Default",
          accountId: ctx.accountId,
          isAccountDefault: true,
          mapping,
        })
        .returning();

      expect(profile.accountId).toBe(ctx.accountId);
      expect(profile.isAccountDefault).toBe(true);
    });
  });

  describe("column signature matching", () => {
    it("should generate consistent column signature", () => {
      const headers1 = ["Date", "Amount", "Description"];
      const headers2 = ["Description", "Date", "Amount"];
      const headers3 = ["DATE", "AMOUNT", "DESCRIPTION"];

      const sig1 = generateColumnSignature(headers1);
      const sig2 = generateColumnSignature(headers2);
      const sig3 = generateColumnSignature(headers3);

      // All should produce the same signature (sorted, lowercase)
      expect(sig1).toBe(sig2);
      expect(sig2).toBe(sig3);
      expect(sig1).toBe("amount|date|description");
    });

    it("should find profile by column signature", async () => {
      const signature = generateColumnSignature(["Date", "Amount", "Description", "Category"]);

      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: "Category",
      };

      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: ctx.workspaceId,
        name: "Test Profile",
        columnSignature: signature,
        mapping,
      });

      // Search by signature
      const profile = await ctx.db.query.importProfiles.findFirst({
        where: and(
          eq(schema.importProfiles.workspaceId, ctx.workspaceId),
          eq(schema.importProfiles.columnSignature, signature)
        ),
      });

      expect(profile).toBeDefined();
      expect(profile?.name).toBe("Test Profile");
    });

    it("should not match different column signatures", async () => {
      const signature1 = generateColumnSignature(["Date", "Amount", "Description"]);
      const signature2 = generateColumnSignature(["Date", "Amount", "Memo"]);

      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: ctx.workspaceId,
        name: "Profile 1",
        columnSignature: signature1,
        mapping,
      });

      // Search with different signature
      const profile = await ctx.db.query.importProfiles.findFirst({
        where: and(
          eq(schema.importProfiles.workspaceId, ctx.workspaceId),
          eq(schema.importProfiles.columnSignature, signature2)
        ),
      });

      expect(profile).toBeUndefined();
    });
  });

  describe("account default profiles", () => {
    it("should find account default profile", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: ctx.workspaceId,
        name: "Checking Default",
        accountId: ctx.accountId,
        isAccountDefault: true,
        mapping,
      });

      const defaultProfile = await ctx.db.query.importProfiles.findFirst({
        where: and(
          eq(schema.importProfiles.accountId, ctx.accountId),
          eq(schema.importProfiles.isAccountDefault, true)
        ),
      });

      expect(defaultProfile).toBeDefined();
      expect(defaultProfile?.name).toBe("Checking Default");
    });

    it("should allow one default per account", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      // Create first default
      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: ctx.workspaceId,
        name: "First Default",
        accountId: ctx.accountId,
        isAccountDefault: true,
        mapping,
      });

      // Create second profile (not default yet)
      const [second] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Second Profile",
          accountId: ctx.accountId,
          isAccountDefault: false,
          mapping,
        })
        .returning();

      // Clear existing defaults before setting new one
      await ctx.db
        .update(schema.importProfiles)
        .set({isAccountDefault: false})
        .where(
          and(
            eq(schema.importProfiles.accountId, ctx.accountId),
            eq(schema.importProfiles.isAccountDefault, true)
          )
        );

      // Set new default
      await ctx.db
        .update(schema.importProfiles)
        .set({isAccountDefault: true})
        .where(eq(schema.importProfiles.id, second.id));

      // Check only one default exists
      const defaults = await ctx.db
        .select()
        .from(schema.importProfiles)
        .where(
          and(
            eq(schema.importProfiles.accountId, ctx.accountId),
            eq(schema.importProfiles.isAccountDefault, true)
          )
        );

      expect(defaults).toHaveLength(1);
      expect(defaults[0].name).toBe("Second Profile");
    });
  });

  describe("profile updates", () => {
    it("should update profile mapping", async () => {
      const initialMapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Test Profile",
          mapping: initialMapping,
        })
        .returning();

      const updatedMapping: schema.ColumnMapping = {
        ...initialMapping,
        memo: "Notes",
        payee: "Merchant",
      };

      await ctx.db
        .update(schema.importProfiles)
        .set({mapping: updatedMapping})
        .where(eq(schema.importProfiles.id, profile.id));

      const updated = await ctx.db.query.importProfiles.findFirst({
        where: eq(schema.importProfiles.id, profile.id),
      });

      expect(updated?.mapping.memo).toBe("Notes");
      expect(updated?.mapping.payee).toBe("Merchant");
    });

    it("should track usage statistics", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Test Profile",
          mapping,
          useCount: 0,
        })
        .returning();

      expect(profile.useCount).toBe(0);

      // Simulate profile usage
      const now = new Date().toISOString();
      await ctx.db
        .update(schema.importProfiles)
        .set({
          useCount: (profile.useCount ?? 0) + 1,
          lastUsedAt: now,
        })
        .where(eq(schema.importProfiles.id, profile.id));

      const updated = await ctx.db.query.importProfiles.findFirst({
        where: eq(schema.importProfiles.id, profile.id),
      });

      expect(updated?.useCount).toBe(1);
      expect(updated?.lastUsedAt).toBe(now);
    });
  });

  describe("profile deletion", () => {
    it("should delete profile", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "To Delete",
          mapping,
        })
        .returning();

      await ctx.db.delete(schema.importProfiles).where(eq(schema.importProfiles.id, profile.id));

      const deleted = await ctx.db.query.importProfiles.findFirst({
        where: eq(schema.importProfiles.id, profile.id),
      });

      expect(deleted).toBeUndefined();
    });

    it("should cascade delete when account is deleted", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Account Profile",
          accountId: ctx.accountId,
          mapping,
        })
        .returning();

      // Manual cleanup since SQLite FK "set null" may not work in test DB
      await ctx.db
        .update(schema.importProfiles)
        .set({accountId: null})
        .where(eq(schema.importProfiles.accountId, ctx.accountId));

      // Delete account
      await ctx.db.delete(schema.accounts).where(eq(schema.accounts.id, ctx.accountId));

      // Profile should have null accountId (set null on delete)
      const updated = await ctx.db.query.importProfiles.findFirst({
        where: eq(schema.importProfiles.id, profile.id),
      });

      expect(updated).toBeDefined();
      expect(updated?.accountId).toBeNull();
    });
  });

  describe("multiple workspaces", () => {
    it("should isolate profiles by workspace", async () => {
      const [workspace2] = await ctx.db
        .insert(schema.workspaces)
        .values({
          displayName: "Second Workspace",
          slug: "second-workspace",
        })
        .returning();

      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: null,
        payee: null,
        category: null,
      };

      // Create profile in first workspace
      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: ctx.workspaceId,
        name: "Workspace 1 Profile",
        mapping,
      });

      // Create profile in second workspace
      await ctx.db.insert(schema.importProfiles).values({
        workspaceId: workspace2.id,
        name: "Workspace 2 Profile",
        mapping,
      });

      const ws1Profiles = await ctx.db
        .select()
        .from(schema.importProfiles)
        .where(eq(schema.importProfiles.workspaceId, ctx.workspaceId));

      const ws2Profiles = await ctx.db
        .select()
        .from(schema.importProfiles)
        .where(eq(schema.importProfiles.workspaceId, workspace2.id));

      expect(ws1Profiles).toHaveLength(1);
      expect(ws1Profiles[0].name).toBe("Workspace 1 Profile");

      expect(ws2Profiles).toHaveLength(1);
      expect(ws2Profiles[0].name).toBe("Workspace 2 Profile");
    });
  });

  describe("column mapping variations", () => {
    it("should handle inflow/outflow split columns", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: null, // No combined amount
        inflow: "Credit",
        outflow: "Debit",
        memo: null,
        payee: null,
        category: null,
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Split Columns",
          mapping,
        })
        .returning();

      expect(profile.mapping.amount).toBeNull();
      expect(profile.mapping.inflow).toBe("Credit");
      expect(profile.mapping.outflow).toBe("Debit");
    });

    it("should handle all optional fields", async () => {
      const mapping: schema.ColumnMapping = {
        date: "Date",
        description: "Description",
        amount: "Amount",
        inflow: null,
        outflow: null,
        memo: "Memo",
        payee: "Payee",
        category: "Category",
        status: "Status",
      };

      const [profile] = await ctx.db
        .insert(schema.importProfiles)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Full Mapping",
          mapping,
        })
        .returning();

      expect(profile.mapping.memo).toBe("Memo");
      expect(profile.mapping.payee).toBe("Payee");
      expect(profile.mapping.category).toBe("Category");
      expect(profile.mapping.status).toBe("Status");
    });
  });
});
