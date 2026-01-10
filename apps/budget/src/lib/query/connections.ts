import type {
  AccountConnection,
  AccountConnectionWithAccount,
  ExternalAccount,
  SyncHistoryRecord,
} from "$lib/schema/account-connections";
import type { ConnectionStats, SyncResult } from "$lib/server/domains/connections";
import { trpc } from "$lib/trpc/client";
import { queryClient, queryPresets } from "./_client";
import { createQueryKeys, defineMutation, defineQuery } from "./_factory";

// Query keys
export const connectionKeys = createQueryKeys("connections", {
  all: () => ["connections", "all"] as const,
  lists: () => ["connections", "list"] as const,
  list: () => ["connections", "list"] as const,
  details: () => ["connections", "detail"] as const,
  detail: (id: number) => ["connections", "detail", id] as const,
  forAccount: (accountId: number) => ["connections", "forAccount", accountId] as const,
  stats: (id: number) => ["connections", "stats", id] as const,
  syncHistory: (id: number) => ["connections", "syncHistory", id] as const,
  countActive: () => ["connections", "countActive"] as const,
});

// ============================================
// Queries
// ============================================

/**
 * List all connections in the workspace
 */
export const listConnections = () =>
  defineQuery<AccountConnection[]>({
    queryKey: connectionKeys.list(),
    queryFn: async () => {
      return await trpc().connectionRoutes.all.query();
    },
    options: {
      ...queryPresets.static,
    },
  });

/**
 * List all connections with account details
 */
export const listConnectionsWithAccounts = () =>
  defineQuery<AccountConnectionWithAccount[]>({
    queryKey: connectionKeys.all(),
    queryFn: async () => {
      return await trpc().connectionRoutes.allWithAccounts.query();
    },
    options: {
      ...queryPresets.static,
    },
  });

/**
 * Get a single connection by ID
 */
export const getConnection = (connectionId: number) =>
  defineQuery<AccountConnection | null>({
    queryKey: connectionKeys.detail(connectionId),
    queryFn: async () => {
      return await trpc().connectionRoutes.get.query({ connectionId });
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

/**
 * Get connection for a specific account
 */
export const getConnectionForAccount = (accountId: number) =>
  defineQuery<AccountConnection | null>({
    queryKey: connectionKeys.forAccount(accountId),
    queryFn: async () => {
      return await trpc().connectionRoutes.forAccount.query({ accountId });
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });

/**
 * Get connection stats
 */
export const getConnectionStats = (connectionId: number) =>
  defineQuery<ConnectionStats>({
    queryKey: connectionKeys.stats(connectionId),
    queryFn: async () => {
      return await trpc().connectionRoutes.stats.query({ connectionId });
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

/**
 * Get sync history for a connection
 */
export const getConnectionSyncHistory = (connectionId: number, limit = 20) =>
  defineQuery<SyncHistoryRecord[]>({
    queryKey: connectionKeys.syncHistory(connectionId),
    queryFn: async () => {
      return await trpc().connectionRoutes.syncHistory.query({ connectionId, limit });
    },
    options: {
      staleTime: 30 * 1000, // 30 seconds
    },
  });

/**
 * Count active connections
 */
export const countActiveConnections = () =>
  defineQuery<number>({
    queryKey: connectionKeys.countActive(),
    queryFn: async () => {
      return await trpc().connectionRoutes.countActive.query();
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

// ============================================
// External Account Discovery
// ============================================

/**
 * Get available accounts from SimpleFIN
 */
export const getSimplefinAccounts = defineMutation<{ accessUrl: string }, ExternalAccount[]>({
  mutationFn: (data) => trpc().connectionRoutes.getSimplefinAccounts.mutate(data),
  errorMessage: "Failed to fetch SimpleFIN accounts",
});

/**
 * Get available accounts from Teller
 */
export const getTellerAccounts = defineMutation<
  { accessToken: string; enrollmentId: string },
  ExternalAccount[]
>({
  mutationFn: (data) => trpc().connectionRoutes.getTellerAccounts.mutate(data),
  errorMessage: "Failed to fetch Teller accounts",
});

// ============================================
// Connection Management Mutations
// ============================================

/**
 * Create a SimpleFIN connection
 */
export const createSimplefinConnection = defineMutation<
  {
    accountId: number;
    accessUrl: string;
    externalAccountId: string;
    institutionName: string;
  },
  AccountConnection
>({
  mutationFn: (data) => trpc().connectionRoutes.createSimplefin.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: connectionKeys.list() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(variables.accountId) }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.countActive() }),
    ]);
  },
  successMessage: "Bank account connected via SimpleFIN",
  errorMessage: "Failed to connect bank account",
});

/**
 * Create a Teller connection
 */
export const createTellerConnection = defineMutation<
  {
    accountId: number;
    accessToken: string;
    enrollmentId: string;
    externalAccountId: string;
    institutionName: string;
  },
  AccountConnection
>({
  mutationFn: (data) => trpc().connectionRoutes.createTeller.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: connectionKeys.list() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(variables.accountId) }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.countActive() }),
    ]);
  },
  successMessage: "Bank account connected via Teller",
  errorMessage: "Failed to connect bank account",
});

