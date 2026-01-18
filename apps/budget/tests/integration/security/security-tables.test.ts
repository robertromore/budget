/**
 * Security Tables - Integration Tests
 *
 * Tests the security-related tables: encryption keys, trusted contexts, and access logs.
 */

import {describe, it, expect, beforeEach} from "vitest";
import {setupTestDb} from "../setup/test-db";
import * as schema from "../../../src/lib/schema";
import {eq, and} from "drizzle-orm";
import type {BunSQLiteDatabase} from "drizzle-orm/bun-sqlite";

type TestDb = BunSQLiteDatabase<typeof schema>;

interface TestContext {
  db: TestDb;
  userId: string;
  workspaceId: number;
}

async function setupTestContext(): Promise<TestContext> {
  const db = await setupTestDb();

  // Create user
  const [user] = await db
    .insert(schema.users)
    .values({
      id: "user_test123",
      email: "test@example.com",
      name: "Test User",
      emailVerified: true,
    })
    .returning();

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: "test-workspace",
    })
    .returning();

  return {
    db,
    userId: user.id,
    workspaceId: workspace.id,
  };
}

describe("Encryption Keys", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("key creation", () => {
    it("should create encryption key for user", async () => {
      const [key] = await ctx.db
        .insert(schema.encryptionKeys)
        .values({
          targetType: "user",
          targetId: ctx.userId,
          encryptedDek: "encrypted-dek-data-here",
          keyType: "passphrase",
        })
        .returning();

      expect(key).toBeDefined();
      expect(key.targetType).toBe("user");
      expect(key.targetId).toBe(ctx.userId);
      expect(key.keyType).toBe("passphrase");
      expect(key.keyVersion).toBe(1);
    });

    it("should support all target types", async () => {
      const targetTypes = ["user", "workspace", "account"] as const;

      for (const targetType of targetTypes) {
        const [key] = await ctx.db
          .insert(schema.encryptionKeys)
          .values({
            targetType,
            targetId: `${targetType}_123`,
            encryptedDek: `dek-for-${targetType}`,
            keyType: "token",
          })
          .returning();

        expect(key.targetType).toBe(targetType);
      }
    });

    it("should support all key types", async () => {
      const keyTypes = ["token", "passphrase", "keypair"] as const;

      for (const keyType of keyTypes) {
        const [key] = await ctx.db
          .insert(schema.encryptionKeys)
          .values({
            targetType: "user",
            targetId: `user_${keyType}`,
            encryptedDek: `dek-${keyType}`,
            keyType,
          })
          .returning();

        expect(key.keyType).toBe(keyType);
      }
    });

    it("should store verification hash", async () => {
      const [key] = await ctx.db
        .insert(schema.encryptionKeys)
        .values({
          targetType: "user",
          targetId: ctx.userId,
          encryptedDek: "encrypted-dek",
          keyType: "passphrase",
          keyVerificationHash: "sha256-verification-hash",
        })
        .returning();

      expect(key.keyVerificationHash).toBe("sha256-verification-hash");
    });

    it("should store public key for keypair type", async () => {
      const [key] = await ctx.db
        .insert(schema.encryptionKeys)
        .values({
          targetType: "user",
          targetId: ctx.userId,
          encryptedDek: "encrypted-private-key",
          keyType: "keypair",
          publicKey: "ssh-rsa AAAA...public-key-data",
        })
        .returning();

      expect(key.publicKey).toBe("ssh-rsa AAAA...public-key-data");
    });
  });

  describe("key rotation", () => {
    it("should increment key version on rotation", async () => {
      const [key] = await ctx.db
        .insert(schema.encryptionKeys)
        .values({
          targetType: "user",
          targetId: ctx.userId,
          encryptedDek: "original-dek",
          keyType: "passphrase",
          keyVersion: 1,
        })
        .returning();

      await ctx.db
        .update(schema.encryptionKeys)
        .set({
          encryptedDek: "rotated-dek",
          keyVersion: 2,
          rotatedAt: new Date().toISOString(),
        })
        .where(eq(schema.encryptionKeys.id, key.id));

      const [rotated] = await ctx.db
        .select()
        .from(schema.encryptionKeys)
        .where(eq(schema.encryptionKeys.id, key.id));

      expect(rotated.keyVersion).toBe(2);
      expect(rotated.rotatedAt).toBeDefined();
    });
  });

  describe("key queries", () => {
    it("should find key by target", async () => {
      await ctx.db.insert(schema.encryptionKeys).values({
        targetType: "user",
        targetId: ctx.userId,
        encryptedDek: "user-dek",
        keyType: "passphrase",
      });

      const [key] = await ctx.db
        .select()
        .from(schema.encryptionKeys)
        .where(
          and(
            eq(schema.encryptionKeys.targetType, "user"),
            eq(schema.encryptionKeys.targetId, ctx.userId)
          )
        );

      expect(key).toBeDefined();
      expect(key.encryptedDek).toBe("user-dek");
    });
  });
});

