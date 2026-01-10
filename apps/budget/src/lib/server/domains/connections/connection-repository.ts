import type {
  AccountConnection,
  AccountConnectionWithAccount,
  ConnectionProvider,
  ConnectionSyncStatus,
  NewAccountConnection,
  NewSyncHistoryRecord,
  SyncHistoryRecord,
  SyncHistoryStatus,
} from "$lib/schema/account-connections";
import { accountConnections, syncHistory, accounts } from "$lib/schema";
import { db } from "$lib/server/db";
import { NotFoundError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp } from "$lib/utils/dates";
import { and, count, desc, eq, isNull, sql } from "drizzle-orm";
import type { ConnectionStats } from "./types";

/**
 * Repository for account connection database operations.
 *
 * Manages the storage of bank connections and sync history.
 */
export class ConnectionRepository {
  // ============================================
  // Account Connection CRUD
  // ============================================

  /**
   * Create a new account connection
   */
  async create(
    data: Omit<NewAccountConnection, "createdAt" | "updatedAt" | "workspaceId">,
    workspaceId: number
  ): Promise<AccountConnection> {
    const now = getCurrentTimestamp();

    const [connection] = await db
      .insert(accountConnections)
      .values({
        ...data,
        workspaceId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!connection) {
      throw new Error("Failed to create account connection");
    }

    return connection;
  }

  /**
   * Find a connection by ID
   */
  async findById(id: number, workspaceId: number): Promise<AccountConnection | null> {
    const [result] = await db
      .select()
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.id, id),
          eq(accountConnections.workspaceId, workspaceId),
          isNull(accountConnections.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find a connection by account ID
   */
  async findByAccountId(accountId: number, workspaceId: number): Promise<AccountConnection | null> {
    const [result] = await db
      .select()
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.accountId, accountId),
          eq(accountConnections.workspaceId, workspaceId),
          isNull(accountConnections.deletedAt)
        )
      )
      .limit(1);

