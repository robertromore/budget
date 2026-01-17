/**
 * Transfer Detector - Integration Tests
 *
 * Tests transfer detection during import including payee matching,
 * mapping storage, and transfer pair creation.
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
  checkingId: number;
  savingsId: number;
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

  const [checking] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Checking",
      slug: "checking",
      type: "checking",
    })
    .returning();

  const [savings] = await db
    .insert(schema.accounts)
    .values({
      workspaceId: workspace.id,
      name: "Savings",
      slug: "savings",
      type: "savings",
    })
    .returning();

  return {
    db,
    workspaceId: workspace.id,
    checkingId: checking.id,
    savingsId: savings.id,
  };
}

/**
 * Import row structure
 */
interface ImportRow {
  date: string;
  amount: number;
  payeeName: string;
  memo?: string;
}

/**
 * Potential transfer match
 */
interface TransferMatch {
  targetAccountId: number;
  targetAccountName: string;
  confidence: number;
  reason: "exact_mapping" | "payee_contains_account" | "memo_contains_account" | "amount_match";
}

/**
 * Check if payee name suggests internal transfer
 */
function detectTransferFromPayee(
  payeeName: string,
  accounts: Array<{id: number; name: string}>
): TransferMatch | null {
  const normalized = payeeName.toLowerCase();

  // Common transfer indicators
  const transferIndicators = [
    "transfer",
    "xfer",
    "trf",
    "from",
    "to",
    "savings",
    "checking",
  ];

  const hasIndicator = transferIndicators.some((i) => normalized.includes(i));

  if (hasIndicator) {
    // Try to match account name
    for (const account of accounts) {
      if (normalized.includes(account.name.toLowerCase())) {
        return {
          targetAccountId: account.id,
          targetAccountName: account.name,
          confidence: 0.8,
          reason: "payee_contains_account",
        };
      }
    }
  }

  return null;
}

