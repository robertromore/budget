/**
 * Security Settings tRPC Routes
 *
 * Handles encryption key management, trusted devices, and security settings.
 */

import { z } from "zod/v4";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, t, secureOperationProcedure } from "$lib/trpc";
import { db } from "$lib/server/db";
import {
  generateEncryptionKey,
  storeEncryptionKey,
  getEncryptionKey,
  rotateEncryptionKey,
  unlockDek,
  maskUserKey,
} from "$lib/server/shared/security/key-management";
import {
  calculateRiskScore,
  getTrustedDevices,
  trustDevice,
  revokeDeviceTrust,
  type LoginContext,
} from "$lib/server/shared/security/risk-assessment";
import {
  getEncryptionLevelOptions,
  getEncryptionLevelName,
  validateLevelChange,
  resolveEncryptionContext,
} from "$lib/server/shared/security/encryption-levels";
import type { EncryptionLevel } from "$lib/types/encryption";
import { DEFAULT_USER_ENCRYPTION_PREFERENCES } from "$lib/schema/users";
import { DEFAULT_ENCRYPTION_PREFERENCES, workspaces } from "$lib/schema/workspaces";
import { users } from "$lib/schema/users";
import { accounts } from "$lib/schema/accounts";
import { eq } from "drizzle-orm";

// Validation schemas
const encryptionKeyTypeSchema = z.enum(["token", "passphrase", "keypair"]);
const encryptionLevelSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(4),
]);

const riskFactorSettingsSchema = z.object({
  ip: z.boolean(),
  location: z.boolean(),
  device: z.boolean(),
  timePattern: z.boolean(),
});

