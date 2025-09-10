// $lib/types/transaction.ts
import type { Category, Payee } from "$lib/schema";
import type { DateValue } from "@internationalized/date";

/**
 * The shape of a single transaction record.
 */
export type TransactionsFormat = {
  id: number;
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
