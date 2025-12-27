/**
 * Import Preview Table Column Definitions
 *
 * Column definitions for the import preview data table, following the
 * same pattern as schedule-columns.ts for consistency.
 */

import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { CategorySuggestion, ImportRow } from "$lib/types/import";
import AlertCircle from "@lucide/svelte/icons/alert-circle";
import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
import CheckCircle from "@lucide/svelte/icons/check-circle";
import Circle from "@lucide/svelte/icons/circle";
import type { Column, ColumnDef } from "@tanstack/table-core";
import ImportTableAmountCell from "./import-table-amount-cell.svelte";
import ImportTableCategoryCell from "./import-table-category-cell.svelte";
import ImportTableDescriptionCell from "./import-table-description-cell.svelte";
import ImportTablePayeeCell, { type AliasCandidate } from "./import-table-payee-cell.svelte";
import ImportTableStatusCell from "./import-table-status-cell.svelte";
import { DataTableColumnHeader } from "$lib/components/data-table/core";

// Filter options for validation status
const statusFilterOptions: FacetedFilterOption[] = [
  { label: "Valid", value: "valid", icon: CheckCircle },
  { label: "Pending", value: "pending", icon: Circle },
  { label: "Warning", value: "warning", icon: AlertTriangle },
  { label: "Invalid", value: "invalid", icon: AlertCircle },
];

// Custom filter function for status array filter
const arrIncludesFilter = (row: any, columnId: string, filterValue: unknown) => {
  if (!filterValue) return true;

  // Handle format with operator
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

  // Handle array format
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    const value = row.getValue(columnId);
    return filterValue.includes(value);
  }

  return true;
};

export interface ImportPreviewColumnActions {
  onPayeeUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  onPayeeAliasCandidate?: (rowIndex: number, alias: AliasCandidate) => void;
  onCategoryUpdate?: (
    rowIndex: number,
    categoryId: number | null,
    categoryName: string | null
  ) => void;
  onDescriptionUpdate?: (rowIndex: number, description: string | null) => void;
  temporaryPayees?: string[];
  temporaryCategories?: string[];
  categorySuggestions?: CategorySuggestion[];
}

// Re-export for consumers
export type { AliasCandidate };

export function createImportPreviewColumns(
  actions: ImportPreviewColumnActions = {}
): ColumnDef<ImportRow>[] {
  const { onPayeeUpdate, onPayeeAliasCandidate, onCategoryUpdate, onDescriptionUpdate, temporaryPayees, temporaryCategories, categorySuggestions } =
    actions;

  return [
    // Selection column
    {
      id: "select-col",
      header: ({ table }) => {
        const allPageRowsSelected = table.getIsAllPageRowsSelected();
        const somePageRowsSelected = table.getIsSomePageRowsSelected();

        return renderComponent(Checkbox, {
          checked: allPageRowsSelected,
          indeterminate: somePageRowsSelected && !allPageRowsSelected,
          onCheckedChange: (value: boolean) => {
            if (value) {
              table.toggleAllPageRowsSelected(true);
            } else {
              table.toggleAllRowsSelected(false);
            }
          },
          controlledChecked: true,
          "aria-label": "Select all on page",
        });
      },
      cell: ({ row }) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },

    // Row number column
    {
      id: "rowIndex",
      accessorKey: "rowIndex",
      header: "#",
      cell: ({ row }) => row.original.rowIndex + 1,
      enableColumnFilter: false,
      enableSorting: false,
      meta: {
        label: "#",
        headerClass: "w-12",
        cellClass: "text-muted-foreground text-xs",
      },
    },

    // Status column
    {
      id: "validationStatus",
      accessorKey: "validationStatus",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Status",
        }),
      cell: ({ row }) => renderComponent(ImportTableStatusCell, { row }),
      sortingFn: (rowA, rowB) => {
        const statusOrder = { invalid: 0, warning: 1, pending: 2, valid: 3 };
        const statusA =
          statusOrder[rowA.original.validationStatus as keyof typeof statusOrder] || 0;
        const statusB =
          statusOrder[rowB.original.validationStatus as keyof typeof statusOrder] || 0;
        return statusA - statusB;
      },
      enableColumnFilter: true,
      filterFn: arrIncludesFilter,
      meta: {
        label: "Status",
        headerClass: "w-24",
        facetedFilter: (column: Column<ImportRow, unknown>) => ({
          name: "Status",
          icon: CheckCircle,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Status",
              options: statusFilterOptions,
            }),
        }),
      },
    },

    // Date column
    {
      id: "date",
      accessorKey: "date",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Date",
        }),
      cell: ({ row }) => row.original.normalizedData["date"] || "—",
      accessorFn: (row) => row.normalizedData["date"],
      enableColumnFilter: false,
      meta: {
        label: "Date",
        headerClass: "w-28",
      },
    },

    // Payee column
    {
      id: "payee",
      accessorKey: "payee",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Payee",
        }),
      cell: ({ row }) =>
        renderComponent(ImportTablePayeeCell, {
          row,
          ...(onPayeeUpdate ? { onUpdate: onPayeeUpdate } : {}),
          ...(onPayeeAliasCandidate ? { onAliasCandidate: onPayeeAliasCandidate } : {}),
          ...(temporaryPayees ? { temporaryPayees } : {}),
        }),
      accessorFn: (row) => row.normalizedData["payee"],
      enableColumnFilter: true,
      meta: {
        label: "Payee",
      },
    },

    // Amount column
    {
      id: "amount",
      accessorKey: "amount",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Amount",
        }),
      cell: ({ row }) => renderComponent(ImportTableAmountCell, { row }),
      accessorFn: (row) => row.normalizedData["amount"],
      enableColumnFilter: false,
      meta: {
        label: "Amount",
        headerClass: "w-28 text-right",
        cellClass: "text-right",
      },
    },

    // Category column
    {
      id: "category",
      accessorKey: "category",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Category",
        }),
      cell: ({ row }) => {
        const suggestion = categorySuggestions?.find(s => s.rowIndex === row.original.rowIndex);
        return renderComponent(ImportTableCategoryCell, {
          row,
          ...(onCategoryUpdate ? { onUpdate: onCategoryUpdate } : {}),
          ...(temporaryCategories ? { temporaryCategories } : {}),
          ...(suggestion ? { suggestion } : {}),
        });
      },
      accessorFn: (row) => row.normalizedData["category"],
      sortingFn: (rowA, rowB) => {
        const categoryA = (rowA.original.normalizedData["category"] as string | null) || "";
        const categoryB = (rowB.original.normalizedData["category"] as string | null) || "";
        return categoryA.toLowerCase().localeCompare(categoryB.toLowerCase());
      },
      enableColumnFilter: true,
      meta: {
        label: "Category",
      },
    },

    // Description column
    {
      id: "description",
      accessorKey: "description",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Description",
        }),
      cell: ({ row }) =>
        renderComponent(ImportTableDescriptionCell, {
          row,
          ...(onDescriptionUpdate ? { onUpdate: onDescriptionUpdate } : {}),
        }),
      accessorFn: (row) => row.normalizedData["description"] || row.normalizedData["notes"],
      enableColumnFilter: false,
      meta: {
        label: "Description",
      },
    },
  ];
}
