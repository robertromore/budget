/**
 * Database result type for transactions with joined schedule data
 * Used when querying transactions with schedule relations
 *
 * This is a flexible type that allows for additional properties
 * from database queries with relations (account, category, payee, etc.)
 */
export interface TransactionDbResult {
  id: number;
  date: string;
  amount: number;
  status: "pending" | "cleared" | "scheduled" | null;
  notes: string | null;
  accountId: number;
  categoryId: number | null;
  payeeId: number | null;
  balance?: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  // Schedule fields (nullable from joins)
  scheduleId?: number | null;
  scheduleName?: string | null;
  scheduleSlug?: string | null;
  scheduleFrequency?: string | null;
  scheduleInterval?: number | null;
  scheduleNextOccurrence?: string | null;
  // Allow additional properties from relations
  [key: string]: unknown;
}
