import type {
  AccountConnection,
  AccountConnectionWithAccount,
  CreateSimplefinConnectionInput,
  CreateTellerConnectionInput,
  ExternalAccount,
  ProviderCredentials,
  SimplefinCredentials,
  TellerCredentials,
} from "$lib/schema/account-connections";
import { ConnectionRepository } from "./connection-repository";
import { encryptCredentials, decryptCredentials } from "./credential-encryption";
import type { ConnectionProviderInterface, ConnectionStats, SyncOptions, SyncResult } from "./types";
import { SimpleFINProvider } from "./providers/simplefin";
import { TellerProvider } from "./providers/teller";
import { ConflictError, NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { getCurrentTimestamp, nowISOString } from "$lib/utils/dates";
import { ImportOrchestrator } from "$lib/server/import/import-orchestrator";
import { logger } from "$lib/server/shared/logging";

/**
 * Connection Service
 *
 * Business logic layer for bank connection management.
 * Handles connection creation, syncing, and provider coordination.
 */
export class ConnectionService {
  private repository: ConnectionRepository;
  private providers: Map<string, ConnectionProviderInterface>;

  constructor() {
    this.repository = new ConnectionRepository();
    this.providers = new Map();

    // Register providers
    this.registerProvider(new SimpleFINProvider());
    this.registerProvider(new TellerProvider());
  }

  private registerProvider(provider: ConnectionProviderInterface): void {
    this.providers.set(provider.id, provider);
  }

  private getProvider(providerId: string): ConnectionProviderInterface {
    const provider = this.providers.get(providerId);
    if (!provider) {
      throw new ValidationError(`Unknown provider: ${providerId}`);
    }
    return provider;
  }

  // ============================================
  // Connection Management
  // ============================================

  /**
   * Create a SimpleFIN connection
   */
  async createSimplefinConnection(
    input: CreateSimplefinConnectionInput,
    workspaceId: number
  ): Promise<AccountConnection> {
    // Check if account already has a connection
    const existing = await this.repository.findByAccountId(input.accountId, workspaceId);
    if (existing) {
      throw new ConflictError("Account already has a bank connection");
    }

    // Validate the access URL by testing the connection
    const provider = this.getProvider("simplefin") as SimpleFINProvider;
    const credentials: SimplefinCredentials = { accessUrl: input.accessUrl };

    const isValid = await provider.testConnection(credentials);
    if (!isValid) {
      throw new ValidationError("Invalid SimpleFIN access URL");
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials, workspaceId);

    // Create the connection
    return await this.repository.create(
      {
        accountId: input.accountId,
        provider: "simplefin",
        externalAccountId: input.externalAccountId,
        institutionName: input.institutionName,
        encryptedCredentials,
        syncStatus: "active",
      },
      workspaceId
    );
  }

  /**
   * Create a Teller connection
   */
  async createTellerConnection(
    input: CreateTellerConnectionInput,
    workspaceId: number
  ): Promise<AccountConnection> {
    // Check if account already has a connection
    const existing = await this.repository.findByAccountId(input.accountId, workspaceId);
    if (existing) {
      throw new ConflictError("Account already has a bank connection");
    }

    // Validate the access token by testing the connection
    const provider = this.getProvider("teller") as TellerProvider;
    const credentials: TellerCredentials = {
      accessToken: input.accessToken,
      enrollmentId: input.enrollmentId,
    };

    const isValid = await provider.testConnection(credentials);
    if (!isValid) {
      throw new ValidationError("Invalid Teller access token");
    }

    // Encrypt credentials
    const encryptedCredentials = encryptCredentials(credentials, workspaceId);

    // Create the connection
    return await this.repository.create(
      {
        accountId: input.accountId,
        provider: "teller",
        externalAccountId: input.externalAccountId,
        institutionName: input.institutionName,
        encryptedCredentials,
        syncStatus: "active",
      },
      workspaceId
    );
  }

  /**
   * Get a connection by ID
   */
  async getConnection(id: number, workspaceId: number): Promise<AccountConnection | null> {
    return await this.repository.findById(id, workspaceId);
  }

  /**
   * Get connection for an account
   */
  async getConnectionForAccount(
    accountId: number,
    workspaceId: number
  ): Promise<AccountConnection | null> {
    return await this.repository.findByAccountId(accountId, workspaceId);
  }

  /**
   * Get all connections for a workspace
   */
  async getAllConnections(workspaceId: number): Promise<AccountConnection[]> {
    return await this.repository.findAll(workspaceId);
  }

  /**
   * Get all connections with account details
   */
  async getAllConnectionsWithAccounts(
    workspaceId: number
  ): Promise<AccountConnectionWithAccount[]> {
    return await this.repository.findAllWithAccounts(workspaceId);
  }

  /**
   * Disconnect (soft delete) a connection
   */
  async disconnect(connectionId: number, workspaceId: number): Promise<void> {
    const connection = await this.repository.findById(connectionId, workspaceId);
    if (!connection) {
      throw new NotFoundError("Connection", connectionId);
    }

    await this.repository.softDelete(connectionId, workspaceId);
  }

  /**
   * Disconnect by account ID
   */
  async disconnectByAccountId(accountId: number, workspaceId: number): Promise<void> {
    await this.repository.softDeleteByAccountId(accountId, workspaceId);
  }

  // ============================================
  // External Account Discovery
  // ============================================

  /**
   * Get available external accounts from SimpleFIN
   */
  async getSimplefinAccounts(accessUrl: string): Promise<ExternalAccount[]> {
    const provider = this.getProvider("simplefin") as SimpleFINProvider;
    return await provider.getAccounts({ accessUrl });
  }

  /**
   * Get available external accounts from Teller
   */
  async getTellerAccounts(accessToken: string, enrollmentId: string): Promise<ExternalAccount[]> {
    const provider = this.getProvider("teller") as TellerProvider;
    return await provider.getAccounts({ accessToken, enrollmentId });
  }

  // ============================================
  // Sync Operations
  // ============================================

  /**
   * Sync a connection (fetch and import transactions)
   */
  async syncConnection(
    connectionId: number,
    workspaceId: number,
    options: SyncOptions = {}
  ): Promise<SyncResult> {
    const connection = await this.repository.findById(connectionId, workspaceId);
    if (!connection) {
      throw new NotFoundError("Connection", connectionId);
    }

    const provider = this.getProvider(connection.provider);

    // Create sync history record
    const syncRecord = await this.repository.createSyncHistory({
      connectionId,
      startedAt: getCurrentTimestamp(),
      status: "running",
    });

    try {
      // Decrypt credentials for provider
      const credentials = decryptCredentials<ProviderCredentials>(connection.encryptedCredentials, workspaceId);

      // Fetch transactions from provider
      const rows = await provider.fetchTransactions(connection, credentials, options.since);

      logger.info("Fetched transactions from bank connection", {
        connectionId,
        provider: connection.provider,
        transactionCount: rows.length,
      });

      // Initialize stats
      const stats = {
        transactionsFetched: rows.length,
        transactionsImported: 0,
        duplicatesSkipped: 0,
      };

      // Run through import pipeline if there are transactions
      if (rows.length > 0) {
        const orchestrator = new ImportOrchestrator();
        const importResult = await orchestrator.processImport(
          connection.accountId,
          rows,
          {
            allowPartialImport: true,
            createMissingPayees: true,
            createMissingCategories: false, // Don't auto-create categories from sync
            skipDuplicates: true,
            fileName: `bank-sync:${connection.provider}:${nowISOString()}`,
          }
        );

        stats.transactionsImported = importResult.transactionsCreated;
        stats.duplicatesSkipped = importResult.summary.totalRows - importResult.transactionsCreated;

        logger.info("Completed bank sync import", {
          connectionId,
          imported: stats.transactionsImported,
          duplicatesSkipped: stats.duplicatesSkipped,
          errors: importResult.errors.length,
        });
      }

      // Update sync history
      await this.repository.completeSyncHistory(syncRecord.id, "success", stats);

      // Update connection status
      await this.repository.updateSyncStatus(connectionId, "active", workspaceId);

      return {
        success: true,
        ...stats,
        errors: [],
        syncHistoryId: syncRecord.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      logger.error("Bank sync failed", {
        connectionId,
        provider: connection.provider,
        error: errorMessage,
      });

      // Update sync history with error
      await this.repository.completeSyncHistory(
        syncRecord.id,
        "error",
        { transactionsFetched: 0, transactionsImported: 0, duplicatesSkipped: 0 },
        errorMessage
      );

      // Update connection status
      await this.repository.updateSyncStatus(connectionId, "error", workspaceId, errorMessage);

      return {
        success: false,
        transactionsFetched: 0,
        transactionsImported: 0,
        duplicatesSkipped: 0,
        errors: [errorMessage],
        syncHistoryId: syncRecord.id,
      };
    }
  }

  /**
   * Sync all connections that need syncing
   */
  async syncAllPending(workspaceId: number, hoursThreshold = 24): Promise<Map<number, SyncResult>> {
    const connections = await this.repository.getConnectionsNeedingSync(
      workspaceId,
      hoursThreshold
    );
    const results = new Map<number, SyncResult>();

    for (const connection of connections) {
      const result = await this.syncConnection(connection.id, workspaceId);
      results.set(connection.id, result);
    }

    return results;
  }

  // ============================================
  // Stats & History
  // ============================================

  /**
   * Get sync history for a connection
   */
  async getSyncHistory(connectionId: number, workspaceId: number, limit = 20) {
    const connection = await this.repository.findById(connectionId, workspaceId);
    if (!connection) {
      throw new NotFoundError("Connection", connectionId);
    }

    return await this.repository.getSyncHistory(connectionId, limit);
  }

  /**
   * Get connection stats
   */
  async getConnectionStats(connectionId: number, workspaceId: number): Promise<ConnectionStats> {
    const connection = await this.repository.findById(connectionId, workspaceId);
    if (!connection) {
      throw new NotFoundError("Connection", connectionId);
    }

    return await this.repository.getConnectionStats(connectionId);
  }

  /**
   * Count active connections in workspace
   */
  async countActiveConnections(workspaceId: number): Promise<number> {
    return await this.repository.countActiveConnections(workspaceId);
  }

  // ============================================
  // Credential Management
  // ============================================

  /**
   * Update connection credentials (for token refresh, etc.)
   */
  async updateCredentials(
    connectionId: number,
    credentials: SimplefinCredentials | TellerCredentials,
    workspaceId: number
  ): Promise<AccountConnection> {
    const connection = await this.repository.findById(connectionId, workspaceId);
    if (!connection) {
      throw new NotFoundError("Connection", connectionId);
    }

    // Test the new credentials
    const provider = this.getProvider(connection.provider);
    const isValid = await provider.testConnection(credentials);
    if (!isValid) {
      throw new ValidationError("Invalid credentials");
    }

    // Encrypt and save
    const encryptedCredentials = encryptCredentials(credentials, workspaceId);
    return await this.repository.updateCredentials(connectionId, encryptedCredentials, workspaceId);
  }
}

// Singleton instance
let connectionServiceInstance: ConnectionService | null = null;

export function getConnectionService(): ConnectionService {
  if (!connectionServiceInstance) {
    connectionServiceInstance = new ConnectionService();
  }
  return connectionServiceInstance;
}
