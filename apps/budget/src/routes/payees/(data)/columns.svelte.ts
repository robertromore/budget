import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { Payee } from "$lib/schema";
import type { PayeesState } from "$lib/states/entities/payees.svelte";
import { compareAlphanumeric } from "$lib/utils";
import type { ColumnDef, FilterFnOption } from "@tanstack/table-core";
import PayeeColumnHeader from "../(components)/payee-column-header.svelte";
import PayeeNameCell from "../(components)/(cells)/payee-name-cell.svelte";
import PayeeTypeCell from "../(components)/(cells)/payee-type-cell.svelte";
import PayeeContactCell from "../(components)/(cells)/payee-contact-cell.svelte";
import PayeeAvgAmountCell from "../(components)/(cells)/payee-avg-amount-cell.svelte";
import PayeeLastTransactionCell from "../(components)/(cells)/payee-last-transaction-cell.svelte";
import PayeeStatusCell from "../(components)/(cells)/payee-status-cell.svelte";
import PayeeActionsCell from "../(components)/(cells)/payee-actions-cell.svelte";

export function columns(
  _payeesState: PayeesState,
  onView: (payee: Payee) => void,
  onEdit: (payee: Payee) => void,
  onDelete: (payee: Payee) => void,
  onViewAnalytics: (payee: Payee) => void
): ColumnDef<Payee>[] {
  return [
    {
      id: "select-col",
      header: ({ table }) => {
        const allPageRowsSelected = table.getIsAllPageRowsSelected();
        const somePageRowsSelected = table.getIsSomePageRowsSelected();

        return renderComponent(Checkbox, {
          checked: allPageRowsSelected,
          indeterminate: somePageRowsSelected && !allPageRowsSelected,
          onCheckedChange: (value) => {
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
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "ID",
        }),
      cell: (info) => info.getValue(),
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      meta: {
        label: "ID",
      },
    },
    {
      accessorKey: "name",
      id: "name",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Name",
        }),
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeNameCell, { payee });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.name || "", rowB.original.name || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<Payee>,
      meta: {
        label: "Name",
      },
    },
    {
      accessorKey: "payeeType",
      id: "type",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Type",
        }),
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeTypeCell, { payeeType: payee.payeeType });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.payeeType || "", rowB.original.payeeType || ""),
      enableColumnFilter: true,
      filterFn: "equalsString" as FilterFnOption<Payee>,
      meta: {
        label: "Type",
      },
    },
    {
      accessorKey: "email",
      id: "contact",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Contact",
        }),
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeContactCell, {
          email: payee.email,
          phone: payee.phone
        });
      },
      sortingFn: (rowA, rowB) => compareAlphanumeric(rowA.original.email || "", rowB.original.email || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<Payee>,
      meta: {
        label: "Contact",
      },
    },
    {
      accessorKey: "avgAmount",
      id: "avgAmount",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Avg Amount",
        }),
      cell: (info) => {
        const avgAmount = info.getValue() as number | null;
        return renderComponent(PayeeAvgAmountCell, { avgAmount });
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aAmount = rowA.original.avgAmount || 0;
        const bAmount = rowB.original.avgAmount || 0;
        return aAmount - bAmount;
      },
      enableColumnFilter: false,
      meta: {
        label: "Avg Amount",
      },
    },
    {
      accessorKey: "lastTransactionDate",
      id: "lastTransaction",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Last Transaction",
        }),
      cell: (info) => {
        const lastTransactionDate = info.getValue() as string | null;
        return renderComponent(PayeeLastTransactionCell, { lastTransactionDate });
      },
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aDate = rowA.original.lastTransactionDate || "";
        const bDate = rowB.original.lastTransactionDate || "";
        return aDate.localeCompare(bDate);
      },
      enableColumnFilter: false,
      meta: {
        label: "Last Transaction",
      },
    },
    {
      accessorKey: "isActive",
      id: "status",
      header: ({ column }) =>
        renderComponent(PayeeColumnHeader<Payee, unknown>, {
          column,
          title: "Status",
        }),
      cell: (info) => {
        const isActive = info.getValue() as boolean;
        return renderComponent(PayeeStatusCell, { isActive });
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: "equals" as FilterFnOption<Payee>,
      meta: {
        label: "Status",
      },
    },
    {
      id: "actions",
      header: "",
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeActionsCell, {
          payee,
          onView,
          onEdit,
          onDelete,
          onViewAnalytics,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
