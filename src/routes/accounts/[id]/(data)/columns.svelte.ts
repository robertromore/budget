import type { EditableEntityItem, TransactionsFormat } from "$lib/types";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import type { CellContext, Column, ColumnDef, FilterFnOption } from "@tanstack/table-core";
import DataTableColumnHeader from "../(components)/data-table-column-header.svelte";
import EditableDateCell from "../(components)/(cells)/editable-date-cell.svelte";
import { getLocalTimeZone, type DateValue } from "@internationalized/date";
import EditableEntityCell from "../(components)/(cells)/editable-entity-cell.svelte";
import DataTableEditableCell from "../(components)/(cells)/data-table-editable-cell.svelte";
import EditableNumericCell from "../(components)/(cells)/editable-numeric-cell.svelte";
import DataTableActions from "../(components)/data-table-actions.svelte";
import { compareAlphanumeric } from "$lib/utils";
import type { Category, Payee } from "$lib/schema";
import DataTableEditableStatusCell from "../(components)/(cells)/data-table-editable-status-cell.svelte";
import ManagePayeeForm from "../(components)/manage-payee-form.svelte";
import ManageCategoryForm from "../(components)/manage-category-form.svelte";
import type { CategoriesState } from "$lib/states/categories.svelte";
import type { PayeesState } from "$lib/states/payees.svelte";
import DataTableFacetedFilterStatus from "../(components)/(facets)/data-table-faceted-filter-status.svelte";
import DataTableFacetedFilterCategory from "../(components)/(facets)/data-table-faceted-filter-category.svelte";
import DataTableFacetedFilterPayee from "../(components)/(facets)/data-table-faceted-filter-payee.svelte";
import DataTableFacetedFilterDate from "../(components)/(facets)/data-table-faceted-filter-date.svelte";
import CalendarDays from "@lucide/svelte/icons/calendar-days";
import HandCoins from "@lucide/svelte/icons/hand-coins";
import SquareMousePointer from "@lucide/svelte/icons/square-mouse-pointer";
import CircleCheckBig from "@lucide/svelte/icons/circle-check-big";
import { ExpandToggle } from "$lib/components/ui/expand-toggle";
import { currencyFormatter } from "$lib/utils/formatters";
import type { Component } from "svelte";

