import type { AccountConnection, ExternalAccount, ProviderCredentials, TellerCredentials } from "$lib/schema/account-connections";
import type { ImportRow } from "$lib/types/import";
import type { ConnectionProviderInterface, Teller } from "../types";
import { env } from "$env/dynamic/private";

/**
 * Teller Provider
 *
 * Integrates with Teller API to fetch account data from 7,000+ US financial institutions.
 * Teller provides official bank API connections (not screen scraping).
 *
 * API Documentation: https://teller.io/docs/api
 *
 * Requires:
 * - TELLER_APPLICATION_ID in environment
 * - TELLER_ENVIRONMENT: 'sandbox' | 'development' | 'production'
 */
export class TellerProvider implements ConnectionProviderInterface {
  readonly id = "teller" as const;
  readonly name = "Teller";

  private baseUrl = "https://api.teller.io";

  /**
   * Fetch available accounts from Teller
   */
  async getAccounts(credentials: ProviderCredentials): Promise<ExternalAccount[]> {
    const { accessToken } = credentials as TellerCredentials;
    const accounts = await this.fetchTellerAccounts(accessToken);

    return accounts.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.institution.name,
      type: this.mapAccountType(account.type, account.subtype),
      currency: account.currency,
    }));
  }

  /**
   * Fetch transactions for a connected account
   */
  async fetchTransactions(
    connection: AccountConnection,
    credentials: ProviderCredentials,
    since?: Date
  ): Promise<ImportRow[]> {
    const { accessToken } = credentials as TellerCredentials;

    // Fetch transactions with pagination
    let transactions: Teller.Transaction[] = [];
    let cursor: string | undefined;
    const maxPages = 10; // Safety limit

    for (let page = 0; page < maxPages; page++) {
      const { data, nextCursor } = await this.fetchTransactionPage(
        accessToken,
        connection.externalAccountId,
        cursor
      );

      transactions = transactions.concat(data);

      // Check if we've gone past the since date
      if (since && data.length > 0) {
        const oldestDate = new Date(data[data.length - 1].date);
        if (oldestDate < since) {
          // Filter out transactions before since date
          transactions = transactions.filter((tx) => new Date(tx.date) >= since);
          break;
        }
      }

      // No more pages
      if (!nextCursor) break;
      cursor = nextCursor;
    }

    // Map to ImportRow format
    return transactions.map((tx, index) => this.mapTransaction(tx, index));
  }

  /**
   * Test if the access token is valid
   */
  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    try {
      const { accessToken } = credentials as TellerCredentials;
      const accounts = await this.fetchTellerAccounts(accessToken);
      return accounts.length >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Decrypt credentials from stored format
   */
  async decryptCredentials(encryptedCredentials: string): Promise<TellerCredentials> {
    throw new Error("Use service layer for credential decryption");
  }

  /**
   * Encrypt credentials for storage
   */
  async encryptCredentials(credentials: ProviderCredentials): Promise<string> {
    throw new Error("Use service layer for credential encryption");
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Make authenticated request to Teller API
   */
  private async tellerRequest<T>(
    accessToken: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    // Teller uses HTTP Basic Auth with access token as username
    const authHeader = Buffer.from(`${accessToken}:`).toString("base64");

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Basic ${authHeader}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid or expired Teller access token");
      }
      if (response.status === 403) {
        throw new Error("Teller access token does not have permission for this resource");
      }
      throw new Error(`Teller API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Fetch accounts from Teller
   */
  private async fetchTellerAccounts(accessToken: string): Promise<Teller.Account[]> {
    return await this.tellerRequest<Teller.Account[]>(accessToken, "/accounts");
  }

  /**
   * Fetch a page of transactions
   */
  private async fetchTransactionPage(
    accessToken: string,
    accountId: string,
    cursor?: string
  ): Promise<{ data: Teller.Transaction[]; nextCursor?: string }> {
    let endpoint = `/accounts/${accountId}/transactions`;
    if (cursor) {
      endpoint += `?from_id=${cursor}`;
    }

    const transactions = await this.tellerRequest<Teller.Transaction[]>(accessToken, endpoint);

    // Teller returns transactions newest first
    // The cursor for next page is the ID of the oldest transaction
    const nextCursor = transactions.length > 0 ? transactions[transactions.length - 1].id : undefined;

    return {
      data: transactions,
      nextCursor: transactions.length === 100 ? nextCursor : undefined, // Teller page size is 100
    };
  }

  /**
   * Map a Teller transaction to ImportRow format
   */
  private mapTransaction(tx: Teller.Transaction, index: number): ImportRow {
    // Parse amount (Teller provides as string, negative for debits)
    const amount = parseFloat(tx.amount);

    // Get payee from counterparty or description
    const payee = tx.details.counterparty?.name || tx.description;

    return {
      rowIndex: index,
      rawData: tx,
      normalizedData: {
        date: tx.date, // Teller provides YYYY-MM-DD format
        amount,
        payee,
        description: tx.description,
        status: tx.status === "pending" ? "pending" : "cleared",
        fitid: tx.id, // Teller transaction ID for duplicate detection
      },
      validationStatus: "pending",
      originalPayee: payee,
    };
  }

  /**
   * Map Teller account type/subtype to our account types
   */
  private mapAccountType(type: string, subtype: string): string {
    if (type === "credit") return "credit";

    switch (subtype) {
      case "checking":
        return "checking";
      case "savings":
        return "savings";
      case "money_market":
        return "savings";
      case "credit_card":
        return "credit";
      default:
        return "checking";
    }
  }
}

/**
 * Get Teller configuration from environment
 */
export function getTellerConfig() {
  return {
    applicationId: env.TELLER_APPLICATION_ID || "",
    environment: (env.TELLER_ENVIRONMENT as "sandbox" | "development" | "production") || "sandbox",
  };
}
