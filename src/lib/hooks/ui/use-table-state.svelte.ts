/**
 * Consolidated table state management hook
 * Replaces the fragmented state management across multiple files
 */

import type { 
  ColumnFiltersState,
  PaginationState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  GroupingState,
  ExpandedState,
  ColumnPinningState
} from "@tanstack/table-core";

interface UseTableStateOptions {
  initialSorting?: SortingState;
  initialFiltering?: ColumnFiltersState;
  initialPagination?: PaginationState;
  initialSelection?: RowSelectionState;
  initialVisibility?: VisibilityState;
  initialGrouping?: GroupingState;
  initialExpanded?: ExpandedState;
  initialPinning?: ColumnPinningState;
  globalFilter?: string;
}

interface UseTableStateReturn {
  // State getters
  sorting: SortingState;
  filtering: ColumnFiltersState;
  pagination: PaginationState;
  selection: RowSelectionState;
  visibility: VisibilityState;
  grouping: GroupingState;
  expanded: ExpandedState;
  pinning: ColumnPinningState;
  globalFilter: string;
  
  // State setters
  setSorting: (sorting: SortingState) => void;
  setFiltering: (filtering: ColumnFiltersState) => void;
  setPagination: (pagination: PaginationState) => void;
  setSelection: (selection: RowSelectionState) => void;
  setVisibility: (visibility: VisibilityState) => void;
  setGrouping: (grouping: GroupingState) => void;
  setExpanded: (expanded: ExpandedState) => void;
  setPinning: (pinning: ColumnPinningState) => void;
  setGlobalFilter: (globalFilter: string) => void;
  
  // Utility methods
  resetAllState: () => void;
  resetFilters: () => void;
  resetSorting: () => void;
  hasFilters: boolean;
  hasSelection: boolean;
}

export function useTableState(options: UseTableStateOptions = {}): UseTableStateReturn {
  const {
    initialSorting = [],
    initialFiltering = [],
    initialPagination = { pageIndex: 0, pageSize: 10 },
    initialSelection = {},
    initialVisibility = {},
    initialGrouping = [],
    initialExpanded = {},
    initialPinning = { left: [], right: [] },
    globalFilter: initialGlobalFilter = ""
  } = options;

  // State
  let sorting = $state<SortingState>(initialSorting);
  let filtering = $state<ColumnFiltersState>(initialFiltering);
  let pagination = $state<PaginationState>(initialPagination);
  let selection = $state<RowSelectionState>(initialSelection);
  let visibility = $state<VisibilityState>(initialVisibility);
  let grouping = $state<GroupingState>(initialGrouping);
  let expanded = $state<ExpandedState>(initialExpanded);
  let pinning = $state<ColumnPinningState>(initialPinning);
  let globalFilter = $state<string>(initialGlobalFilter);

  // Derived state
  const hasFilters = $derived(filtering.length > 0 || globalFilter.length > 0);
  const hasSelection = $derived(Object.keys(selection).length > 0);

  // Setters
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

  // Utility methods
  function resetAllState() {
    sorting = initialSorting;
    filtering = initialFiltering;
    pagination = initialPagination;
    selection = initialSelection;
    visibility = initialVisibility;
    grouping = initialGrouping;
    expanded = initialExpanded;
    pinning = initialPinning;
    globalFilter = initialGlobalFilter;
  }

  function resetFilters() {
    filtering = initialFiltering;
    globalFilter = initialGlobalFilter;
  }

  function resetSorting() {
    sorting = initialSorting;
  }

  return {
    get sorting() { return sorting; },
    get filtering() { return filtering; },
    get pagination() { return pagination; },
    get selection() { return selection; },
    get visibility() { return visibility; },
    get grouping() { return grouping; },
    get expanded() { return expanded; },
    get pinning() { return pinning; },
    get globalFilter() { return globalFilter; },
    get hasFilters() { return hasFilters; },
    get hasSelection() { return hasSelection; },
    
    setSorting,
    setFiltering,
    setPagination,
    setSelection,
    setVisibility,
    setGrouping,
    setExpanded,
    setPinning,
    setGlobalFilter,
    
    resetAllState,
    resetFilters,
    resetSorting
  };
}