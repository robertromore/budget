// $lib/types/transaction.ts
import type { Category, Payee } from "$lib/schema";
import type { DateValue } from "@internationalized/date";

/**
 * The shape of a single transaction record.
 */
export type TransactionsFormat = {
  id: number | string; // Can be numeric ID or string for scheduled transactions
  seq: number | null; // Per-workspace sequential ID (null for scheduled transactions)
  amount: number;
  date: DateValue;
  payeeId: number | null;
  payee: Payee | null;
  notes: string | null;
  category: Category | null;
  categoryId: number | null;
  status: "cleared" | "pending" | "scheduled" | null;
  accountId: number;
  parentId: number | null;
  balance: number | null;
  // Transfer metadata
  isTransfer?: boolean | null;
  transferId?: string | null;
  transferAccountId?: number | null;
  transferTransactionId?: number | null;
  transferAccountName?: string | null;
  transferAccountSlug?: string | null;
  // Import metadata
  originalPayeeName?: string | null; // Original payee string from import
  // Balance management metadata
  isArchived?: boolean | null; // Transaction is archived (excluded from balance)
  isAdjustment?: boolean | null; // Transaction is a balance adjustment
  adjustmentReason?: string | null; // Reason for balance adjustment
  // Reconciliation marker (virtual row, not a real transaction)
  isReconciliationMarker?: boolean; // True if this is a reconciliation checkpoint row
  markerType?: "reconciliation" | "balance-reset"; // Type of balance management marker
  // Schedule metadata (only present for scheduled transactions)
  scheduleId?: number;
  scheduleName?: string;
  scheduleSlug?: string;
  scheduleFrequency?: string;
  scheduleInterval?: number;
  scheduleNextOccurrence?: string;
  // Budget allocation data
  budgetAllocations?: Array<{
    id: number;
    budgetId: number;
    budgetName: string;
    allocatedAmount: number;
    autoAssigned: boolean;
    assignedBy: string | null;
  }>;
};

/**
 * Simple key/value pair used in filter dropdowns.
 */
export type AvailableFiltersEntry = { id: string; label: string };
export type AvailableFilters = Array<AvailableFiltersEntry>;

/**
 * Utility type for update callbacks.
 */
export type UpdateDataFn = (value: unknown) => void;
