import CalendarDays from "@lucide/svelte/icons/calendar-days";
import DollarSign from "@lucide/svelte/icons/dollar-sign";
import HandCoins from "@lucide/svelte/icons/hand-coins";
import SquareCheck from "@lucide/svelte/icons/square-check";
import SquareMousePointer from "@lucide/svelte/icons/square-mouse-pointer";
import StickyNote from "@lucide/svelte/icons/sticky-note";
import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import { ExpandToggle } from "$lib/components/ui/expand-toggle";
import type { Category, Payee } from "$lib/schema";
import type { CategoriesState } from "$lib/states/entities/categories.svelte";
import type { PayeesState } from "$lib/states/entities/payees.svelte";
import type { EditableEntityItem, TransactionsFormat } from "$lib/types";
import { compareAlphanumeric } from "$lib/utils";
import { currencyFormatter } from "$lib/utils/formatters";
import { dateFormatter } from "$lib/utils/date-formatters";
import { type DateValue, getLocalTimeZone } from "@internationalized/date";
import type { CellContext, Column, ColumnDef, FilterFnOption } from "@tanstack/table-core";
import type { Component } from "svelte";
// Import shared cell components
import {
  EditableDateCell,
  EditableNumericCell,
} from "$lib/components/shared/data-table/cells";

// Import route-specific cell components
import DataTableEditableCell from "../(components)/(cells)/data-table-editable-cell.svelte";
import DataTableEditableStatusCell from "../(components)/(cells)/data-table-editable-status-cell.svelte";
import EditableEntityCell from "../(components)/(cells)/editable-entity-cell.svelte";
import EditablePayeeCell from "../(components)/(cells)/editable-payee-cell.svelte";
import ReadOnlyCellWithIcon from "../(components)/(cells)/read-only-cell-with-icon.svelte";
import SelectionCheckboxCell from "../(components)/(cells)/selection-checkbox-cell.svelte";
import DataTableFacetedFilterAmount from "../(components)/(facets)/data-table-faceted-filter-amount.svelte";
import DataTableFacetedFilterCategory from "../(components)/(facets)/data-table-faceted-filter-category.svelte";
import DataTableFacetedFilterDateWithOperators from "../(components)/(facets)/data-table-faceted-filter-date-with-operators.svelte";
import DataTableFacetedFilterPayee from "../(components)/(facets)/data-table-faceted-filter-payee.svelte";
import DataTableFacetedFilterStatus from "../(components)/(facets)/data-table-faceted-filter-status.svelte";
import DataTableActions from "../(components)/data-table-actions.svelte";
import DataTableColumnHeader from "../(components)/data-table-column-header.svelte";
import BudgetAllocationSimpleCell from "../(components)/(cells)/budget-allocation-simple-cell.svelte";
import EditableCategoryCell from "../(components)/(cells)/editable-category-cell.svelte";
import ReadOnlyCategoryCell from "../(components)/(cells)/read-only-category-cell.svelte";
import TransferPayeeCell from "../(components)/(cells)/transfer-payee-cell.svelte";
import NotesCellWithBadges from "../(components)/(cells)/notes-cell-with-badges.svelte";

