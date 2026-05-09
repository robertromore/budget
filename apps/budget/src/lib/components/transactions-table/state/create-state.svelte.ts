import { Context } from "runed";
import type {
  ColumnFiltersState,
  ColumnOrderState,
  PaginationState,
  RowSelectionState,
  Updater,
  VisibilityState,
} from "@tanstack/table-core";

export interface TableInstanceStateOptions {
  initialPagination?: PaginationState;
  initialVisibility?: VisibilityState;
  initialColumnOrder?: ColumnOrderState;
}

/**
 * Per-instance reactive state for a TanStack-Table-backed surface.
 *
 * Each container (transaction tab, expense tab, HSA route, global
 * /transactions page, etc.) mounts its own instance via
 * `createTableInstanceState()` and then descendant components
 * (data-table, toolbar, cells, faceted filters) read state from the
 * shared `tableInstanceContext`. Module-scoped `$state` would let
 * filters bleed between routes; this scopes them per mount.
 *
 * Out of scope for this class (still module-scoped at
 * `$lib/components/shared/data-table/state/`):
 * sorting, expanded, grouping, pinning. Those are shared across the
 * entire app's tables today; future cleanup.
 */
export class TableInstanceState {
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

  constructor(options: TableInstanceStateOptions = {}) {
    if (options.initialPagination) this.#pagination = options.initialPagination;
    if (options.initialVisibility) this.#visibility = options.initialVisibility;
    if (options.initialColumnOrder) this.#columnOrder = options.initialColumnOrder;
  }
}

/**
 * Single context handle. Each container mounts its own
 * `TableInstanceState` via `createTableInstanceState()`; descendants
 * resolve to the nearest ancestor's instance.
 */
export const tableInstanceContext = new Context<TableInstanceState>(
  "table-instance-state"
);

export function createTableInstanceState(
  options: TableInstanceStateOptions = {}
): TableInstanceState {
  const state = new TableInstanceState(options);
  tableInstanceContext.set(state);
  return state;
}