export const securityRoutes = t.router({
  /**
   * Get encryption level options for UI display
   */
  getEncryptionLevelOptions: publicProcedure.query(() => {
    return getEncryptionLevelOptions();
  }),

  /**
   * Get current user's encryption preferences
   */
  getUserEncryptionPreferences: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;

    const user = await db.select().from(users).where(eq(users.id, userId)).get();
    if (!user) {
      throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
    }

    const preferences = user.preferences ? JSON.parse(user.preferences) : {};
    return {
      encryption: preferences.encryption ?? DEFAULT_USER_ENCRYPTION_PREFERENCES,
      hasEncryptionKey: !!(await getEncryptionKey(db, "user", userId)),
    };
  }),

  /**
   * Update user's encryption preferences
   */
  updateUserEncryptionPreferences: secureOperationProcedure
    .input(
      z.object({
        defaultLevel: encryptionLevelSchema,
        riskFactorsEnabled: z.boolean(),
        riskFactors: riskFactorSettingsSchema.optional(),
        challengeThreshold: z.number().min(0).max(100).optional(),
        keyStoragePreference: z.enum(["never", "session", "device"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const currentPreferences = user.preferences ? JSON.parse(user.preferences) : {};
      const currentEncryption = currentPreferences.encryption ?? DEFAULT_USER_ENCRYPTION_PREFERENCES;

      const updatedPreferences = {
        ...currentPreferences,
        encryption: {
          ...currentEncryption,
          defaultLevel: input.defaultLevel,
          riskFactorsEnabled: input.riskFactorsEnabled,
          riskFactors: input.riskFactors ?? currentEncryption.riskFactors,
          challengeThreshold: input.challengeThreshold ?? currentEncryption.challengeThreshold,
          keyStoragePreference: input.keyStoragePreference ?? currentEncryption.keyStoragePreference,
        },
      };

      await db
        .update(users)
        .set({
          preferences: JSON.stringify(updatedPreferences),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return { success: true };
    }),

  /**
   * Generate a new encryption key for user
   */
  generateUserEncryptionKey: secureOperationProcedure
    .input(
      z.object({
        keyType: encryptionKeyTypeSchema,
        passphrase: z.string().min(12).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      if (input.keyType === "passphrase" && !input.passphrase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Passphrase is required for passphrase key type",
        });
      }

      // Check if user already has a key
      const existingKey = await getEncryptionKey(db, "user", userId);
      if (existingKey) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "User already has an encryption key. Use key rotation to change it.",
        });
      }

      // Generate the key
      const generatedKey = generateEncryptionKey(input.keyType, input.passphrase);

      // Store the key
      await storeEncryptionKey(db, "user", userId, generatedKey);

      // Update user preferences with key type
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      const currentPreferences = user?.preferences ? JSON.parse(user.preferences) : {};
      const updatedPreferences = {
        ...currentPreferences,
        encryption: {
          ...currentPreferences.encryption,
          keyType: input.keyType,
        },
      };

      await db
        .update(users)
        .set({
          preferences: JSON.stringify(updatedPreferences),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      return {
        success: true,
        userKey: generatedKey.userKey,
        keyType: generatedKey.keyType,
        maskedKey: maskUserKey(generatedKey.userKey, generatedKey.keyType),
        message: "Save this key securely. If you lose it, your encrypted data cannot be recovered.",
      };
    }),

  /**
   * Verify user's encryption key
   */
  verifyEncryptionKey: protectedProcedure
    .input(
      z.object({
        userKey: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      const storedKey = await getEncryptionKey(db, "user", userId);
      if (!storedKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encryption key found for user",
        });
      }

      try {
        unlockDek(
          input.userKey,
          storedKey.keyType,
          storedKey.encryptedDek,
          storedKey.keyDerivationParams,
          storedKey.keyVerificationHash
        );

        return {
          success: true,
          keyType: storedKey.keyType,
          keyVersion: storedKey.keyVersion,
        };
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid encryption key",
        });
      }
    }),

  /**
   * Unlock encryption key and get DEK for decryption.
   * Returns the DEK (Data Encryption Key) that can be used to decrypt data.
   * This is used by the client-side unlock flow to cache the DEK.
   */
  unlockEncryptionKey: protectedProcedure
    .input(
      z.object({
        userKey: z.string().min(1),
        targetType: z.enum(["user", "workspace", "account"]).default("user"),
        targetId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const targetId = input.targetId ?? userId;

      const storedKey = await getEncryptionKey(db, input.targetType, targetId);
      if (!storedKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encryption key found",
        });
      }

      try {
        // Verify and unlock DEK
        const dek = unlockDek(
          input.userKey,
          storedKey.keyType,
          storedKey.encryptedDek,
          storedKey.keyDerivationParams,
          storedKey.keyVerificationHash
        );

        // TODO: Update last used timestamp if we add that field

        return {
          success: true,
          dek: dek.toString("hex"),
          keyType: storedKey.keyType,
          keyVersion: storedKey.keyVersion,
        };
      } catch {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid encryption key",
        });
      }
    }),

  /**
   * Rotate user's encryption key
   */
  rotateUserEncryptionKey: secureOperationProcedure
    .input(
      z.object({
        oldUserKey: z.string(),
        newKeyType: encryptionKeyTypeSchema,
        newPassphrase: z.string().min(12).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const storedKey = await getEncryptionKey(db, "user", userId);
      if (!storedKey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encryption key found to rotate",
        });
      }

      if (input.newKeyType === "passphrase" && !input.newPassphrase) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "New passphrase is required for passphrase key type",
        });
      }

      try {
        const newKey = await rotateEncryptionKey(
          db,
          storedKey.id,
          input.oldUserKey,
          input.newKeyType,
          input.newPassphrase
        );

        return {
          success: true,
          userKey: newKey.userKey,
          keyType: newKey.keyType,
          maskedKey: maskUserKey(newKey.userKey, newKey.keyType),
          message: "Key rotated successfully. Save your new key securely.",
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("verification failed")) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid old encryption key",
          });
        }
        throw error;
      }
    }),

  /**
   * Get workspace encryption settings
   */
  getWorkspaceEncryptionSettings: protectedProcedure
    .input(z.object({ workspaceId: z.number() }))
    .query(async ({ input }) => {
      const workspace = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .get();

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const preferences = workspace.preferences ? JSON.parse(workspace.preferences) : {};
      return {
        encryption: preferences.encryption ?? DEFAULT_ENCRYPTION_PREFERENCES,
        hasEncryptionKey: !!(await getEncryptionKey(db, "workspace", String(input.workspaceId))),
      };
    }),

  /**
   * Update workspace encryption settings
   */
  updateWorkspaceEncryptionSettings: secureOperationProcedure
    .input(
      z.object({
        workspaceId: z.number(),
        level: z.union([encryptionLevelSchema, z.literal("inherit")]),
        riskFactors: riskFactorSettingsSchema.optional(),
        challengeThreshold: z.number().min(0).max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const workspace = await db
        .select()
        .from(workspaces)
        .where(eq(workspaces.id, input.workspaceId))
        .get();

      if (!workspace) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Workspace not found" });
      }

      const currentPreferences = workspace.preferences ? JSON.parse(workspace.preferences) : {};
      const currentEncryption = currentPreferences.encryption ?? DEFAULT_ENCRYPTION_PREFERENCES;

      // Validate level change if it's an explicit level
      if (input.level !== "inherit" && currentEncryption.level !== "inherit") {
        const validation = validateLevelChange(
          currentEncryption.level as EncryptionLevel,
          input.level,
          "workspace"
        );
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.reason,
          });
        }
      }

      const updatedPreferences = {
        ...currentPreferences,
        encryption: {
          ...currentEncryption,
          level: input.level,
          riskFactors: input.riskFactors ?? currentEncryption.riskFactors,
          challengeThreshold: input.challengeThreshold ?? currentEncryption.challengeThreshold,
        },
      };

      await db
        .update(workspaces)
        .set({
          preferences: JSON.stringify(updatedPreferences),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(workspaces.id, input.workspaceId));

      return { success: true };
    }),

  /**
   * Get account encryption settings
   */
  getAccountEncryptionSettings: protectedProcedure
    .input(z.object({ accountId: z.number() }))
    .query(async ({ input }) => {
      const account = await db
        .select({
          encryptionLevel: accounts.encryptionLevel,
          encryptionKeyId: accounts.encryptionKeyId,
        })
        .from(accounts)
        .where(eq(accounts.id, input.accountId))
        .get();

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      return {
        encryptionLevel: account.encryptionLevel ?? "inherit",
        hasEncryptionKey: !!account.encryptionKeyId,
      };
    }),

  /**
   * Update account encryption settings
   */
  updateAccountEncryptionSettings: secureOperationProcedure
    .input(
      z.object({
        accountId: z.number(),
        encryptionLevel: z.enum(["inherit", "0", "1", "2", "3", "4"]),
      })
    )
    .mutation(async ({ input }) => {
      const account = await db
        .select()
        .from(accounts)
        .where(eq(accounts.id, input.accountId))
        .get();

      if (!account) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Account not found" });
      }

      // Validate that account level only increases (security constraint)
      if (input.encryptionLevel !== "inherit" && account.encryptionLevel !== "inherit") {
        const newLevel = parseInt(input.encryptionLevel, 10) as EncryptionLevel;
        const currentLevel = parseInt(account.encryptionLevel ?? "0", 10) as EncryptionLevel;

        const validation = validateLevelChange(currentLevel, newLevel, "account");
        if (!validation.valid) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: validation.reason,
          });
        }
      }

      await db
        .update(accounts)
        .set({
          encryptionLevel: input.encryptionLevel,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(accounts.id, input.accountId));

      return { success: true };
    }),

  /**
   * Get trusted devices for current user
   */
  getTrustedDevices: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    return getTrustedDevices(db, userId);
  }),

  /**
   * Trust current device
   */
  trustCurrentDevice: protectedProcedure
    .input(
      z.object({
        deviceFingerprint: z.string(),
        label: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      await trustDevice(db, userId, input.deviceFingerprint, input.label);
      return { success: true };
    }),

  /**
   * Revoke trust for a device
   */
  revokeDeviceTrust: secureOperationProcedure
    .input(z.object({ deviceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const success = await revokeDeviceTrust(db, userId, input.deviceId);

      if (!success) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Device not found or already revoked",
        });
      }

      return { success: true };
    }),

  /**
   * Calculate risk score for current session (for display)
   */
  getCurrentRiskScore: protectedProcedure
    .input(
      z.object({
        ipAddress: z.string(),
        userAgent: z.string(),
        geoLocation: z.string().optional(),
        deviceFingerprint: z.string().optional(),
        localHour: z.number().min(0).max(23).optional(),
        dayOfWeek: z.number().min(0).max(6).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get user's risk factor settings
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      const preferences = user?.preferences ? JSON.parse(user.preferences) : {};
      const riskFactorSettings = preferences.encryption?.riskFactors;

      const loginContext: LoginContext = {
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        geoLocation: input.geoLocation,
        deviceFingerprint: input.deviceFingerprint,
        localHour: input.localHour,
        dayOfWeek: input.dayOfWeek,
      };

      const riskScore = await calculateRiskScore(db, userId, loginContext, riskFactorSettings);

      return riskScore;
    }),

  /**
   * Get effective encryption level for a given context
   */
  getEffectiveEncryptionLevel: protectedProcedure
    .input(
      z.object({
        workspaceId: z.number().optional(),
        accountId: z.number().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;

      // Get user preferences
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      const userPreferences = user?.preferences ? JSON.parse(user.preferences) : {};

      // Get workspace preferences if specified
      let workspacePreferences;
      if (input.workspaceId) {
        const workspace = await db
          .select()
          .from(workspaces)
          .where(eq(workspaces.id, input.workspaceId))
          .get();
        workspacePreferences = workspace?.preferences ? JSON.parse(workspace.preferences) : {};
      }

      // Get account encryption level if specified
      let accountEncryptionLevel;
      if (input.accountId) {
        const account = await db
          .select({ encryptionLevel: accounts.encryptionLevel })
          .from(accounts)
          .where(eq(accounts.id, input.accountId))
          .get();
        accountEncryptionLevel = account?.encryptionLevel;
      }

      const resolved = resolveEncryptionContext({
        userPreferences,
        workspacePreferences,
        accountEncryptionLevel,
      });

      return {
        level: resolved.level,
        levelName: getEncryptionLevelName(resolved.level),
        source: resolved.source,
        features: resolved.features,
        warnings: resolved.warnings,
        requiresKey: resolved.requiresKey,
      };
    }),
});