/**
 * Sync a connection (fetch transactions)
 */
export const syncConnection = defineMutation<
  { connectionId: number; since?: string; force?: boolean },
  SyncResult
>({
  mutationFn: (data) => trpc().connectionRoutes.sync.mutate(data),
  onSuccess: async (_data, variables) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: connectionKeys.detail(variables.connectionId) }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.stats(variables.connectionId) }),
      queryClient.invalidateQueries({
        queryKey: connectionKeys.syncHistory(variables.connectionId),
      }),
    ]);
  },
  successMessage: "Sync completed",
  errorMessage: "Sync failed",
});

/**
 * Disconnect a connection
 */
export const disconnectConnection = defineMutation<number, { success: boolean }>({
  mutationFn: (connectionId) => trpc().connectionRoutes.disconnect.mutate({ connectionId }),
  onSuccess: async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: connectionKeys.list() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.countActive() }),
    ]);
  },
  successMessage: "Bank account disconnected",
  errorMessage: "Failed to disconnect bank account",
});

/**
 * Disconnect by account ID
 */
export const disconnectConnectionByAccount = defineMutation<number, { success: boolean }>({
  mutationFn: (accountId) => trpc().connectionRoutes.disconnectByAccount.mutate({ accountId }),
  onSuccess: async (_data, accountId) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: connectionKeys.list() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.all() }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.forAccount(accountId) }),
      queryClient.invalidateQueries({ queryKey: connectionKeys.countActive() }),
    ]);
  },
  successMessage: "Bank account disconnected",
  errorMessage: "Failed to disconnect bank account",
});

// ============================================
// Provider Settings
// ============================================

/**
 * Provider settings query keys
 */
export const providerSettingsKeys = {
  all: () => ["connections", "providerSettings"] as const,
};

/**
 * Get connection provider settings
 */
export const getProviderSettings = () =>
  defineQuery<import("$lib/schema/workspaces").ConnectionProviderPreferences>({
    queryKey: providerSettingsKeys.all(),
    queryFn: async () => {
      return await trpc().connectionRoutes.getProviderSettings.query();
    },
    options: {
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  });

/**
 * Update Teller provider settings
 */
export const updateTellerSettings = defineMutation<
  { enabled: boolean; applicationId?: string; environment: "sandbox" | "development" | "production" },
  { success: boolean }
>({
  mutationFn: (data) => trpc().connectionRoutes.updateTellerSettings.mutate(data),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: providerSettingsKeys.all() });
  },
  successMessage: "Teller settings updated",
  errorMessage: "Failed to update Teller settings",
});

/**
 * Update auto-sync settings
 */
export const updateAutoSyncSettings = defineMutation<
  { enabled: boolean; intervalHours: number },
  { success: boolean }
>({
  mutationFn: (data) => trpc().connectionRoutes.updateAutoSyncSettings.mutate(data),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: providerSettingsKeys.all() });
  },
  successMessage: "Auto-sync settings updated",
  errorMessage: "Failed to update auto-sync settings",
});

/**
 * Update SimpleFIN provider settings
 */
export const updateSimplefinSettings = defineMutation<
  { accessUrl?: string; clearAccessUrl?: boolean },
  { success: boolean; hasAccessUrl: boolean }
>({
  mutationFn: (data) => trpc().connectionRoutes.updateSimplefinSettings.mutate(data),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: providerSettingsKeys.all() });
  },
  successMessage: "SimpleFIN settings updated",
  errorMessage: "Failed to update SimpleFIN settings",
});

/**
 * Get shared SimpleFIN access URL (for use during connection)
 */
export const getSimplefinAccessUrl = () =>
  defineQuery<{ accessUrl: string | null }>({
    queryKey: [...providerSettingsKeys.all(), "simplefinUrl"] as const,
    queryFn: async () => {
      return await trpc().connectionRoutes.getSimplefinAccessUrl.query();
    },
    options: {
      staleTime: 60 * 1000, // 1 minute
    },
  });
