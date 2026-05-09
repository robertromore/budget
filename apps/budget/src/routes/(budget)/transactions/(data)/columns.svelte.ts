import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { Transaction } from "$core/schema";
import { dateFormatter } from "$lib/utils/date-formatters";
import type { ColumnDef } from "@tanstack/table-core";
import AccountCell from "../(components)/account-cell.svelte";
import AmountCell from "../(components)/amount-cell.svelte";
import StatusCell from "../(components)/status-cell.svelte";

export function createColumns(): ColumnDef<Transaction>[] {
  return [
    {
      id: "select",
      header: ({ table }) =>
        renderComponent(Checkbox, {
          checked: table.getIsAllPageRowsSelected(),
          indeterminate:
            table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
          "aria-label": "Select all",
        }),
      cell: ({ row }) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          "aria-label": "Select row",
        }),
      enableSorting: false,
      enableHiding: false,
      meta: { headerClass: "w-[32px]", cellClass: "w-[32px]" },
    },
    {
      id: "date",
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => {
        const value = row.original.date;
        if (!value) return "—";
        const parsed = new Date(value);
        return dateFormatter.format(parsed);
      },
      meta: { headerClass: "w-[110px]", cellClass: "w-[110px] tabular-nums" },
    },
    {
      id: "account",
      accessorFn: (row) => row.accountId,
      header: "Account",
      cell: ({ row }) =>
        renderComponent(AccountCell, { accountId: row.original.accountId }),
      enableSorting: false,
      meta: { headerClass: "w-[200px]", cellClass: "w-[200px]" },
    },
    {
      id: "payee",
      accessorFn: (row) => row.payee?.name ?? "",
      header: "Payee",
      cell: ({ row }) => row.original.payee?.name ?? "—",
      enableSorting: false,
    },
    {
      id: "category",
      accessorFn: (row) => row.category?.name ?? "",
      header: "Category",
      cell: ({ row }) => {
        const name = row.original.category?.name;
        return name ?? "—";
      },
      enableSorting: false,
    },
    {
      id: "notes",
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => row.original.notes ?? "",
      enableSorting: false,
      meta: { cellClass: "max-w-[240px] truncate text-muted-foreground text-sm" },
    },
    {
      id: "amount",
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => renderComponent(AmountCell, { amount: row.original.amount }),
      meta: {
        headerClass: "text-right w-[120px]",
        cellClass: "text-right w-[120px]",
      },
    },
    {
      id: "status",
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => renderComponent(StatusCell, { status: row.original.status }),
      meta: { headerClass: "w-[100px]", cellClass: "w-[100px]" },
    },
  ];
}