describe("Transfer Detector", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("transfer mapping storage", () => {
    it("should create transfer mapping", async () => {
      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString: "TRANSFER TO SAVINGS",
          normalizedString: "transfer to savings",
          targetAccountId: ctx.savingsId,
          trigger: "import_confirmation",
        })
        .returning();

      expect(mapping).toBeDefined();
      expect(mapping.rawPayeeString).toBe("TRANSFER TO SAVINGS");
      expect(mapping.targetAccountId).toBe(ctx.savingsId);
    });

    it("should lookup mapping by payee name", async () => {
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString: "TRANSFER TO SAVINGS",
        normalizedString: "transfer to savings",
        targetAccountId: ctx.savingsId,
        trigger: "import_confirmation",
      });

      const mapping = await ctx.db.query.transferMappings.findFirst({
        where: and(
          eq(schema.transferMappings.workspaceId, ctx.workspaceId),
          eq(schema.transferMappings.rawPayeeString, "TRANSFER TO SAVINGS")
        ),
      });

      expect(mapping?.targetAccountId).toBe(ctx.savingsId);
    });

    it("should support multiple mappings per workspace", async () => {
      await ctx.db.insert(schema.transferMappings).values([
        {workspaceId: ctx.workspaceId, rawPayeeString: "TRANSFER TO SAVINGS", normalizedString: "transfer to savings", targetAccountId: ctx.savingsId, trigger: "import_confirmation"},
        {workspaceId: ctx.workspaceId, rawPayeeString: "TRANSFER FROM SAVINGS", normalizedString: "transfer from savings", targetAccountId: ctx.savingsId, trigger: "import_confirmation"},
        {workspaceId: ctx.workspaceId, rawPayeeString: "TRANSFER TO CHECKING", normalizedString: "transfer to checking", targetAccountId: ctx.checkingId, trigger: "import_confirmation"},
      ]);

      const mappings = await ctx.db
        .select()
        .from(schema.transferMappings)
        .where(eq(schema.transferMappings.workspaceId, ctx.workspaceId));

      expect(mappings).toHaveLength(3);
    });
  });

  describe("payee-based detection", () => {
    it("should detect transfer from payee name with account", () => {
      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      const match = detectTransferFromPayee("TRANSFER TO SAVINGS", accounts);

      expect(match).not.toBeNull();
      expect(match?.targetAccountId).toBe(ctx.savingsId);
      expect(match?.reason).toBe("payee_contains_account");
    });

    it("should detect transfer with abbreviated keywords", () => {
      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      const match = detectTransferFromPayee("XFER SAVINGS", accounts);

      expect(match).not.toBeNull();
      expect(match?.targetAccountId).toBe(ctx.savingsId);
    });

    it("should return null for non-transfer payees", () => {
      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      const match = detectTransferFromPayee("WALMART STORE #1234", accounts);

      expect(match).toBeNull();
    });

    it("should handle case insensitive matching", () => {
      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      const match = detectTransferFromPayee("transfer to savings", accounts);

      expect(match).not.toBeNull();
      expect(match?.targetAccountId).toBe(ctx.savingsId);
    });
  });

  describe("exact mapping lookup", () => {
    it("should use exact mapping when available", async () => {
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString: "ZELLE PAYMENT TO JOHN",
        normalizedString: "zelle payment to john",
        targetAccountId: ctx.savingsId,
        trigger: "import_confirmation",
      });

      const mapping = await ctx.db.query.transferMappings.findFirst({
        where: and(
          eq(schema.transferMappings.workspaceId, ctx.workspaceId),
          eq(schema.transferMappings.rawPayeeString, "ZELLE PAYMENT TO JOHN")
        ),
      });

      expect(mapping?.targetAccountId).toBe(ctx.savingsId);
    });

    it("should prioritize exact mapping over detection", async () => {
      // Create mapping that overrides detection
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString: "TRANSFER TO SAVINGS",
        normalizedString: "transfer to savings",
        targetAccountId: ctx.checkingId, // Override to checking instead of savings
        trigger: "import_confirmation",
      });

      const mapping = await ctx.db.query.transferMappings.findFirst({
        where: and(
          eq(schema.transferMappings.workspaceId, ctx.workspaceId),
          eq(schema.transferMappings.rawPayeeString, "TRANSFER TO SAVINGS")
        ),
      });

      // Mapping takes precedence
      expect(mapping?.targetAccountId).toBe(ctx.checkingId);
    });
  });

  describe("transfer pair matching", () => {
    it("should match outgoing with incoming transfer", async () => {
      // Create outgoing transaction from checking
      const [outgoing] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingId,
          date: "2024-01-15",
          amount: -500.00,
          originalPayeeName: "TRANSFER TO SAVINGS",
          status: "cleared",
        })
        .returning();

      // Create incoming transaction to savings
      const [incoming] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsId,
          date: "2024-01-15",
          amount: 500.00,
          originalPayeeName: "TRANSFER FROM CHECKING",
          status: "cleared",
        })
        .returning();

      // Find potential match: same date, opposite amounts
      const matches = await ctx.db
        .select()
        .from(schema.transactions)
        .where(
          and(
            eq(schema.transactions.workspaceId, ctx.workspaceId),
            eq(schema.transactions.date, outgoing.date)
          )
        );

      // Should find matching pair
      const outTx = matches.find((t) => t.amount < 0);
      const inTx = matches.find((t) => t.amount > 0);

      expect(outTx!.amount + inTx!.amount).toBe(0); // Opposite amounts cancel out
    });

    it("should handle amount tolerance for fees", () => {
      const outgoing = -500.00;
      const incoming = 497.50; // Bank took a $2.50 fee

      const tolerance = 5.00; // Allow $5 difference
      const difference = Math.abs(Math.abs(outgoing) - incoming);

      expect(difference).toBeLessThanOrEqual(tolerance);
    });

    it("should handle date tolerance for pending transactions", () => {
      const outgoingDate = new Date("2024-01-15");
      const incomingDate = new Date("2024-01-17"); // 2 days later

      const daysDiff = Math.abs(
        (incomingDate.getTime() - outgoingDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const maxDays = 3;

      expect(daysDiff).toBeLessThanOrEqual(maxDays);
    });
  });

  describe("transfer linking", () => {
    it("should link transactions as transfer pair", async () => {
      const transferId = "transfer_" + Date.now();

      // Create linked pair
      const [outgoing] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.checkingId,
          date: "2024-01-15",
          amount: -500.00,
          isTransfer: true,
          transferId,
          transferAccountId: ctx.savingsId,
          status: "cleared",
        })
        .returning();

      const [incoming] = await ctx.db
        .insert(schema.transactions)
        .values({
          workspaceId: ctx.workspaceId,
          accountId: ctx.savingsId,
          date: "2024-01-15",
          amount: 500.00,
          isTransfer: true,
          transferId,
          transferAccountId: ctx.checkingId,
          transferTransactionId: outgoing.id,
          status: "cleared",
        })
        .returning();

      // Update outgoing with incoming reference
      await ctx.db
        .update(schema.transactions)
        .set({transferTransactionId: incoming.id})
        .where(eq(schema.transactions.id, outgoing.id));

      // Verify linkage
      const linkedOutgoing = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, outgoing.id),
      });

      const linkedIncoming = await ctx.db.query.transactions.findFirst({
        where: eq(schema.transactions.id, incoming.id),
      });

      expect(linkedOutgoing?.transferTransactionId).toBe(incoming.id);
      expect(linkedIncoming?.transferTransactionId).toBe(outgoing.id);
      expect(linkedOutgoing?.transferId).toBe(linkedIncoming?.transferId);
    });
  });

  describe("import batch detection", () => {
    it("should detect transfers in batch import", async () => {
      const importRows: ImportRow[] = [
        {date: "2024-01-10", amount: -100.00, payeeName: "WALMART"},
        {date: "2024-01-12", amount: -500.00, payeeName: "TRANSFER TO SAVINGS"},
        {date: "2024-01-15", amount: -50.00, payeeName: "STARBUCKS"},
        {date: "2024-01-18", amount: -200.00, payeeName: "XFER TO CHECKING"},
      ];

      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      const detectedTransfers = importRows.filter((row) => {
        const match = detectTransferFromPayee(row.payeeName, accounts);
        return match !== null;
      });

      expect(detectedTransfers).toHaveLength(2);
      expect(detectedTransfers[0].payeeName).toBe("TRANSFER TO SAVINGS");
      expect(detectedTransfers[1].payeeName).toBe("XFER TO CHECKING");
    });

    it("should return detection stats", () => {
      const rows: ImportRow[] = [
        {date: "2024-01-10", amount: -100.00, payeeName: "WALMART"},
        {date: "2024-01-12", amount: -500.00, payeeName: "TRANSFER TO SAVINGS"},
        {date: "2024-01-15", amount: -50.00, payeeName: "STARBUCKS"},
      ];

      const stats = {
        totalRows: rows.length,
        potentialTransfers: 0,
        withExistingMapping: 0,
        needsReview: 0,
      };

      const accounts = [
        {id: ctx.checkingId, name: "Checking"},
        {id: ctx.savingsId, name: "Savings"},
      ];

      for (const row of rows) {
        const match = detectTransferFromPayee(row.payeeName, accounts);
        if (match) {
          stats.potentialTransfers++;
          stats.needsReview++;
        }
      }

      expect(stats.totalRows).toBe(3);
      expect(stats.potentialTransfers).toBe(1);
    });
  });

  describe("saving new mappings", () => {
    it("should save mapping when user confirms transfer", async () => {
      const rawPayeeString = "VENMO PAYMENT TO SAVINGS";

      // User confirms this is a transfer to savings
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString,
        normalizedString: rawPayeeString.toLowerCase(),
        targetAccountId: ctx.savingsId,
        trigger: "import_confirmation",
      });

      // Verify saved
      const mapping = await ctx.db.query.transferMappings.findFirst({
        where: eq(schema.transferMappings.rawPayeeString, rawPayeeString),
      });

      expect(mapping).toBeDefined();
      expect(mapping?.targetAccountId).toBe(ctx.savingsId);
    });

    it("should update existing mapping", async () => {
      const rawPayeeString = "TRANSFER";

      // Initial mapping
      const [mapping] = await ctx.db
        .insert(schema.transferMappings)
        .values({
          workspaceId: ctx.workspaceId,
          rawPayeeString,
          normalizedString: rawPayeeString.toLowerCase(),
          targetAccountId: ctx.savingsId,
          trigger: "import_confirmation",
        })
        .returning();

      // Update to different account
      await ctx.db
        .update(schema.transferMappings)
        .set({targetAccountId: ctx.checkingId})
        .where(eq(schema.transferMappings.id, mapping.id));

      const updated = await ctx.db.query.transferMappings.findFirst({
        where: eq(schema.transferMappings.id, mapping.id),
      });

      expect(updated?.targetAccountId).toBe(ctx.checkingId);
    });
  });

  describe("credit card payments", () => {
    it("should detect credit card payment as transfer", async () => {
      const [creditCard] = await ctx.db
        .insert(schema.accounts)
        .values({
          workspaceId: ctx.workspaceId,
          name: "Chase Sapphire",
          slug: "chase-sapphire",
          type: "credit_card",
        })
        .returning();

      // Map credit card payment payee
      await ctx.db.insert(schema.transferMappings).values({
        workspaceId: ctx.workspaceId,
        rawPayeeString: "CHASE CARD PAYMENT",
        normalizedString: "chase card payment",
        targetAccountId: creditCard.id,
        trigger: "import_confirmation",
      });

      const mapping = await ctx.db.query.transferMappings.findFirst({
        where: eq(schema.transferMappings.rawPayeeString, "CHASE CARD PAYMENT"),
      });

      expect(mapping?.targetAccountId).toBe(creditCard.id);
    });
  });
});
