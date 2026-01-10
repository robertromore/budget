import { workspaces } from "$lib/schema";
import {
  DEFAULT_CONNECTION_PROVIDER_PREFERENCES,
  type ConnectionProviderPreferences,
  type WorkspacePreferences,
} from "$lib/schema/workspaces";
import { db } from "$lib/server/db";
import { getConnectionService } from "$lib/server/domains/connections";
import { encryptCredentials, decryptCredentials } from "$lib/server/domains/connections/credential-encryption";
import { publicProcedure, rateLimitedProcedure, t } from "$lib/trpc";
import { withErrorHandler } from "$lib/trpc/shared/errors";
import { eq } from "drizzle-orm";
import { z } from "zod";

const connectionService = getConnectionService();

// Input schemas
const connectionIdSchema = z.object({
  connectionId: z.number().int().positive(),
});

const accountIdSchema = z.object({
  accountId: z.number().int().positive(),
});

const createSimplefinSchema = z.object({
  accountId: z.number().int().positive("Account ID is required"),
  accessUrl: z.string().min(1, "Access URL is required"),
  externalAccountId: z.string().min(1, "External account ID is required"),
  institutionName: z.string().min(1, "Institution name is required"),
});

const createTellerSchema = z.object({
  accountId: z.number().int().positive("Account ID is required"),
  accessToken: z.string().min(1, "Access token is required"),
  enrollmentId: z.string().min(1, "Enrollment ID is required"),
  externalAccountId: z.string().min(1, "External account ID is required"),
  institutionName: z.string().min(1, "Institution name is required"),
});

const getSimplefinAccountsSchema = z.object({
  accessUrl: z.string().min(1, "Access URL is required"),
});

const getTellerAccountsSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
  enrollmentId: z.string().min(1, "Enrollment ID is required"),
});

const syncOptionsSchema = z.object({
  connectionId: z.number().int().positive(),
  since: z.string().datetime().optional(),
  force: z.boolean().optional(),
});