export const columns = (
  categories: CategoriesState,
  payees: PayeesState,
  updateData: (id: number, columnId: string, newValue?: unknown) => Promise<void>
): ColumnDef<TransactionsFormat>[] => {
  const updateHandler = (
    info: CellContext<TransactionsFormat, unknown>,
    columnId: string,
    new_value: unknown,
    value_transformer: (value: unknown) => unknown = (value) => value
  ) => {
    return updateData(info.row.original.id, columnId, value_transformer(new_value));
  };

  return [
    {
      id: "select-col",
      header: ({ table }) =>
        renderComponent(Checkbox, {
          checked: table.getIsAllPageRowsSelected(),
          indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select all",
        }),
      cell: ({ row }) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        }),
      aggregatedCell: ({ row }) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        }),
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "expand-contract-col",
      header: ({ table }) =>
        table.getCanSomeRowsExpand()
          ? renderComponent(ExpandToggle, {
              checked: table.getIsAllRowsExpanded(),
              // disabled: table.getCanSomeRowsExpand(),
              onCheckedChange: table.getToggleAllRowsExpandedHandler(),
              controlledChecked: true,
              "aria-label": "Expand/contract all",
            })
          : "",
      aggregatedCell: ({ row }) =>
        row.getCanExpand()
          ? renderComponent(ExpandToggle, {
              checked: row.getIsExpanded(),
              disabled: !row.getCanExpand(),
              onCheckedChange: row.getToggleExpandedHandler(),
              controlledChecked: true,
              "aria-label": "Expand/contract row",
            })
          : "",
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      cell: (info) => info.getValue(),
      aggregatedCell: () => {},
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "ID",
        }),
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      enableGrouping: false,
      meta: {
        label: "ID",
      },
    },
    {
      accessorKey: "date",
      id: "date",
      cell: (info) =>
        renderComponent(EditableDateCell, {
          value: info.getValue() as DateValue,
          onUpdateValue: (new_value: unknown) =>
            updateHandler(info, "date", new_value, (new_value) =>
              (new_value as DateValue)?.toDate(getLocalTimeZone()).toString()
            ),
        }),
      aggregatedCell: () => {},
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          title: "Date",
          column,
        }),
      sortingFn: "datetime",
      filterFn: "dateAfter" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Date",
        facetedFilter: (column: Column<TransactionsFormat, unknown>) => {
          return {
            name: "Date",
            icon: CalendarDays,
            column,
            component: () =>
              renderComponent(DataTableFacetedFilterDate<TransactionsFormat, unknown>, {
                column,
              }),
          };
        },
        availableFilters: [
          {
            id: "dateIn",
            label: "in",
          },
          {
            id: "dateBefore",
            label: "before",
          },
          {
            id: "dateAfter",
            label: "after",
          },
        ],
      },
    },
    {
      accessorKey: "payeeId",
      id: "payee",
      cell: (info) =>
        renderComponent(EditableEntityCell, {
          value: payees.getById(info.getValue() as number) as EditableEntityItem,
          entityLabel: "payee",
          onUpdateValue: (new_value) => updateHandler(info, "payeeId", new_value),
          entities: payees.payees as EditableEntityItem[],
          icon: HandCoins as unknown as Component,
          management: {
            enable: true,
            component: ManagePayeeForm,
            onSave: (new_value: EditableEntityItem, is_new: boolean) => {
              if (is_new) {
                payees.addPayee(new_value as Payee);
              } else {
                payees.updatePayee(new_value as Payee);
              }
            },
            onDelete: (id: number) => {
              payees.deletePayee(id);
            },
          },
        }),
      aggregatedCell: () => {},
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "Payee",
        }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(
          payees.getById(rowA.getValue("payee"))?.name || "",
          payees.getById(rowB.getValue("payee"))?.name || ""
        );
      },
      enableColumnFilter: true,
      filterFn: "entityIsFilter" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Payee",
        facetedFilter: (column: Column<TransactionsFormat, unknown>, value: unknown[]) => {
          return {
            name: "Payee",
            icon: HandCoins,
            column,
            value,
            component: () =>
              renderComponent(DataTableFacetedFilterPayee<TransactionsFormat, unknown>, {
                column,
              }),
          };
        },
        availableFilters: [
          {
            id: "entityIsFilter",
            label: "is",
          },
          {
            id: "entityIsNotFilter",
            label: "is not",
          },
        ],
      },
    },
    {
      accessorKey: "notes",
      id: "notes",
      cell: (info) =>
        renderComponent(DataTableEditableCell, {
          value: info.getValue(),
          onUpdateValue: (new_value: string) =>
            updateData(info.row.original.id, "notes", new_value),
        }),
      aggregatedCell: () => {},
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "Notes",
        }),
      enableSorting: false,
      enableGrouping: false,
      meta: {
        label: "Notes",
      },
    },
    {
      accessorKey: "categoryId",
      id: "category",
      cell: (info) =>
        renderComponent(EditableEntityCell, {
          value: categories.getById(info.getValue() as number) as EditableEntityItem,
          entityLabel: "category",
          onUpdateValue: (new_value) => updateHandler(info, "categoryId", new_value),
          entities: categories.categories as EditableEntityItem[],
          icon: SquareMousePointer as unknown as Component,
          management: {
            enable: true,
            component: ManageCategoryForm,
            onSave: (new_value: EditableEntityItem, is_new: boolean) => {
              if (is_new) {
                categories.addCategory(new_value as Category);
              } else {
                categories.updateCategory(new_value as Category);
              }
            },
            onDelete: (id: number) => {
              categories.deleteCategory(id);
            },
          },
        }),
      aggregatedCell: () => {},
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "Category",
        }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(
          categories.getById(rowA.getValue("category"))?.name || "",
          categories.getById(rowB.getValue("category"))?.name || ""
        );
      },
      filterFn: "entityIsFilter" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Category",
        facetedFilter: (column: Column<TransactionsFormat, unknown>) => {
          return {
            name: "Category",
            icon: SquareMousePointer,
            column,
            component: () =>
              renderComponent(DataTableFacetedFilterCategory<TransactionsFormat, unknown>, {
                column,
              }),
          };
        },
        availableFilters: [
          {
            id: "entityIsFilter",
            label: "is",
          },
          {
            id: "entityIsNotFilter",
            label: "is not",
          },
        ],
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      cell: (info) =>
        renderComponent(EditableNumericCell, {
          value: info.getValue() as number,
          onUpdateValue: (new_value) => updateHandler(info, "amount", new_value),
        }),
      aggregatedCell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(isNaN(value) ? 0 : (value ?? 0));
      },
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "Amount",
        }),
      sortingFn: (rowA, rowB) =>
        ((rowA.getValue("amount") as number) || 0) - ((rowB.getValue("amount") as number) || 0),
      enableGrouping: false,
      meta: {
        label: "Amount",
      },
    },
    {
      accessorKey: "balance",
      id: "balance",
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: "Balance",
        }),
      cell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(isNaN(value) ? 0 : (value ?? 0));
      },
      aggregatedCell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(isNaN(value) ? 0 : (value ?? 0));
      },
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      meta: {
        label: "Balance",
      },
    },
    {
      accessorKey: "status",
      id: "status",
      cell: (info) =>
        renderComponent(DataTableEditableStatusCell, {
          value: info.getValue() as string,
          onUpdateValue: (new_value) => updateHandler(info, "status", new_value),
        }),
      aggregatedCell: () => {},
      header: "",
      filterFn: "equalsString" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<TransactionsFormat, unknown>, value: unknown[]) => {
          return {
            name: "Status",
            icon: CircleCheckBig,
            column,
            value,
            component: () => {
              return renderComponent(DataTableFacetedFilterStatus<TransactionsFormat, unknown>, {
                column,
              });
            },
          };
        },
        availableFilters: [
          {
            id: "equalsString",
            label: "is",
          },
          {
            id: "doesntEqualString",
            label: "is not",
          },
        ],
      },
    },
    {
      id: "actions",
      accessorFn: (row) => row.id,
      aggregatedCell: () => {},
      header: "",
      cell: (info) => renderComponent(DataTableActions, { id: info.getValue() as number }),
      enableColumnFilter: false,
      enableSorting: false,
      enableGrouping: false,
      enableHiding: false,
    },
  ];
};
