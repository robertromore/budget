/**
 * Transaction repository type definitions
 *
 * This file contains type definitions for database query results and internal
 * repository operations to avoid using 'any' types.
 */

import type { Transaction } from "$lib/schema/transactions";
import type { Payee } from "$lib/schema/payees";
import type { Category } from "$lib/schema/categories";
import type { Account } from "$lib/schema/accounts";

/**
 * Raw database result from transaction queries
 * Represents the data shape directly from Drizzle queries
 */
export interface TransactionDbResult {
  id: number;
  accountId: number;
  parentId: number | null;
  status: "cleared" | "pending" | "scheduled" | null;
  payeeId: number | null;
  amount: number;
  categoryId: number | null;
  notes: string | null;
  date: string;
  scheduleId: number | null;
  transferId: string | null;
  transferAccountId: number | null;
  transferTransactionId: number | null;
  isTransfer: boolean | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  balance?: number | null;

  // Schedule metadata fields (from joins)
  scheduleName?: string | null;
  scheduleSlug?: string | null;
  scheduleFrequency?: string | null;
  scheduleInterval?: number | null;
  scheduleNextOccurrence?: string | null;
}

/**
 * Transaction with related entities loaded
 * Result from queries that eagerly load relationships
 */
export interface TransactionWithRelations extends TransactionDbResult {
  account?: Account;
  category?: Category | null;
  payee?: Payee | null;
  budgetAllocations?: Array<{
    id: number;
    budgetId: number;
    amount: number;
    budget?: {
      id: number;
      name: string;
      slug: string;
    };
  }>;
}

/**
 * Transaction update data
 * Type-safe alternative to 'updateData: any'
 */
export interface TransactionUpdateData {
  accountId?: number;
  parentId?: number | null;
  status?: "cleared" | "pending" | "scheduled";
  payeeId?: number | null;
  amount?: number;
  categoryId?: number | null;
  notes?: string | null;
  date?: string;
  scheduleId?: number | null;
  transferId?: string | null;
  transferAccountId?: number | null;
  transferTransactionId?: number | null;
  isTransfer?: boolean;
  updatedAt?: string;
  deletedAt?: string | null;
}

/**
 * Bulk transaction creation data
 */
export interface BulkTransactionCreateData {
  accountId: number;
  amount: number;
  date: string;
  status?: "cleared" | "pending" | "scheduled";
  payeeId?: number | null;
  categoryId?: number | null;
  notes?: string | null;
  scheduleId?: number | null;
}

/**
 * Transaction query options for filtering and sorting
 */
export interface TransactionQueryOptions {
  includeDeleted?: boolean;
  includeRelations?: boolean;
  includeBalance?: boolean;
  sortBy?: "date" | "amount" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
}
