import { Context } from "runed";
import type {
  ColumnFiltersState,
  ColumnOrderState,
  PaginationState,
  RowSelectionState,
  Updater,
  VisibilityState,
} from "@tanstack/table-core";

export interface TransactionTableStateOptions {
  initialPagination?: PaginationState;
  initialVisibility?: VisibilityState;
  initialColumnOrder?: ColumnOrderState;
}

/**
 * Per-instance reactive state for the transactions data table. Keeps each
 * mounted instance (per-account tab, global /transactions page, schedule
 * detail, etc.) isolated from the others — module-scoped `$state` would let
 * filters bleed between routes.
 */
export class TransactionTableState {
  // Pagination
  #pagination: PaginationState = $state({ pageIndex: 0, pageSize: 25 });
  pagination = () => this.#pagination;
  setPagination = (updater: Updater<PaginationState>) => {
    if (typeof updater === "function") {
      this.#pagination = updater(this.#pagination);
    } else {
      this.#pagination = updater;
    }
  };

  // Selection
  #selection: RowSelectionState = $state({});
  selection = () => this.#selection;
  setSelection = (updater: Updater<RowSelectionState>) => {
    if (typeof updater === "function") {
      this.#selection = updater(this.#selection);
    } else {
      this.#selection = updater;
    }
  };

  // Last-selected row id (for shift-click range selection)
  #lastSelectedRowId: string | null = $state(null);
  lastSelectedRowId = () => this.#lastSelectedRowId;
  setLastSelectedRowId = (rowId: string | null) => {
    this.#lastSelectedRowId = rowId;
  };

  // Visibility
  #visibility: VisibilityState = $state({});
  visibility = () => this.#visibility;
  setVisibility = (updater: Updater<VisibilityState>) => {
    if (typeof updater === "function") {
      this.#visibility = updater(this.#visibility);
    } else {
      this.#visibility = updater;
    }
  };

  // Column order
  #columnOrder: ColumnOrderState = $state([]);
  columnOrder = () => this.#columnOrder;
  setColumnOrder = (updater: Updater<ColumnOrderState>) => {
    if (typeof updater === "function") {
      this.#columnOrder = updater(this.#columnOrder);
    } else {
      this.#columnOrder = updater;
    }
  };

  // Column filters (faceted)
  #filtering: ColumnFiltersState = $state([]);
  filtering = () => this.#filtering;
  setFiltering = (updater: Updater<ColumnFiltersState>) => {
    if (typeof updater === "function") {
      this.#filtering = updater(this.#filtering);
    } else {
      this.#filtering = updater;
    }
  };

  // Global text filter
  #globalFilter: string = $state("");
  globalFilter = () => this.#globalFilter;
  setGlobalFilter = (updater: Updater<string>) => {
    if (typeof updater === "function") {
      this.#globalFilter = updater(this.#globalFilter);
    } else {
      this.#globalFilter = updater;
    }
  };

  constructor(options: TransactionTableStateOptions = {}) {
    if (options.initialPagination) this.#pagination = options.initialPagination;
    if (options.initialVisibility) this.#visibility = options.initialVisibility;
    if (options.initialColumnOrder) this.#columnOrder = options.initialColumnOrder;
  }
}

/**
 * Context handle. Mount a `TransactionTableState` near the top of the
 * data-table tree and consumers (toolbar, column-headers, pagination, etc.)
 * pull from `transactionTableContext.get()`.
 */
export const transactionTableContext = new Context<TransactionTableState>(
  "transaction-table-state"
);

export function createTransactionTableState(
  options: TransactionTableStateOptions = {}
): TransactionTableState {
  const state = new TransactionTableState(options);
  transactionTableContext.set(state);
  return state;
}
