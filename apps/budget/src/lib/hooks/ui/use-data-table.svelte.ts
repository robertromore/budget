/**
 * Comprehensive data table hook that consolidates all table-related state and logic
 * Replaces the fragmented state management in the (data) folder
 */

import type {
  ColumnDef,
  Table,
  SortingState,
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  VisibilityState,
  GroupingState,
  ExpandedState,
  ColumnPinningState,
} from "@tanstack/table-core";

import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFacetedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  createSvelteTable,
} from "@tanstack/table-core";

interface UseDataTableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData, any>[];

  // Initial state
  initialState?: {
    sorting?: SortingState;
    filtering?: ColumnFiltersState;
    pagination?: PaginationState;
    selection?: RowSelectionState;
    visibility?: VisibilityState;
    grouping?: GroupingState;
    expanded?: ExpandedState;
    pinning?: ColumnPinningState;
    globalFilter?: string;
  };

  // Configuration
  enableRowSelection?: boolean;
  enableGlobalFilter?: boolean;
  enableColumnFilters?: boolean;
  enableSorting?: boolean;
  enablePagination?: boolean;
  enableGrouping?: boolean;
  enableExpanding?: boolean;
  enablePinning?: boolean;

  // Callbacks
  onStateChange?: (state: TableState) => void;
}

interface TableState {
  sorting: SortingState;
  filtering: ColumnFiltersState;
  pagination: PaginationState;
  selection: RowSelectionState;
  visibility: VisibilityState;
  grouping: GroupingState;
  expanded: ExpandedState;
  pinning: ColumnPinningState;
  globalFilter: string;
}

interface UseDataTableReturn<TData> {
  table: Table<TData>;
  state: TableState;
  actions: {
    resetAllState: () => void;
    resetFilters: () => void;
    resetSorting: () => void;
    resetSelection: () => void;
    clearGlobalFilter: () => void;
  };
  derived: {
    hasFilters: boolean;
    hasSelection: boolean;
    selectedRows: TData[];
    totalRows: number;
    filteredRows: number;
  };
}

