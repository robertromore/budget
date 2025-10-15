/**
 * Account domain type definitions
 *
 * This file contains type definitions for database query results and internal
 * repository operations to avoid using 'any' types.
 */

/**
 * Raw transaction result from account queries
 * Represents the join result of transactions with payees and categories
 */
export interface AccountTransactionDbResult {
  id: number;
  accountId: number;
  amount: number;
  date: string;
  status: "cleared" | "pending" | "scheduled" | null;
  notes: string | null;
  payeeId: number | null;
  categoryId: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Joined payee data
  payee?: {
    id: number;
    name: string | null;
    slug: string;
  } | null;

  // Joined category data
  category?: {
    id: number;
    name: string | null;
    slug: string;
  } | null;
}

/**
 * Transaction with calculated running balance
 */
export interface TransactionWithBalance extends AccountTransactionDbResult {
  balance: number;
}

/**
 * Account with embedded transactions
 * Note: Uses custom TransactionWithBalance type instead of full Transaction
 * to avoid type conflicts with extended fields.
 */
export interface AccountWithTransactions {
  // All Account fields
  id: number;
  cuid: string | null;
  name: string;
  slug: string;
  closed: boolean | null;
  notes: string | null;
  accountType: "checking" | "savings" | "investment" | "credit_card" | "loan" | "cash" | "hsa" | "other" | null;
  onBudget: boolean | null;
  initialBalance: number | null;
  currentBalance: number | null;
  clearedBalance: number | null;
  unclearedBalance: number | null;
  accountNumber: string | null;
  routingNumber: string | null;
  institutionName: string | null;
  interestRate: number | null;
  creditLimit: number | null;
  minimumPayment: number | null;
  statementDay: number | null;
  paymentDueDay: number | null;
  lastReconciledDate: string | null;
  lastReconciledBalance: number | null;
  displayOrder: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  // Additional fields
  transactions: TransactionWithBalance[];
  balance?: number;
}

/**
 * Account update data
 * Type-safe alternative to 'updateData: any'
 */
export interface AccountUpdateData {
  name?: string;
  slug?: string;
  accountType?: "checking" | "savings" | "investment" | "credit_card" | "loan" | "cash" | "hsa" | "other";
  onBudget?: boolean;
  notes?: string | null;
  initialBalance?: number;
  accountNumber?: string | null;
  routingNumber?: string | null;
  institutionName?: string | null;
  interestRate?: number | null;
  creditLimit?: number | null;
  minimumPayment?: number | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Account creation data
 */
export interface AccountCreateData {
  name: string;
  slug: string;
  accountType: "checking" | "savings" | "investment" | "credit_card" | "loan" | "cash" | "hsa" | "other";
  onBudget: boolean;
  notes?: string | null;
  initialBalance?: number;
  accountNumber?: string | null;
  routingNumber?: string | null;
  institutionName?: string | null;
  interestRate?: number | null;
  creditLimit?: number | null;
  minimumPayment?: number | null;
  statementDay?: number | null;
  paymentDueDay?: number | null;
}

/**
 * Account query options
 */
export interface AccountQueryOptions {
  includeDeleted?: boolean;
  includeTransactions?: boolean;
  onBudgetOnly?: boolean;
  sortBy?: "name" | "balance" | "accountType" | "createdAt";
  sortOrder?: "asc" | "desc";
}

/**
 * Account balance summary
 */
export interface AccountBalanceSummary {
  accountId: number;
  accountName: string;
  clearedBalance: number;
  pendingBalance: number;
  totalBalance: number;
  transactionCount: number;
}
