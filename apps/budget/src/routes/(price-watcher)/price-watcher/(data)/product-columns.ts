import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import { renderComponent } from "$lib/components/ui/data-table";
import { Badge } from "$lib/components/ui/badge";
import type { PriceProduct } from "$core/schema/price-products";
import { capitalize } from "$core/utils/string-utilities";
import { currencyFormatter } from "$lib/utils/formatters";
import type { Column, ColumnDef } from "@tanstack/table-core";
import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import Pause from "@lucide/svelte/icons/pause";
import ProductImage from "../(components)/product-image.svelte";

const statusOptions: FacetedFilterOption[] = [
  { label: "Active", value: "active", icon: CircleCheck },
  { label: "Paused", value: "paused", icon: Pause },
  { label: "Error", value: "error", icon: AlertTriangle },
];

const arrIncludesFilter = (row: any, columnId: string, filterValue: unknown) => {
  if (!filterValue) return true;
  if (typeof filterValue === "object" && "operator" in filterValue && "values" in filterValue) {
    const { operator, values } = filterValue as { operator: string; values: string[] };
    if (!values || values.length === 0) return true;
    const rowValue = row.getValue(columnId);
    return operator === "arrNotIncludesSome" ? !values.includes(rowValue) : values.includes(rowValue);
  }
  if (Array.isArray(filterValue)) {
    if (filterValue.length === 0) return true;
    return filterValue.includes(row.getValue(columnId));
  }
  return true;
};

export function getProductColumns(): ColumnDef<PriceProduct>[] {
  return [
    {
      id: "image",
      header: "",
      cell: (info) =>
        renderComponent(ProductImage, {
          imageUrl: info.row.original.imageUrl,
          alt: info.row.original.name,
          size: "sm",
        }),
      enableSorting: false,
      enableGlobalFilter: false,
      size: 56,
      meta: {
        label: "Image",
      },
    },
    {
      accessorKey: "name",
      header: "Product",
      cell: (info) => {
        const name = info.getValue() as string;
        return name.length > 60 ? name.slice(0, 60) + "…" : name;
      },
      enableSorting: true,
      enableGlobalFilter: true,
      size: 300,
      meta: {
        label: "Product",
      },
    },
    {
      accessorKey: "retailer",
      header: "Retailer",
      cell: (info) => capitalize(info.getValue() as string),
      enableSorting: true,
      filterFn: arrIncludesFilter as any,
      meta: {
        label: "Retailer",
      },
    },
    {
      accessorKey: "currentPrice",
      header: "Current",
      cell: (info) => {
        const value = info.getValue() as number | null;
        return value !== null ? currencyFormatter.format(value) : "—";
      },
      enableSorting: true,
      enableGlobalFilter: false,
      meta: {
        label: "Current Price",
      },
    },
    {
      accessorKey: "lowestPrice",
      header: "Lowest",
      cell: (info) => {
        const value = info.getValue() as number | null;
        return value !== null ? currencyFormatter.format(value) : "—";
      },
      enableSorting: true,
      enableGlobalFilter: false,
      meta: {
        label: "Lowest Price",
      },
    },
    {
      accessorKey: "highestPrice",
      header: "Highest",
      cell: (info) => {
        const value = info.getValue() as number | null;
        return value !== null ? currencyFormatter.format(value) : "—";
      },
      enableSorting: true,
      enableGlobalFilter: false,
      meta: {
        label: "Highest Price",
        hiddenByDefault: true,
      },
    },
    {
      accessorKey: "targetPrice",
      header: "Target",
      cell: (info) => {
        const value = info.getValue() as number | null;
        return value !== null ? currencyFormatter.format(value) : "—";
      },
      enableSorting: true,
      enableGlobalFilter: false,
      meta: {
        label: "Target Price",
      },
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: (info) => info.getValue() as string,
      enableSorting: true,
      filterFn: arrIncludesFilter as any,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<PriceProduct, unknown>) => ({
          name: "Status",
          icon: CircleCheck,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Status",
              options: statusOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "lastCheckedAt",
      header: "Last Checked",
      cell: (info) => {
        const value = info.getValue() as string | null;
        return value ? new Date(value).toLocaleDateString() : "Never";
      },
      enableSorting: true,
      enableGlobalFilter: false,
      meta: {
        label: "Last Checked",
      },
    },
  ];
}

export const productFilterFns = {
  arrIncludesFilter,
};
