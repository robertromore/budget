import type { ColumnDef, Column } from "@tanstack/table-core";
import type { TopCategoryData } from "$lib/types";
import { renderComponent } from "$lib/components/ui/data-table";
import { Checkbox } from "$lib/components/ui/checkbox";
import { formatCurrency } from "$lib/utils/formatters";
import DataTableFacetedFilterAmount from "../(components)/(facets)/data-table-faceted-filter-amount.svelte";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import Hash from "@lucide/svelte/icons/hash";
import Percent from "@lucide/svelte/icons/percent";

// Simple number formatter for counts (no decimals)
const countFormatter = (value: number) => Math.round(value).toString();

// Percentage formatter (one decimal place with % symbol)
const percentageFormatter = (value: number) => `${value.toFixed(1)}%`;

/**
 * Column definitions for the top categories analytics table
 */
export function createCategoryColumns(): ColumnDef<TopCategoryData>[] {
  return [
    // Selection column
    {
      id: "select",
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
      cell: ({ row }) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        }),
      enableSorting: false,
      enableHiding: false,
      enablePinning: false,
      enableColumnFilter: false,
    },
    // Category name
    {
      id: "category",
      accessorKey: "name",
      header: "Category",
      enableSorting: true,
      enableHiding: true,
      enableColumnFilter: true,
      filterFn: "nameContains" as any,
      meta: {
        label: "Category",
        headerClass: "min-w-[200px]",
      },
    },
    // Amount
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount),
      enableSorting: true,
      enableHiding: true,
      enableColumnFilter: true,
      filterFn: "amountFilter" as any,
      meta: {
        label: "Amount",
        headerClass: "text-right",
        cellClass: "text-right font-medium",
        facetedFilter: (column: Column<TopCategoryData, unknown>) => {
          return {
            name: "Amount",
            icon: DollarSign,
            column,
            value: [],
            component: () =>
              renderComponent(DataTableFacetedFilterAmount as any, {
                column,
                title: "Amount",
              }),
          };
        },
      },
    },
    // Transaction count
    {
      id: "count",
      accessorKey: "count",
      header: "Transactions",
      cell: ({ row }) => row.original.count.toString(),
      enableSorting: true,
      enableHiding: true,
      enableColumnFilter: true,
      filterFn: "countFilter" as any,
      meta: {
        label: "Transactions",
        headerClass: "text-right",
        cellClass: "text-right",
        facetedFilter: (column: Column<TopCategoryData, unknown>) => {
          return {
            name: "Transaction Count",
            icon: Hash,
            column,
            value: [],
            component: () =>
              renderComponent(DataTableFacetedFilterAmount as any, {
                column,
                title: "Transaction Count",
                formatter: countFormatter,
              }) as any,
          };
        },
      },
    },
    // Percentage
    {
      id: "percentage",
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }) => `${row.original.percentage.toFixed(1)}%`,
      enableSorting: true,
      enableHiding: true,
      enableColumnFilter: true,
      filterFn: "percentageFilter" as any,
      meta: {
        label: "Percentage",
        headerClass: "text-right",
        cellClass: "text-right",
        facetedFilter: (column: Column<TopCategoryData, unknown>) => {
          return {
            name: "Percentage",
            icon: Percent,
            column,
            value: [],
            component: () =>
              renderComponent(DataTableFacetedFilterAmount as any, {
                column,
                title: "Percentage",
                formatter: percentageFormatter,
              }) as any,
          };
        },
      },
    },
  ];
}