export function useDataTable<TData>(
  options: UseDataTableOptions<TData>
): UseDataTableReturn<TData> {
  const {
    data,
    columns,
    initialState = {},
    enableRowSelection = true,
    enableGlobalFilter = true,
    enableColumnFilters = true,
    enableSorting = true,
    enablePagination = true,
    enableGrouping = false,
    enableExpanding = false,
    enablePinning = false,
    onStateChange,
  } = options;

  // Initialize state with defaults
  let sorting = $state<SortingState>(initialState.sorting || []);
  let filtering = $state<ColumnFiltersState>(initialState.filtering || []);
  let pagination = $state<PaginationState>(initialState.pagination || {pageIndex: 0, pageSize: 10});
  let selection = $state<RowSelectionState>(initialState.selection || {});
  let visibility = $state<VisibilityState>(initialState.visibility || {});
  let grouping = $state<GroupingState>(initialState.grouping || []);
  let expanded = $state<ExpandedState>(initialState.expanded || {});
  let pinning = $state<ColumnPinningState>(initialState.pinning || {left: [], right: []});
  let globalFilter = $state<string>(initialState.globalFilter || "");

  // Create reactive state object
  const state = $derived<TableState>({
    sorting,
    filtering,
    pagination,
    selection,
    visibility,
    grouping,
    expanded,
    pinning,
    globalFilter,
  });

  // State setters
  function setSorting(newSorting: SortingState) {
    sorting = newSorting;
  }

  function setFiltering(newFiltering: ColumnFiltersState) {
    filtering = newFiltering;
  }

  function setPagination(newPagination: PaginationState) {
    pagination = newPagination;
  }

  function setSelection(newSelection: RowSelectionState) {
    selection = newSelection;
  }

  function setVisibility(newVisibility: VisibilityState) {
    visibility = newVisibility;
  }

  function setGrouping(newGrouping: GroupingState) {
    grouping = newGrouping;
  }

  function setExpanded(newExpanded: ExpandedState) {
    expanded = newExpanded;
  }

  function setPinning(newPinning: ColumnPinningState) {
    pinning = newPinning;
  }

  function setGlobalFilter(newGlobalFilter: string) {
    globalFilter = newGlobalFilter;
  }

  // Create table instance
  const table = createSvelteTable({
    get data() {
      return data;
    },
    columns,
    state: {
      get sorting() {
        return sorting;
      },
      get columnFilters() {
        return filtering;
      },
      get pagination() {
        return pagination;
      },
      get rowSelection() {
        return selection;
      },
      get columnVisibility() {
        return visibility;
      },
      get grouping() {
        return grouping;
      },
      get expanded() {
        return expanded;
      },
      get columnPinning() {
        return pinning;
      },
      get globalFilter() {
        return globalFilter;
      },
    },
    enableRowSelection,
    enableGlobalFilter,
    enableColumnFilters,
    enableSorting,
    onSortingChange: enableSorting ? setSorting : undefined,
    onColumnFiltersChange: enableColumnFilters ? setFiltering : undefined,
    onPaginationChange: enablePagination ? setPagination : undefined,
    onRowSelectionChange: enableRowSelection ? setSelection : undefined,
    onColumnVisibilityChange: setVisibility,
    onGroupingChange: enableGrouping ? setGrouping : undefined,
    onExpandedChange: enableExpanding ? setExpanded : undefined,
    onColumnPinningChange: enablePinning ? setPinning : undefined,
    onGlobalFilterChange: enableGlobalFilter ? setGlobalFilter : undefined,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel:
      enableColumnFilters || enableGlobalFilter ? getFilteredRowModel() : undefined,
    getPaginationRowModel: enablePagination ? getPaginationRowModel() : undefined,
    getSortedRowModel: enableSorting ? getSortedRowModel() : undefined,
    getFacetedRowModel: enableColumnFilters ? getFacetedRowModel() : undefined,
    getGroupedRowModel: enableGrouping ? getGroupedRowModel() : undefined,
    getExpandedRowModel: enableExpanding ? getExpandedRowModel() : undefined,
    autoResetPageIndex: false,
    autoResetExpanded: false,
  });

  // Derived state
  const hasFilters = $derived(
    filtering.length > 0 || (enableGlobalFilter && globalFilter.length > 0)
  );
  const hasSelection = $derived(Object.keys(selection).length > 0);
  const selectedRows = $derived(table.getSelectedRowModel().rows.map((row) => row.original));
  const totalRows = $derived(data.length);
  const filteredRows = $derived(table.getFilteredRowModel().rows.length);

  // Actions
  function resetAllState() {
    sorting = initialState.sorting || [];
    filtering = initialState.filtering || [];
    pagination = initialState.pagination || {pageIndex: 0, pageSize: 10};
    selection = initialState.selection || {};
    visibility = initialState.visibility || {};
    grouping = initialState.grouping || [];
    expanded = initialState.expanded || {};
    pinning = initialState.pinning || {left: [], right: []};
    globalFilter = initialState.globalFilter || "";
  }

  function resetFilters() {
    filtering = initialState.filtering || [];
    globalFilter = initialState.globalFilter || "";
  }

  function resetSorting() {
    sorting = initialState.sorting || [];
  }

  function resetSelection() {
    selection = {};
  }

  function clearGlobalFilter() {
    globalFilter = "";
  }

  // Call onStateChange when state changes
  $effect(() => {
    if (onStateChange) {
      // Access the current state value reactively
      const currentState = state;
      onStateChange(currentState);
    }
  });

  return {
    table,
    get state() {
      return state;
    },
    actions: {
      resetAllState,
      resetFilters,
      resetSorting,
      resetSelection,
      clearGlobalFilter,
    },
    derived: {
      get hasFilters() {
        return hasFilters;
      },
      get hasSelection() {
        return hasSelection;
      },
      get selectedRows() {
        return selectedRows;
      },
      get totalRows() {
        return totalRows;
      },
      get filteredRows() {
        return filteredRows;
      },
    },
  };
}
