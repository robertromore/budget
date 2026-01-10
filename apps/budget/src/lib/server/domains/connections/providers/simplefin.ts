import type { AccountConnection, ExternalAccount, ProviderCredentials, SimplefinCredentials } from "$lib/schema/account-connections";
import type { ImportRow } from "$lib/types/import";
import type { ConnectionProviderInterface, SimpleFIN } from "../types";

/**
 * SimpleFIN Provider
 *
 * Integrates with SimpleFIN Bridge to fetch account data from 16,000+ US financial institutions.
 * SimpleFIN uses MX as the backend aggregator.
 *
 * API Documentation: https://beta-bridge.simplefin.org/info/developer
 *
 * The Access URL format is: https://{base64-token}@beta-bridge.simplefin.org/simplefin
 */
export class SimpleFINProvider implements ConnectionProviderInterface {
  readonly id = "simplefin" as const;
  readonly name = "SimpleFIN";

  /**
   * Fetch available accounts from SimpleFIN
   */
  async getAccounts(credentials: ProviderCredentials): Promise<ExternalAccount[]> {
    const { accessUrl } = credentials as SimplefinCredentials;
    const response = await this.fetchAccounts(accessUrl);

    return response.accounts.map((account) => ({
      id: account.id,
      name: account.name,
      institution: account.org.name || "Unknown",
      type: this.inferAccountType(account.name),
      balance: parseFloat(account.balance),
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
    const { accessUrl } = credentials as SimplefinCredentials;

    // Default to 90 days if no since date provided
    const startDate = since || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const startTimestamp = Math.floor(startDate.getTime() / 1000);

    // Fetch accounts with transactions
    const url = new URL(`${accessUrl}/accounts`);
    url.searchParams.set("start-date", startTimestamp.toString());

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`SimpleFIN API error: ${response.status} ${response.statusText}`);
    }

    const data: SimpleFIN.AccountsResponse = await response.json();

    // Find the specific account
    const account = data.accounts.find((a) => a.id === connection.externalAccountId);
    if (!account) {
      throw new Error(`Account ${connection.externalAccountId} not found in SimpleFIN response`);
    }

    // Map transactions to ImportRow format
    return account.transactions.map((tx, index) => this.mapTransaction(tx, index));
  }

  /**
   * Test if the access URL is valid
   */
  async testConnection(credentials: ProviderCredentials): Promise<boolean> {
    try {
      const { accessUrl } = credentials as SimplefinCredentials;
      const response = await this.fetchAccounts(accessUrl);
      return response.accounts.length >= 0;
    } catch {
      return false;
    }
  }

  /**
   * Decrypt credentials from stored format
   */
  async decryptCredentials(encryptedCredentials: string): Promise<SimplefinCredentials> {
    // Note: This requires workspaceId which we don't have here
    // The service layer should handle this
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
   * Fetch accounts from SimpleFIN API
   */
  private async fetchAccounts(accessUrl: string): Promise<SimpleFIN.AccountsResponse> {
    // Validate access URL format
    if (!accessUrl.includes("simplefin.org")) {
      throw new Error("Invalid SimpleFIN access URL");
    }

    const url = `${accessUrl}/accounts`;
    const response = await fetch(url);

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("Invalid or expired SimpleFIN access token");
      }
      throw new Error(`SimpleFIN API error: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Map a SimpleFIN transaction to ImportRow format
   */
  private mapTransaction(tx: SimpleFIN.Transaction, index: number): ImportRow {
    // Convert Unix timestamp to YYYY-MM-DD
    const date = new Date(tx.posted * 1000);
    const dateStr = formatDateYMD(date);

    // Parse amount (SimpleFIN provides as string)
    const amount = parseFloat(tx.amount);

    return {
      rowIndex: index,
      rawData: tx,
      normalizedData: {
        date: dateStr,
        amount,
        payee: tx.payee || tx.description,
        description: tx.memo || tx.description,
        status: tx.pending ? "pending" : "cleared",
        fitid: tx.id, // SimpleFIN transaction ID for duplicate detection
      },
      validationStatus: "pending",
      originalPayee: tx.payee || tx.description,
    };
  }

  /**
   * Infer account type from account name
   */
  private inferAccountType(name: string): string {
    const lowerName = name.toLowerCase();

    if (lowerName.includes("checking")) return "checking";
    if (lowerName.includes("savings")) return "savings";
    if (lowerName.includes("credit")) return "credit";
    if (lowerName.includes("investment") || lowerName.includes("brokerage")) return "investment";
    if (lowerName.includes("money market")) return "savings";
    if (lowerName.includes("loan") || lowerName.includes("mortgage")) return "loan";

    return "checking"; // Default
  }
}

/**
 * Helper to format date as YYYY-MM-DD
 */
function formatDateYMD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
