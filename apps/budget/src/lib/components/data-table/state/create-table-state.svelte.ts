import type {
  ColumnFiltersState,
  ColumnOrderState,
  ColumnPinningState,
  ExpandedState,
  GroupingState,
  PaginationState,
  RowSelectionState,
  SortingState,
  Updater,
  VisibilityState,
} from '@tanstack/table-core';

export interface TableStateOptions {
  initialSorting?: SortingState;
  initialPagination?: PaginationState;
  initialColumnVisibility?: VisibilityState;
  initialColumnFilters?: ColumnFiltersState;
  initialRowSelection?: RowSelectionState;
  initialColumnPinning?: ColumnPinningState;
  initialExpanded?: ExpandedState;
  initialGrouping?: GroupingState;
  initialGlobalFilter?: string;
  initialColumnOrder?: ColumnOrderState;
}

/**
 * Creates a reactive table state object following the transactions table pattern.
 *
 * This factory creates state getters and setters that work correctly with
 * TanStack Table's `createSvelteTable`. The getter functions ensure proper
 * reactive tracking when used in the table's state object.
 *
 * @example
 * ```svelte
 * const tableState = createTableState({
 *   initialPagination: { pageIndex: 0, pageSize: 25 },
 *   initialSorting: [{ id: 'date', desc: true }],
 * });
 *
 * const table = createSvelteTable({
 *   state: {
 *     get sorting() { return tableState.sorting(); },
 *     get pagination() { return tableState.pagination(); },
 *   },
 *   onSortingChange: tableState.setSorting,
 *   onPaginationChange: tableState.setPagination,
 * });
 * ```
 */
export function createTableState(options: TableStateOptions = {}) {
  // Create reactive state using $state
  let sorting = $state<SortingState>(options.initialSorting ?? []);
  let pagination = $state<PaginationState>(
    options.initialPagination ?? { pageIndex: 0, pageSize: 10 }
  );
  let columnVisibility = $state<VisibilityState>(options.initialColumnVisibility ?? {});
  let columnFilters = $state<ColumnFiltersState>(options.initialColumnFilters ?? []);
  let rowSelection = $state<RowSelectionState>(options.initialRowSelection ?? {});
  let columnPinning = $state<ColumnPinningState>(options.initialColumnPinning ?? {});
  let expanded = $state<ExpandedState>(options.initialExpanded ?? {});
  let grouping = $state<GroupingState>(options.initialGrouping ?? []);
  let globalFilter = $state<string>(options.initialGlobalFilter ?? '');
  let columnOrder = $state<ColumnOrderState>(options.initialColumnOrder ?? []);

  // Helper to apply TanStack Table's Updater pattern
  function applyUpdater<T>(current: T, updater: Updater<T>): T {
    return typeof updater === 'function' ? (updater as (old: T) => T)(current) : updater;
  }

  return {
    // Getters (for createSvelteTable state object)
    sorting: () => sorting,
    pagination: () => pagination,
    columnVisibility: () => columnVisibility,
    columnFilters: () => columnFilters,
    rowSelection: () => rowSelection,
    columnPinning: () => columnPinning,
    expanded: () => expanded,
    grouping: () => grouping,
    globalFilter: () => globalFilter,
    columnOrder: () => columnOrder,

    // Setters (for createSvelteTable onChange handlers)
    setSorting: (updater: Updater<SortingState>) => {
      sorting = applyUpdater(sorting, updater);
    },
    setPagination: (updater: Updater<PaginationState>) => {
      pagination = applyUpdater(pagination, updater);
    },
    setColumnVisibility: (updater: Updater<VisibilityState>) => {
      columnVisibility = applyUpdater(columnVisibility, updater);
    },
    setColumnFilters: (updater: Updater<ColumnFiltersState>) => {
      columnFilters = applyUpdater(columnFilters, updater);
    },
    setRowSelection: (updater: Updater<RowSelectionState>) => {
      rowSelection = applyUpdater(rowSelection, updater);
    },
    setColumnPinning: (updater: Updater<ColumnPinningState>) => {
      columnPinning = applyUpdater(columnPinning, updater);
    },
    setExpanded: (updater: Updater<ExpandedState>) => {
      expanded = applyUpdater(expanded, updater);
    },
    setGrouping: (updater: Updater<GroupingState>) => {
      grouping = applyUpdater(grouping, updater);
    },
    setGlobalFilter: (updater: Updater<string>) => {
      globalFilter = applyUpdater(globalFilter, updater);
    },
    setColumnOrder: (updater: Updater<ColumnOrderState>) => {
      columnOrder = applyUpdater(columnOrder, updater);
    },

    // Direct setters for external control (bypasses Updater pattern)
    setValues: {
      sorting: (val: SortingState) => {
        sorting = val;
      },
      pagination: (val: PaginationState) => {
        pagination = val;
      },
      columnVisibility: (val: VisibilityState) => {
        columnVisibility = val;
      },
      columnFilters: (val: ColumnFiltersState) => {
        columnFilters = val;
      },
      rowSelection: (val: RowSelectionState) => {
        rowSelection = val;
      },
      columnPinning: (val: ColumnPinningState) => {
        columnPinning = val;
      },
      expanded: (val: ExpandedState) => {
        expanded = val;
      },
      grouping: (val: GroupingState) => {
        grouping = val;
      },
      globalFilter: (val: string) => {
        globalFilter = val;
      },
      columnOrder: (val: ColumnOrderState) => {
        columnOrder = val;
      },
    },

    // Reset all state to initial values
    reset: () => {
      sorting = options.initialSorting ?? [];
      pagination = options.initialPagination ?? { pageIndex: 0, pageSize: 10 };
      columnVisibility = options.initialColumnVisibility ?? {};
      columnFilters = options.initialColumnFilters ?? [];
      rowSelection = options.initialRowSelection ?? {};
      columnPinning = options.initialColumnPinning ?? {};
      expanded = options.initialExpanded ?? {};
      grouping = options.initialGrouping ?? [];
      globalFilter = options.initialGlobalFilter ?? '';
      columnOrder = options.initialColumnOrder ?? [];
    },
  };
}

export type TableState = ReturnType<typeof createTableState>;
