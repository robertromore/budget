import { GenericFacetedFilter, type FacetedFilterOption } from "$lib/components/data-table";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { Payee } from "$lib/schema";
import { compareAlphanumeric } from "$lib/utils";
import Briefcase from "@lucide/svelte/icons/briefcase";
import Building from "@lucide/svelte/icons/building";
import Building2 from "@lucide/svelte/icons/building-2";
import CircleCheck from "@lucide/svelte/icons/circle-check";
import CircleX from "@lucide/svelte/icons/circle-x";
import Landmark from "@lucide/svelte/icons/landmark";
import MoreHorizontal from "@lucide/svelte/icons/more-horizontal";
import User from "@lucide/svelte/icons/user";
import Zap from "@lucide/svelte/icons/zap";
import type { Column, ColumnDef, FilterFnOption } from "@tanstack/table-core";
import PayeeActionsCell from "../(components)/(cells)/payee-actions-cell.svelte";
import PayeeAvgAmountCell from "../(components)/(cells)/payee-avg-amount-cell.svelte";
import PayeeContactCell from "../(components)/(cells)/payee-contact-cell.svelte";
import PayeeLastTransactionCell from "../(components)/(cells)/payee-last-transaction-cell.svelte";
import PayeeNameCell from "../(components)/(cells)/payee-name-cell.svelte";
import PayeeStatusCell from "../(components)/(cells)/payee-status-cell.svelte";
import PayeeTypeCell from "../(components)/(cells)/payee-type-cell.svelte";

// Filter options for payee type
const payeeTypeOptions: FacetedFilterOption[] = [
  { label: "Merchant", value: "merchant", icon: Building2 },
  { label: "Utility", value: "utility", icon: Zap },
  { label: "Employer", value: "employer", icon: Briefcase },
  { label: "Financial Institution", value: "financial_institution", icon: Landmark },
  { label: "Government", value: "government", icon: Building },
  { label: "Individual", value: "individual", icon: User },
  { label: "Other", value: "other", icon: MoreHorizontal },
];

// Filter options for status (isActive boolean)
const statusOptions: FacetedFilterOption[] = [
  { label: "Active", value: "true", icon: CircleCheck },
  { label: "Inactive", value: "false", icon: CircleX },
];

// Known payee types (everything else is treated as "other")
const knownPayeeTypes = ["merchant", "utility", "employer", "financial_institution", "government", "individual"];

interface PayeeColumnActions {
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
}

export function columns(actions: PayeeColumnActions): ColumnDef<Payee>[] {
  return [
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
    {
      accessorKey: "name",
      id: "name",
      header: "Name",
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeNameCell, { payee });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.name || "", rowB.original.name || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<Payee>,
      meta: {
        label: "Name",
      },
    },
    {
      // Use accessorFn to normalize payeeType for faceted values (counts)
      accessorFn: (row) => {
        const rawType = row.payeeType;
        return rawType && knownPayeeTypes.includes(rawType) ? rawType : "other";
      },
      id: "type",
      header: "Type",
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeTypeCell, { payeeType: payee.payeeType });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.payeeType || "", rowB.original.payeeType || ""),
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        // Handle { operator, values } format from GenericFacetedFilter
        if (typeof filterValue === 'object' && 'values' in filterValue) {
          const { operator, values } = filterValue as { operator: string; values: string[] };
          if (!values || values.length === 0) return true;
          const isIncluded = values.includes(value);
          return operator === 'arrNotIncludesSome' ? !isIncluded : isIncluded;
        }
        // Handle array format
        if (Array.isArray(filterValue)) {
          return filterValue.length === 0 || filterValue.includes(value);
        }
        return true;
      },
      meta: {
        label: "Type",
        facetedFilter: (column: Column<Payee, unknown>) => ({
          name: "Type",
          icon: Building2,
          column,
          value: [],
          component: () =>
            renderComponent(GenericFacetedFilter as any, {
              column,
              title: "Type",
              options: payeeTypeOptions,
            }),
        }),
      },
    },
    {
      accessorKey: "email",
      id: "contact",
      header: "Contact",
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeContactCell, {
          email: payee.email,
          phone: payee.phone,
        });
      },
      sortingFn: (rowA, rowB) =>
        compareAlphanumeric(rowA.original.email || "", rowB.original.email || ""),
      enableColumnFilter: true,
      filterFn: "includesString" as FilterFnOption<Payee>,
      meta: {
        label: "Contact",
      },
    },
    {
      accessorKey: "avgAmount",
      id: "avgAmount",
      header: "Avg Amount",
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
      header: "Last Transaction",
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
      // Use accessorFn to convert boolean to string for faceted values (counts)
      accessorFn: (row) => String(row.isActive),
      id: "status",
      header: "Status",
      cell: (info) => {
        const isActive = info.row.original.isActive;
        return renderComponent(PayeeStatusCell, { isActive });
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true;
        const value = row.getValue(columnId) as string;
        // Handle { operator, values } format from GenericFacetedFilter
        if (typeof filterValue === 'object' && 'values' in filterValue) {
          const { operator, values } = filterValue as { operator: string; values: string[] };
          if (!values || values.length === 0) return true;
          const isIncluded = values.includes(value);
          return operator === 'arrNotIncludesSome' ? !isIncluded : isIncluded;
        }
        // Handle array format
        if (Array.isArray(filterValue)) {
          return filterValue.length === 0 || filterValue.includes(value);
        }
        return true;
      },
      meta: {
        label: "Status",
        facetedFilter: (column: Column<Payee, unknown>) => ({
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
      id: "actions",
      header: "",
      cell: (info) => {
        const payee = info.row.original;
        return renderComponent(PayeeActionsCell, {
          payee,
          onView: actions.onView,
          onEdit: actions.onEdit,
          onDelete: actions.onDelete,
          onViewAnalytics: actions.onViewAnalytics,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