describe("User Trusted Contexts", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("context creation", () => {
    it("should create trusted IP context", async () => {
      const [context] = await ctx.db
        .insert(schema.userTrustedContexts)
        .values({
          userId: ctx.userId,
          contextType: "ip",
          contextValue: "sha256-of-ip-address",
          label: "Home",
        })
        .returning();

      expect(context).toBeDefined();
      expect(context.contextType).toBe("ip");
      expect(context.label).toBe("Home");
      expect(context.trustScore).toBe(0.5);
    });

    it("should support all context types", async () => {
      const contextTypes = ["ip", "location", "device", "time_pattern"] as const;

      for (const contextType of contextTypes) {
        const [context] = await ctx.db
          .insert(schema.userTrustedContexts)
          .values({
            userId: ctx.userId,
            contextType,
            contextValue: `hash-for-${contextType}`,
          })
          .returning();

        expect(context.contextType).toBe(contextType);
      }
    });

    it("should track explicit trust", async () => {
      const [context] = await ctx.db
        .insert(schema.userTrustedContexts)
        .values({
          userId: ctx.userId,
          contextType: "device",
          contextValue: "device-fingerprint-hash",
          label: "MacBook Pro",
          explicitlyTrusted: true,
        })
        .returning();

      expect(context.explicitlyTrusted).toBe(true);
    });
  });

  describe("context updates", () => {
    it("should increase trust score with repeated use", async () => {
      const [context] = await ctx.db
        .insert(schema.userTrustedContexts)
        .values({
          userId: ctx.userId,
          contextType: "ip",
          contextValue: "known-ip-hash",
          trustScore: 0.5,
          seenCount: 1,
        })
        .returning();

      await ctx.db
        .update(schema.userTrustedContexts)
        .set({
          trustScore: 0.8,
          seenCount: 5,
          lastSeenAt: new Date().toISOString(),
        })
        .where(eq(schema.userTrustedContexts.id, context.id));

      const [updated] = await ctx.db
        .select()
        .from(schema.userTrustedContexts)
        .where(eq(schema.userTrustedContexts.id, context.id));

      expect(updated.trustScore).toBe(0.8);
      expect(updated.seenCount).toBe(5);
    });

    it("should revoke trust", async () => {
      const [context] = await ctx.db
        .insert(schema.userTrustedContexts)
        .values({
          userId: ctx.userId,
          contextType: "device",
          contextValue: "old-device",
          explicitlyTrusted: true,
        })
        .returning();

      await ctx.db
        .update(schema.userTrustedContexts)
        .set({revokedAt: new Date().toISOString()})
        .where(eq(schema.userTrustedContexts.id, context.id));

      const [revoked] = await ctx.db
        .select()
        .from(schema.userTrustedContexts)
        .where(eq(schema.userTrustedContexts.id, context.id));

      expect(revoked.revokedAt).toBeDefined();
    });
  });

  describe("context queries", () => {
    it("should find trusted contexts for user", async () => {
      await ctx.db.insert(schema.userTrustedContexts).values([
        {userId: ctx.userId, contextType: "ip", contextValue: "ip1", label: "Home"},
        {userId: ctx.userId, contextType: "device", contextValue: "device1", label: "Laptop"},
      ]);

      const contexts = await ctx.db
        .select()
        .from(schema.userTrustedContexts)
        .where(eq(schema.userTrustedContexts.userId, ctx.userId));

      expect(contexts).toHaveLength(2);
    });
  });
});