    return result || null;
  }

  /**
   * Find all connections for a workspace
   */
  async findAll(workspaceId: number): Promise<AccountConnection[]> {
    return await db
      .select()
      .from(accountConnections)
      .where(
        and(eq(accountConnections.workspaceId, workspaceId), isNull(accountConnections.deletedAt))
      )
      .orderBy(desc(accountConnections.createdAt));
  }

  /**
   * Find all connections with account details
   */
  async findAllWithAccounts(workspaceId: number): Promise<AccountConnectionWithAccount[]> {
    const results = await db
      .select({
        connection: accountConnections,
        account: {
          id: accounts.id,
          name: accounts.name,
          slug: accounts.slug,
          accountIcon: accounts.accountIcon,
          accountColor: accounts.accountColor,
        },
      })
      .from(accountConnections)
      .innerJoin(accounts, eq(accountConnections.accountId, accounts.id))
      .where(
        and(eq(accountConnections.workspaceId, workspaceId), isNull(accountConnections.deletedAt))
      )
      .orderBy(desc(accountConnections.createdAt));

    return results.map((r) => ({
      ...r.connection,
      account: r.account,
    }));
  }

  /**
   * Find connections by provider
   */
  async findByProvider(
    provider: ConnectionProvider,
    workspaceId: number
  ): Promise<AccountConnection[]> {
    return await db
      .select()
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.provider, provider),
          eq(accountConnections.workspaceId, workspaceId),
          isNull(accountConnections.deletedAt)
        )
      )
      .orderBy(desc(accountConnections.createdAt));
  }

  /**
   * Update a connection's sync status
   */
  async updateSyncStatus(
    id: number,
    status: ConnectionSyncStatus,
    workspaceId: number,
    error?: string
  ): Promise<AccountConnection> {
    const now = getCurrentTimestamp();

    const updateData: Partial<AccountConnection> = {
      syncStatus: status,
      updatedAt: now,
    };

    if (status === "active") {
      updateData.lastSyncAt = now;
      updateData.syncError = null;
    } else if (status === "error" && error) {
      updateData.syncError = error;
    }

    const [updated] = await db
      .update(accountConnections)
      .set(updateData)
      .where(
        and(eq(accountConnections.id, id), eq(accountConnections.workspaceId, workspaceId))
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("AccountConnection", id);
    }

    return updated;
  }

  /**
   * Update connection credentials
   */
  async updateCredentials(
    id: number,
    encryptedCredentials: string,
    workspaceId: number
  ): Promise<AccountConnection> {
    const [updated] = await db
      .update(accountConnections)
      .set({
        encryptedCredentials,
        updatedAt: getCurrentTimestamp(),
      })
      .where(
        and(eq(accountConnections.id, id), eq(accountConnections.workspaceId, workspaceId))
      )
      .returning();

    if (!updated) {
      throw new NotFoundError("AccountConnection", id);
    }

    return updated;
  }

  /**
   * Soft delete a connection
   */
  async softDelete(id: number, workspaceId: number): Promise<void> {
    const existing = await this.findById(id, workspaceId);
    if (!existing) {
      throw new NotFoundError("AccountConnection", id);
    }

    await db
      .update(accountConnections)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(eq(accountConnections.id, id), eq(accountConnections.workspaceId, workspaceId))
      );
  }

  /**
   * Soft delete connection by account ID
   */
  async softDeleteByAccountId(accountId: number, workspaceId: number): Promise<void> {
    await db
      .update(accountConnections)
      .set({ deletedAt: getCurrentTimestamp() })
      .where(
        and(
          eq(accountConnections.accountId, accountId),
          eq(accountConnections.workspaceId, workspaceId),
          isNull(accountConnections.deletedAt)
        )
      );
  }

  // ============================================
  // Sync History Operations
  // ============================================

  /**
   * Create a sync history record
   */
  async createSyncHistory(data: NewSyncHistoryRecord): Promise<SyncHistoryRecord> {
    const [record] = await db.insert(syncHistory).values(data).returning();

    if (!record) {
      throw new Error("Failed to create sync history record");
    }

    return record;
  }

  /**
   * Update a sync history record
   */
  async updateSyncHistory(
    id: number,
    data: Partial<Pick<SyncHistoryRecord, "status" | "completedAt" | "transactionsFetched" | "transactionsImported" | "duplicatesSkipped" | "errorMessage">>
  ): Promise<SyncHistoryRecord> {
    const [updated] = await db
      .update(syncHistory)
      .set(data)
      .where(eq(syncHistory.id, id))
      .returning();

    if (!updated) {
      throw new NotFoundError("SyncHistory", id);
    }

    return updated;
  }

  /**
   * Complete a sync history record
   */
  async completeSyncHistory(
    id: number,
    status: SyncHistoryStatus,
    stats: {
      transactionsFetched: number;
      transactionsImported: number;
      duplicatesSkipped: number;
    },
    errorMessage?: string
  ): Promise<SyncHistoryRecord> {
    return await this.updateSyncHistory(id, {
      status,
      completedAt: getCurrentTimestamp(),
      transactionsFetched: stats.transactionsFetched,
      transactionsImported: stats.transactionsImported,
      duplicatesSkipped: stats.duplicatesSkipped,
      errorMessage,
    });
  }

  /**
   * Get sync history for a connection
   */
  async getSyncHistory(connectionId: number, limit = 20): Promise<SyncHistoryRecord[]> {
    return await db
      .select()
      .from(syncHistory)
      .where(eq(syncHistory.connectionId, connectionId))
      .orderBy(desc(syncHistory.startedAt))
      .limit(limit);
  }

  /**
   * Get connection stats
   */
  async getConnectionStats(connectionId: number): Promise<ConnectionStats> {
    // Total syncs
    const [totalResult] = await db
      .select({ total: count() })
      .from(syncHistory)
      .where(eq(syncHistory.connectionId, connectionId));

    // Successful syncs
    const [successResult] = await db
      .select({ success: count() })
      .from(syncHistory)
      .where(
        and(eq(syncHistory.connectionId, connectionId), eq(syncHistory.status, "success"))
      );

    // Failed syncs
    const [failedResult] = await db
      .select({ failed: count() })
      .from(syncHistory)
      .where(and(eq(syncHistory.connectionId, connectionId), eq(syncHistory.status, "error")));

    // Total transactions imported
    const [transactionsResult] = await db
      .select({ total: sql<number>`COALESCE(SUM(${syncHistory.transactionsImported}), 0)` })
      .from(syncHistory)
      .where(eq(syncHistory.connectionId, connectionId));

    // Last sync info
    const [lastSync] = await db
      .select({
        lastSyncAt: syncHistory.completedAt,
        lastSyncStatus: syncHistory.status,
      })
      .from(syncHistory)
      .where(eq(syncHistory.connectionId, connectionId))
      .orderBy(desc(syncHistory.startedAt))
      .limit(1);

    return {
      totalSyncs: totalResult?.total || 0,
      successfulSyncs: successResult?.success || 0,
      failedSyncs: failedResult?.failed || 0,
      totalTransactionsImported: transactionsResult?.total || 0,
      lastSyncAt: lastSync?.lastSyncAt || null,
      lastSyncStatus: lastSync?.lastSyncStatus || null,
    };
  }

  /**
   * Count active connections in workspace
   */
  async countActiveConnections(workspaceId: number): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.workspaceId, workspaceId),
          eq(accountConnections.syncStatus, "active"),
          isNull(accountConnections.deletedAt)
        )
      );

    return result?.count || 0;
  }

  /**
   * Get connections that need syncing (not synced in last N hours)
   */
  async getConnectionsNeedingSync(
    workspaceId: number,
    hoursThreshold = 24
  ): Promise<AccountConnection[]> {
    const thresholdDate = new Date();
    thresholdDate.setHours(thresholdDate.getHours() - hoursThreshold);
    const thresholdStr = thresholdDate.toISOString();

    return await db
      .select()
      .from(accountConnections)
      .where(
        and(
          eq(accountConnections.workspaceId, workspaceId),
          eq(accountConnections.syncStatus, "active"),
          isNull(accountConnections.deletedAt),
          sql`(${accountConnections.lastSyncAt} IS NULL OR ${accountConnections.lastSyncAt} < ${thresholdStr})`
        )
      );
  }
}
