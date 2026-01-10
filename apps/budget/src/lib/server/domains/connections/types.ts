import type { ImportRow } from "$lib/types/import";
import type {
  AccountConnection,
  ExternalAccount,
  ProviderCredentials,
  SyncHistoryRecord,
} from "$lib/schema/account-connections";

/**
 * Connection provider interface
 *
 * All bank connection providers (SimpleFIN, Teller, etc.) implement this interface
 * to provide a unified way to fetch accounts and transactions.
 */
export interface ConnectionProviderInterface {
  /** Provider identifier */
  readonly id: "simplefin" | "teller";

  /** Human-readable provider name */
  readonly name: string;

  /**
   * Fetch available accounts from the provider.
   * Used during initial setup to let users select which account to link.
   */
  getAccounts(credentials: ProviderCredentials): Promise<ExternalAccount[]>;

  /**
   * Fetch transactions for a connected account.
   * Returns transactions in ImportRow format for the existing import pipeline.
   *
   * @param connection - The account connection
   * @param credentials - Decrypted credentials (service layer handles decryption)
   * @param since - Optional date to fetch transactions from (defaults to 90 days)
   */
  fetchTransactions(
    connection: AccountConnection,
    credentials: ProviderCredentials,
    since?: Date
  ): Promise<ImportRow[]>;

  /**
   * Test if the credentials are valid.
   * Used to verify connection before saving.
   */
  testConnection(credentials: ProviderCredentials): Promise<boolean>;

  /**
   * Decrypt credentials from the stored encrypted format.
   */
  decryptCredentials(encryptedCredentials: string): Promise<ProviderCredentials>;

  /**
   * Encrypt credentials for storage.
   */
  encryptCredentials(credentials: ProviderCredentials): Promise<string>;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  success: boolean;
  transactionsFetched: number;
  transactionsImported: number;
  duplicatesSkipped: number;
  errors: string[];
  syncHistoryId: number;
}

/**
 * Connection with decrypted credentials (for internal use only)
 */
export interface ConnectionWithCredentials extends AccountConnection {
  credentials: ProviderCredentials;
}

/**
 * Stats for a connection
 */
export interface ConnectionStats {
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  totalTransactionsImported: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

/**
 * SimpleFIN API response types
 */
export namespace SimpleFIN {
  export interface AccountsResponse {
    errors: string[];
    accounts: Account[];
  }

  export interface Account {
    id: string;
    name: string;
    currency: string;
    balance: string;
    "available-balance"?: string;
    "balance-date": number; // Unix timestamp
    transactions: Transaction[];
    org: {
      domain?: string;
      "sfin-url"?: string;
      name?: string;
      url?: string;
    };
  }

  export interface Transaction {
    id: string;
    posted: number; // Unix timestamp
    amount: string; // String representation of amount
    description: string;
    payee?: string;
    memo?: string;
    pending?: boolean;
  }
}

/**
 * Teller API response types
 */
export namespace Teller {
  export interface Account {
    id: string;
    name: string;
    type: "depository" | "credit";
    subtype: "checking" | "savings" | "credit_card" | "money_market" | string;
    status: "open" | "closed";
    currency: string;
    institution: {
      id: string;
      name: string;
    };
    enrollment_id: string;
    last_four: string;
  }

  export interface Balance {
    account_id: string;
    ledger: string;
    available: string;
  }

  export interface Transaction {
    id: string;
    account_id: string;
    date: string; // YYYY-MM-DD
    description: string;
    details: {
      category?: string;
      counterparty?: {
        name?: string;
        type?: string;
      };
      processing_status: "pending" | "complete";
    };
    amount: string;
    status: "pending" | "posted";
    type: string;
    running_balance?: string;
  }

  export interface Enrollment {
    id: string;
    institution: {
      id: string;
      name: string;
    };
    access_token: string;
    user_id: string;
  }
}

/**
 * Sync options for controlling sync behavior
 */
export interface SyncOptions {
  /** Only fetch transactions since this date */
  since?: Date;
  /** Skip duplicate detection (for initial sync) */
  skipDuplicateCheck?: boolean;
  /** Force sync even if recently synced */
  force?: boolean;
}

/**
 * Extended sync history with stats
 */
export interface SyncHistoryWithStats extends SyncHistoryRecord {
  duration?: number; // milliseconds
}
