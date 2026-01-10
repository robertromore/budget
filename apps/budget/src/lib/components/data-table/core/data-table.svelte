<script lang="ts" generics="TData">
import { createSvelteTable } from '$lib/components/ui/data-table';
import type { ColumnDef, Row, Table } from '@tanstack/table-core';
import {
  getCoreRowModel,
  getExpandedRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getGroupedRowModel,
  getPaginationRowModel,
  getSortedRowModel,
} from '@tanstack/table-core';
import type { Snippet } from 'svelte';
import type { TableState } from '../state/create-table-state.svelte';
import type { DataTableFeatures, TableUISettings } from '../state/types';

interface Props {
  /** The data to display in the table */
  data: TData[];
  /** Column definitions */
  columns: ColumnDef<TData>[];
  /** Table state object from createTableState() */
  state: TableState;
  /** Feature flags for enabling/disabling features */
  features?: DataTableFeatures;
  /** UI settings for table appearance */
  uiSettings?: TableUISettings;
  /** Custom table snippet for rendering (optional) */
  children?: Snippet<[Table<TData>]>;
  /** CSS class for the table wrapper */
  class?: string;
  /** Whether to enable server-side pagination */
  serverPagination?: boolean;
  /** Total row count for server-side pagination */
  rowCount?: number;
  /** Custom filter functions registry */
  filterFns?: Record<string, any>;
  /** Bindable table instance for external access */
  table?: Table<TData> | undefined;
  /** Optional row ID getter */
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
}

let {
  data = [],
  columns = [],
  state,
  features = {},
  uiSettings = {},
  children,
  class: className,
  serverPagination = false,
  rowCount,
  filterFns = {},
  table = $bindable(),
  getRowId,
}: Props = $props();

// Create the table instance with state getters - reactive by design
// Following the transactions table pattern: state is accessed via getter functions
const tableInstance = createSvelteTable<TData>({
  get data() {
    return data;
  },
  get columns() {
    return columns;
  },
  getCoreRowModel: getCoreRowModel(),
  getPaginationRowModel: serverPagination ? undefined : getPaginationRowModel(),
  manualPagination: serverPagination,
  // Prevent auto-reset of page index when data changes (e.g., editing a row)
  autoResetPageIndex: false,

  // State via getters - naturally reactive
  state: {
    get pagination() {
      return state.pagination();
    },
    get sorting() {
      return state.sorting();
    },
    get columnFilters() {
      return state.columnFilters();
    },
    get rowSelection() {
      return state.rowSelection();
    },
    get columnVisibility() {
      return state.columnVisibility();
    },
    get columnPinning() {
      return state.columnPinning();
    },
    get expanded() {
      return state.expanded();
    },
    get grouping() {
      return state.grouping();
    },
    get globalFilter() {
      return state.globalFilter();
    },
    get columnOrder() {
      return state.columnOrder();
    },
  },

  // Handlers - direct to state setters
  onPaginationChange: state.setPagination,
  onSortingChange: state.setSorting,
  onColumnFiltersChange: state.setColumnFilters,
  onRowSelectionChange: state.setRowSelection,
  onColumnVisibilityChange: state.setColumnVisibility,
  onColumnPinningChange: state.setColumnPinning,
  onExpandedChange: state.setExpanded,
  onGroupingChange: state.setGrouping,
  onGlobalFilterChange: state.setGlobalFilter,
  onColumnOrderChange: state.setColumnOrder,

  // Feature row models - conditionally include based on features
  ...(features.sorting && {
    getSortedRowModel: getSortedRowModel(),
    enableSorting: true,
  }),
  ...(features.filtering && {
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    enableColumnFilters: true,
    get filterFns() {
      return filterFns;
    },
  }),
  ...(features.rowSelection && {
    enableRowSelection: true,
  }),
  ...(features.columnVisibility && {
    enableHiding: true,
  }),
  ...(features.columnPinning && {
    enableColumnPinning: true,
  }),
  ...(features.expanding && {
    getExpandedRowModel: getExpandedRowModel(),
  }),
  ...(features.grouping && {
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    enableGrouping: true,
  }),
  ...(getRowId && { getRowId }),
  ...(features.globalFilter && {
    enableGlobalFilter: true,
  }),
  ...(features.columnReordering && {
    enableColumnResizing: true,
  }),
  // Server-side pagination
  ...(serverPagination &&
    rowCount !== undefined && {
      get rowCount() {
        return rowCount;
      },
    }),
});

// Sync the table instance to the bindable prop for external access
table = tableInstance;

// Apply UI settings
const densityClass = $derived(uiSettings.density === 'dense' ? 'text-xs' : '');
const borderClass = $derived(uiSettings.bordered ? 'border' : '');
const stripedClass = $derived(uiSettings.striped ? '[&_tbody_tr:nth-child(even)]:bg-muted/50' : '');
const hoverableClass = $derived(
  uiSettings.hoverable ? '[&_tbody_tr]:hover:bg-muted/50 [&_tbody_tr]:cursor-pointer' : ''
);
const stickyHeaderClass = $derived(
  uiSettings.stickyHeader
    ? '[&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10 [&_thead]:bg-background'
    : ''
);

const tableClasses = $derived(
  [densityClass, borderClass, stripedClass, hoverableClass, stickyHeaderClass, className]
    .filter(Boolean)
    .join(' ')
);
</script>

<div class={tableClasses}>
  {#if children}
    {@render children(tableInstance)}
  {/if}
</div>