describe("Access Log", () => {
  let ctx: TestContext;

  beforeEach(async () => {
    ctx = await setupTestContext();
  });

  describe("log creation", () => {
    it("should log access event", async () => {
      const [log] = await ctx.db
        .insert(schema.accessLog)
        .values({
          userId: ctx.userId,
          eventType: "login",
          ipAddressHash: "sha256-ip-hash",
          userAgent: "Mozilla/5.0 ...",
        })
        .returning();

      expect(log).toBeDefined();
      expect(log.userId).toBe(ctx.userId);
      expect(log.eventType).toBe("login");
    });

    it("should log with geo location", async () => {
      const [log] = await ctx.db
        .insert(schema.accessLog)
        .values({
          userId: ctx.userId,
          eventType: "login",
          geoLocation: "US-TX",
          localHour: 14,
          dayOfWeek: 3,
        })
        .returning();

      expect(log.geoLocation).toBe("US-TX");
      expect(log.localHour).toBe(14);
      expect(log.dayOfWeek).toBe(3);
    });

    it("should track challenge events", async () => {
      const [log] = await ctx.db
        .insert(schema.accessLog)
        .values({
          userId: ctx.userId,
          eventType: "challenge_required",
          riskScore: 75.5,
          challengeRequired: true,
          challengeType: "email",
        })
        .returning();

      expect(log.challengeRequired).toBe(true);
      expect(log.challengeType).toBe("email");
      expect(log.riskScore).toBe(75.5);
    });

    it("should log key unlock events", async () => {
      const [log] = await ctx.db
        .insert(schema.accessLog)
        .values({
          userId: ctx.userId,
          eventType: "key_unlock",
          keyUnlocked: true,
        })
        .returning();

      expect(log.eventType).toBe("key_unlock");
      expect(log.keyUnlocked).toBe(true);
    });

    it("should store session id", async () => {
      const [log] = await ctx.db
        .insert(schema.accessLog)
        .values({
          userId: ctx.userId,
          eventType: "login",
          sessionId: "session_abc123",
        })
        .returning();

      expect(log.sessionId).toBe("session_abc123");
    });
  });

  describe("log queries", () => {
    beforeEach(async () => {
      await ctx.db.insert(schema.accessLog).values([
        {userId: ctx.userId, eventType: "login", riskScore: 10},
        {userId: ctx.userId, eventType: "logout", riskScore: 0},
        {userId: ctx.userId, eventType: "challenge_required", riskScore: 80, challengeRequired: true},
        {userId: ctx.userId, eventType: "challenge_passed", challengePassed: true},
      ]);
    });

    it("should find all logs for user", async () => {
      const logs = await ctx.db
        .select()
        .from(schema.accessLog)
        .where(eq(schema.accessLog.userId, ctx.userId));

      expect(logs).toHaveLength(4);
    });

    it("should filter by event type", async () => {
      const loginLogs = await ctx.db
        .select()
        .from(schema.accessLog)
        .where(
          and(
            eq(schema.accessLog.userId, ctx.userId),
            eq(schema.accessLog.eventType, "login")
          )
        );

      expect(loginLogs).toHaveLength(1);
    });

    it("should find high risk events", async () => {
      const logs = await ctx.db.select().from(schema.accessLog).where(eq(schema.accessLog.userId, ctx.userId));

      const highRiskLogs = logs.filter((l) => (l.riskScore ?? 0) > 50);
      expect(highRiskLogs).toHaveLength(1);
      expect(highRiskLogs[0].eventType).toBe("challenge_required");
    });
  });

  describe("user isolation", () => {
    it("should isolate logs between users", async () => {
      const [user2] = await ctx.db
        .insert(schema.users)
        .values({
          id: "user_other456",
          email: "other@example.com",
          name: "Other User",
          emailVerified: true,
        })
        .returning();

      await ctx.db.insert(schema.accessLog).values([
        {userId: ctx.userId, eventType: "login"},
        {userId: user2.id, eventType: "login"},
      ]);

      const user1Logs = await ctx.db
        .select()
        .from(schema.accessLog)
        .where(eq(schema.accessLog.userId, ctx.userId));

      const user2Logs = await ctx.db
        .select()
        .from(schema.accessLog)
        .where(eq(schema.accessLog.userId, user2.id));

      expect(user1Logs).toHaveLength(1);
      expect(user2Logs).toHaveLength(1);
    });
  });
});