const syncHistorySchema = z.object({
  connectionId: z.number().int().positive(),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export const connectionRoutes = t.router({
  // ============================================
  // Connection Queries
  // ============================================

  /**
   * Get all connections in the workspace
   */
  all: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await connectionService.getAllConnections(ctx.workspaceId);
    })
  ),

  /**
   * Get all connections with account details
   */
  allWithAccounts: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await connectionService.getAllConnectionsWithAccounts(ctx.workspaceId);
    })
  ),

  /**
   * Get a single connection by ID
   */
  get: publicProcedure.input(connectionIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.getConnection(input.connectionId, ctx.workspaceId);
    })
  ),

  /**
   * Get connection for a specific account
   */
  forAccount: publicProcedure.input(accountIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.getConnectionForAccount(input.accountId, ctx.workspaceId);
    })
  ),

  /**
   * Get connection stats
   */
  stats: publicProcedure.input(connectionIdSchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.getConnectionStats(input.connectionId, ctx.workspaceId);
    })
  ),

  /**
   * Get sync history for a connection
   */
  syncHistory: publicProcedure.input(syncHistorySchema).query(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.getSyncHistory(
        input.connectionId,
        ctx.workspaceId,
        input.limit
      );
    })
  ),

  /**
   * Count active connections in workspace
   */
  countActive: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      return await connectionService.countActiveConnections(ctx.workspaceId);
    })
  ),

  // ============================================
  // External Account Discovery
  // ============================================

  /**
   * Get available accounts from SimpleFIN
   */
  getSimplefinAccounts: rateLimitedProcedure.input(getSimplefinAccountsSchema).mutation(
    withErrorHandler(async ({ input }) => {
      return await connectionService.getSimplefinAccounts(input.accessUrl);
    })
  ),

  /**
   * Get available accounts from Teller
   */
  getTellerAccounts: rateLimitedProcedure.input(getTellerAccountsSchema).mutation(
    withErrorHandler(async ({ input }) => {
      return await connectionService.getTellerAccounts(input.accessToken, input.enrollmentId);
    })
  ),

  // ============================================
  // Connection Creation
  // ============================================

  /**
   * Create a SimpleFIN connection
   */
  createSimplefin: rateLimitedProcedure.input(createSimplefinSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.createSimplefinConnection(input, ctx.workspaceId);
    })
  ),

  /**
   * Create a Teller connection
   */
  createTeller: rateLimitedProcedure.input(createTellerSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.createTellerConnection(input, ctx.workspaceId);
    })
  ),

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Sync a connection (fetch and import transactions)
   */
  sync: rateLimitedProcedure.input(syncOptionsSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      return await connectionService.syncConnection(
        input.connectionId,
        ctx.workspaceId,
        {
          since: input.since ? new Date(input.since) : undefined,
          force: input.force,
        }
      );
    })
  ),

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Disconnect (remove) a connection
   */
  disconnect: rateLimitedProcedure.input(connectionIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await connectionService.disconnect(input.connectionId, ctx.workspaceId);
      return { success: true };
    })
  ),

  /**
   * Disconnect by account ID
   */
  disconnectByAccount: rateLimitedProcedure.input(accountIdSchema).mutation(
    withErrorHandler(async ({ input, ctx }) => {
      await connectionService.disconnectByAccountId(input.accountId, ctx.workspaceId);
      return { success: true };
    })
  ),

  // ============================================
  // Provider Settings
  // ============================================

  /**
   * Get connection provider settings
   */
  getProviderSettings: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      if (!workspace) {
        return DEFAULT_CONNECTION_PROVIDER_PREFERENCES;
      }

      const prefs: WorkspacePreferences = workspace.preferences
        ? JSON.parse(workspace.preferences)
        : {};

      const connectionPrefs = prefs.connectionProviders ?? DEFAULT_CONNECTION_PROVIDER_PREFERENCES;

      // Don't expose encrypted URL to client, just indicate if it's set
      return {
        ...connectionPrefs,
        simplefin: {
          ...connectionPrefs.simplefin,
          hasAccessUrl: !!connectionPrefs.simplefin.encryptedAccessUrl,
          encryptedAccessUrl: undefined, // Never send to client
        },
      };
    })
  ),

  /**
   * Update Teller provider settings
   */
  updateTellerSettings: rateLimitedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        applicationId: z.string().optional(),
        environment: z.enum(["sandbox", "development", "production"]),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs: WorkspacePreferences = workspace?.preferences
          ? JSON.parse(workspace.preferences)
          : {};

        const connectionPrefs = currentPrefs.connectionProviders ?? DEFAULT_CONNECTION_PROVIDER_PREFERENCES;

        // Update Teller settings
        const updatedPrefs: WorkspacePreferences = {
          ...currentPrefs,
          connectionProviders: {
            ...connectionPrefs,
            teller: {
              enabled: input.enabled,
              applicationId: input.applicationId,
              environment: input.environment,
            },
          },
        };

        await db
          .update(workspaces)
          .set({ preferences: JSON.stringify(updatedPrefs) })
          .where(eq(workspaces.id, ctx.workspaceId));

        return { success: true };
      })
    ),

  /**
   * Update SimpleFIN provider settings
   */
  updateSimplefinSettings: rateLimitedProcedure
    .input(
      z.object({
        accessUrl: z.string().optional(),
        clearAccessUrl: z.boolean().optional(),
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs: WorkspacePreferences = workspace?.preferences
          ? JSON.parse(workspace.preferences)
          : {};

        const connectionPrefs = currentPrefs.connectionProviders ?? DEFAULT_CONNECTION_PROVIDER_PREFERENCES;

        // Handle access URL encryption
        let encryptedAccessUrl = connectionPrefs.simplefin.encryptedAccessUrl;

        if (input.clearAccessUrl) {
          encryptedAccessUrl = undefined;
        } else if (input.accessUrl) {
          // Encrypt the new access URL
          encryptedAccessUrl = encryptCredentials({ accessUrl: input.accessUrl }, ctx.workspaceId);
        }

        // Update SimpleFIN settings
        const updatedPrefs: WorkspacePreferences = {
          ...currentPrefs,
          connectionProviders: {
            ...connectionPrefs,
            simplefin: {
              ...connectionPrefs.simplefin,
              enabled: true,
              encryptedAccessUrl,
            },
          },
        };

        await db
          .update(workspaces)
          .set({ preferences: JSON.stringify(updatedPrefs) })
          .where(eq(workspaces.id, ctx.workspaceId));

        return { success: true, hasAccessUrl: !!encryptedAccessUrl };
      })
    ),

  /**
   * Get decrypted SimpleFIN access URL (for internal use during connection)
   */
  getSimplefinAccessUrl: publicProcedure.query(
    withErrorHandler(async ({ ctx }) => {
      const [workspace] = await db
        .select({ preferences: workspaces.preferences })
        .from(workspaces)
        .where(eq(workspaces.id, ctx.workspaceId))
        .limit(1);

      if (!workspace?.preferences) {
        return { accessUrl: null };
      }

      const prefs: WorkspacePreferences = JSON.parse(workspace.preferences);
      const encryptedUrl = prefs.connectionProviders?.simplefin?.encryptedAccessUrl;

      if (!encryptedUrl) {
        return { accessUrl: null };
      }

      try {
        const decrypted = decryptCredentials<{ accessUrl: string }>(encryptedUrl, ctx.workspaceId);
        return { accessUrl: decrypted.accessUrl };
      } catch {
        return { accessUrl: null };
      }
    })
  ),

  /**
   * Update auto-sync settings
   */
  updateAutoSyncSettings: rateLimitedProcedure
    .input(
      z.object({
        enabled: z.boolean(),
        intervalHours: z.number().int().min(1).max(168), // 1 hour to 1 week
      })
    )
    .mutation(
      withErrorHandler(async ({ input, ctx }) => {
        // Get current preferences
        const [workspace] = await db
          .select({ preferences: workspaces.preferences })
          .from(workspaces)
          .where(eq(workspaces.id, ctx.workspaceId))
          .limit(1);

        const currentPrefs: WorkspacePreferences = workspace?.preferences
          ? JSON.parse(workspace.preferences)
          : {};

        const connectionPrefs = currentPrefs.connectionProviders ?? DEFAULT_CONNECTION_PROVIDER_PREFERENCES;

        // Update auto-sync settings
        const updatedPrefs: WorkspacePreferences = {
          ...currentPrefs,
          connectionProviders: {
            ...connectionPrefs,
            autoSync: {
              enabled: input.enabled,
              intervalHours: input.intervalHours,
            },
          },
        };

        await db
          .update(workspaces)
          .set({ preferences: JSON.stringify(updatedPrefs) })
          .where(eq(workspaces.id, ctx.workspaceId));

        return { success: true };
      })
    ),
});
