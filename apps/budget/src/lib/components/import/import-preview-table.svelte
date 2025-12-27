<script lang="ts">
import { AdvancedDataTable } from "$lib/components/data-table/core";
import type { DataTableState, DataTableStateHandlers } from "$lib/components/data-table/state/types";
import type { CleanupState, ImportRow } from "$lib/types/import";
import type { RowSelectionState, Table } from "@tanstack/table-core";
import {
  createImportPreviewColumns,
  type ImportPreviewColumnActions,
} from "./import-preview-columns";
import ImportPreviewToolbar from "./import-preview-toolbar.svelte";

interface ImportOptions {
  createMissingPayees: boolean;
  createMissingCategories: boolean;
  allowPartialImport: boolean;
  reverseAmountSigns: boolean;
}

interface Props {
  data: ImportRow[];
  importOptions: ImportOptions;
  onImportOptionsChange: (options: ImportOptions) => void;
  cleanupState: CleanupState | null;
  onCleanupStateChange: (state: CleanupState) => void;
  onPayeeUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  onCategoryUpdate?: (
    rowIndex: number,
    categoryId: number | null,
    categoryName: string | null
  ) => void;
  onDescriptionUpdate?: (rowIndex: number, description: string | null) => void;
  temporaryPayees?: string[];
  temporaryCategories?: string[];
  processorCount?: number;
  onOpenProcessorFilter?: () => void;
  loading?: boolean;
  table?: Table<ImportRow> | undefined;
  cleanupSheetOpen?: boolean;
  /** Bindable row selection state - contains row.rowIndex values of selected rows */
  selectedRows?: Set<number>;
}

let {
  data,
  importOptions,
  onImportOptionsChange,
  cleanupState,
  onCleanupStateChange,
  onPayeeUpdate,
  onCategoryUpdate,
  onDescriptionUpdate,
  temporaryPayees,
  temporaryCategories,
  processorCount = 0,
  onOpenProcessorFilter,
  loading = false,
  table = $bindable(),
  cleanupSheetOpen = $bindable(false),
  selectedRows = $bindable(new Set<number>()),
}: Props = $props();

// Manage row selection state for the table
let rowSelection = $state<RowSelectionState>({});

// Initialize selection with only valid rows (matching old ImportDataTable behavior)
let hasInitialized = $state(false);
$effect(() => {
  if (!hasInitialized && data.length > 0) {
    hasInitialized = true;
    const initialSelection: RowSelectionState = {};
    data.forEach((row) => {
      // Use row.rowIndex as key (matching old component behavior)
      if (row.validationStatus === 'valid' || row.validationStatus === 'pending') {
        initialSelection[String(row.rowIndex)] = true;
      }
    });
    rowSelection = initialSelection;
  }
});

// Sync rowSelection → selectedRows (key values are rowIndex values)
$effect(() => {
  const newSelection = new Set<number>();
  Object.keys(rowSelection).forEach((key) => {
    if (rowSelection[key]) {
      newSelection.add(Number(key));
    }
  });
  selectedRows = newSelection;
});

// Create state object to pass to the table
const tableState: DataTableState = $derived({
  rowSelection,
});

// Create handlers to update state
const tableHandlers: DataTableStateHandlers = {
  onRowSelectionChange: (updater) => {
    rowSelection = typeof updater === "function" ? updater(rowSelection) : updater;
  },
};

// Create column actions object
const columnActions: ImportPreviewColumnActions = $derived({
  onPayeeUpdate,
  onCategoryUpdate,
  onDescriptionUpdate,
  temporaryPayees,
  temporaryCategories,
  categorySuggestions: cleanupState?.categorySuggestions,
});


// Create columns with actions
const columns = $derived(createImportPreviewColumns(columnActions));

// Custom filter function for array includes
const filterFns = {
  arrIncludesSome: (row: any, columnId: string, filterValue: unknown) => {
    if (!filterValue) return true;

    if (typeof filterValue === "object" && "operator" in filterValue && "values" in filterValue) {
      const { operator, values } = filterValue as { operator: string; values: string[] };
      if (!values || values.length === 0) return true;

      const rowValue = row.getValue(columnId);
      const isIncluded = values.includes(rowValue);

      if (operator === "arrNotIncludesSome") {
        return !isIncluded;
      }
      return isIncluded;
    }

    if (Array.isArray(filterValue)) {
      if (filterValue.length === 0) return true;
      const value = row.getValue(columnId);
      return filterValue.includes(value);
    }

    return true;
  },
};
</script>

<AdvancedDataTable
  {data}
  {columns}
  {filterFns}
  {loading}
  bind:table
  getRowId={(row) => String(row.rowIndex)}
  state={tableState}
  handlers={tableHandlers}
  features={{
    sorting: true,
    filtering: true,
    pagination: true,
    rowSelection: true,
    columnVisibility: true,
  }}
  pageSizeOptions={[25, 50, 100, 250]}
  showPagination={true}
  showSelection={true}
  emptyMessage="No import data to preview."
>
  {#snippet toolbar(tableInstance)}
    <ImportPreviewToolbar
      table={tableInstance}
      {data}
      {importOptions}
      {onImportOptionsChange}
      {cleanupState}
      {onCleanupStateChange}
      {processorCount}
      {onOpenProcessorFilter}
      bind:cleanupSheetOpen
    />
  {/snippet}
</AdvancedDataTable>