export const columns = (
  categories: CategoriesState,
  payees: PayeesState,
  updateData: (id: number, columnId: string, newValue?: unknown) => Promise<void>,
  onScheduleClick?: (transaction: TransactionsFormat) => void,
  budgetCount: number = 0
): ColumnDef<TransactionsFormat>[] => {
  const updateHandler = (
    info: CellContext<TransactionsFormat, unknown>,
    columnId: string,
    new_value: unknown,
    value_transformer: (value: unknown) => unknown = (value) => value
  ) => {
    const id = info.row.original.id;
    // Only update for actual transactions (numeric IDs), not scheduled ones (string IDs)
    if (typeof id === "number") {
      return updateData(id, columnId, value_transformer(new_value));
    }
  };

  /**
   * Helper function to render cells that are editable for normal transactions
   * but read-only with icon for scheduled transactions
   */
  const renderEditableCell = (
    info: CellContext<TransactionsFormat, unknown>,
    config: {
      scheduledRenderer: () => { value: string; icon?: Component };
      editableRenderer: () => { component: any; props: Record<string, unknown> };
    }
  ) => {
    const transaction = info.row.original;

    // Read-only for scheduled transactions
    if (transaction.status === "scheduled") {
      const { value, icon } = config.scheduledRenderer();
      return renderComponent(ReadOnlyCellWithIcon, { value, icon });
    }

    // Editable for normal transactions
    const { component, props } = config.editableRenderer();
    return renderComponent(component, props);
  };

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
              // Select all on current page
              table.toggleAllPageRowsSelected(true);
            } else {
              // Deselect all (both page and all rows)
              table.toggleAllRowsSelected(false);
            }
          },
          controlledChecked: true,
          "aria-label": "Select all on page",
        });
      },
      cell: ({ row, table }) => {
        const transaction = row.original;
        const isScheduled = transaction.status === "scheduled";

        return renderComponent(SelectionCheckboxCell, {
          row,
          table,
          disabled: !row.getCanSelect() || isScheduled,
        });
      },
      aggregatedCell: ({ row, table }) =>
        renderComponent(SelectionCheckboxCell, {
          row,
          table,
          disabled: !row.getCanSelect(),
        }),
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false,
      meta: {
        label: "Select",
      },
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
      meta: {
        label: "Expand/Contract",
      },
    },
    {
      accessorKey: "seq",
      cell: (info) => {
        const transaction = info.row.original;
        // Show dash for upcoming scheduled transactions (no seq assigned)
        if (transaction.status === "scheduled" || info.getValue() === null) {
          return "—";
        }
        return info.getValue();
      },
      aggregatedCell: () => {},
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "#",
        }),
      sortingFn: "alphanumeric",
      enableColumnFilter: false,
      enableGrouping: false,
      meta: {
        label: "#",
        hiddenByDefault: true,
      },
    },
    {
      accessorKey: "date",
      id: "date",
      cell: (info) => {
        const dateValue = info.getValue() as DateValue;

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: dateValue ? dateFormatter.format(dateValue.toDate(getLocalTimeZone())) : "—",
            icon: CalendarDays,
          }),
          editableRenderer: () => ({
            component: EditableDateCell,
            props: {
              value: dateValue,
              onUpdateValue: (new_value: unknown) =>
                updateHandler(info, "date", new_value, (new_value) => {
                  // Convert DateValue to ISO string format for database
                  if (new_value && typeof new_value === "object" && "toString" in new_value) {
                    return (new_value as DateValue).toString(); // Returns YYYY-MM-DD
                  }
                  return new_value;
                }),
            },
          }),
        });
      },
      aggregatedCell: () => {},
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          title: "Date",
          column,
          table,
        }),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.getValue("date") as DateValue;
        const dateB = rowB.getValue("date") as DateValue;
        if (!dateA || !dateB) return 0;
        return dateA.compare(dateB);
      },
      filterFn: "dateIn" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Date",
        facetedFilter: (column: Column<TransactionsFormat, unknown>) => {
          return {
            name: "Date",
            icon: CalendarDays,
            column,
            component: () =>
              renderComponent(
                DataTableFacetedFilterDateWithOperators as any,
                {
                  column,
                  title: "Date",
                }
              ),
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
          {
            id: "dateBetween",
            label: "between",
          },
        ],
      },
    },
    {
      accessorKey: "payeeId",
      id: "payee",
      cell: (info) => {
        const payee = payees.getById(info.getValue() as number);
        const transaction = info.row.original;

        // If this is a transfer, show the transfer destination instead of payee
        if (transaction.isTransfer) {
          return renderComponent(TransferPayeeCell, {
            transaction,
          });
        }

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: payee?.name || "—",
            icon: HandCoins,
          }),
          editableRenderer: () => ({
            component: EditablePayeeCell,
            props: {
              value: info.getValue() as number | null,
              onUpdateValue: (new_value: number | null) => updateHandler(info, "payeeId", new_value),
              transactionContext: {
                amount: transaction.amount,
                categoryId: transaction.categoryId,
                accountId: transaction.accountId,
              },
            },
          }),
        });
      },
      aggregatedCell: () => {},
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
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
              renderComponent(DataTableFacetedFilterPayee as any, {
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
      cell: (info) => {
        const notes = info.getValue() as string;
        const transaction = info.row.original;

        // For scheduled transactions, use read-only rendering
        if (transaction.status === "scheduled") {
          return renderComponent(ReadOnlyCellWithIcon, {
            value: notes || "—",
            icon: StickyNote
          });
        }

        // For transactions with status badges or normal transactions, use NotesCellWithBadges
        return renderComponent(NotesCellWithBadges, {
          value: notes,
          onUpdateValue: (new_value: string) => {
            const id = info.row.original.id;
            if (typeof id === "number") {
              return updateData(id, "notes", new_value);
            }
          },
          isArchived: transaction.isArchived,
          isAdjustment: transaction.isAdjustment,
          adjustmentReason: transaction.adjustmentReason,
        });
      },
      aggregatedCell: () => {},
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
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
      cell: (info) => {
        const category = categories.getById(info.getValue() as number);
        const transaction = info.row.original;

        // Read-only for scheduled transactions
        if (transaction.status === "scheduled") {
          return renderComponent(ReadOnlyCategoryCell, { category });
        }

        // Editable for normal transactions
        return renderComponent(EditableCategoryCell, {
          value: category,
          onUpdateValue: (new_value: number | null) => updateHandler(info, "categoryId", new_value),
        });
      },
      aggregatedCell: () => {},
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
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
              renderComponent(DataTableFacetedFilterCategory as any, {
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
      accessorKey: "budget",
      id: "budget",
      cell: (info) => {
        const transaction = info.row.original;
        return renderComponent(BudgetAllocationSimpleCell, {
          transaction,
        });
      },
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Budget",
        }),
      size: 120,
      enableSorting: false,
      enableColumnFilter: false,
      enableHiding: true,
      meta: {
        label: "Budget",
      },
    },
    {
      accessorKey: "amount",
      id: "amount",
      cell: (info) => {
        const amount = info.getValue() as number;

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: currencyFormatter.format(amount || 0),
          }),
          editableRenderer: () => ({
            component: EditableNumericCell,
            props: {
              value: amount,
              onUpdateValue: (new_value: number) => updateHandler(info, "amount", new_value),
            },
          }),
        });
      },
      aggregatedCell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(isNaN(value) ? 0 : (value ?? 0));
      },
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Amount",
        }),
      sortingFn: (rowA, rowB) =>
        ((rowA.getValue("amount") as number) || 0) - ((rowB.getValue("amount") as number) || 0),
      enableGrouping: false,
      enableColumnFilter: true,
      filterFn: "amountFilter" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Amount",
        facetedFilter: (column: Column<TransactionsFormat, unknown>) => {
          return {
            name: "Amount",
            icon: DollarSign,
            column,
            component: () =>
              renderComponent(DataTableFacetedFilterAmount as any, {
                column,
                title: "Amount",
              }),
          };
        },
        availableFilters: [
          {
            id: "amountFilter",
            label: "amount",
          },
        ],
      },
    },
    {
      accessorKey: "balance",
      id: "balance",
      header: ({ column, table }) =>
        renderComponent(DataTableColumnHeader as any, {
          column,
          table,
          title: "Balance",
        }),
      cell: (info) => {
        const value = info.getValue() as number | null | undefined;
        // Show dash for null/undefined values to avoid misleading users with $0.00
        if (value === null || value === undefined) {
          return "—";
        }
        return currencyFormatter.format(isNaN(value) ? 0 : value);
      },
      aggregatedCell: (info) => {
        const value = info.getValue() as number | null | undefined;
        // Show dash for null/undefined values to avoid misleading users with $0.00
        if (value === null || value === undefined) {
          return "—";
        }
        return currencyFormatter.format(isNaN(value) ? 0 : value);
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
          onUpdateValue: (new_value: unknown) => updateHandler(info, "status", new_value as string),
          onScheduleClick:
            info.row.original.status === "scheduled" && onScheduleClick
              ? () => onScheduleClick(info.row.original)
              : undefined,
        }),
      aggregatedCell: () => {},
      header: "",
      filterFn: "equalsString" as FilterFnOption<TransactionsFormat>,
      meta: {
        label: "Status",
        facetedFilter: (column: Column<TransactionsFormat, unknown>, value: unknown[]) => {
          return {
            name: "Status",
            icon: SquareCheck,
            column,
            value,
            component: () => {
              return renderComponent(DataTableFacetedFilterStatus as any, {
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
      cell: (info) => {
        const transaction = info.row.original;

        // No actions for scheduled transactions
        if (transaction.status === "scheduled") {
          return "";
        }

        return renderComponent(DataTableActions, {
          id: info.getValue() as number,
          transaction,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableGrouping: false,
      enableHiding: false,
      meta: {
        label: "Actions",
      },
    },
  ];
};
