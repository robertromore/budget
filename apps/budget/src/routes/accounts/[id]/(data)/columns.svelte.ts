import {
  CalendarDays,
  DollarSign,
  HandCoins,
  SquareCheck,
  SquareMousePointer,
} from "$lib/components/icons";
import StickyNote from '@lucide/svelte/icons/sticky-note';
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
import DataTableEditableCell from "../(components)/(cells)/data-table-editable-cell.svelte";
import DataTableEditableStatusCell from "../(components)/(cells)/data-table-editable-status-cell.svelte";
import EditableDateCell from "../(components)/(cells)/editable-date-cell.svelte";
import EditableEntityCell from "../(components)/(cells)/editable-entity-cell.svelte";
import EditableNumericCell from "../(components)/(cells)/editable-numeric-cell.svelte";
import ReadOnlyCellWithIcon from "../(components)/(cells)/read-only-cell-with-icon.svelte";
import DataTableFacetedFilterAmount from "../(components)/(facets)/data-table-faceted-filter-amount.svelte";
import DataTableFacetedFilterCategory from "../(components)/(facets)/data-table-faceted-filter-category.svelte";
import DataTableFacetedFilterDate from "../(components)/(facets)/data-table-faceted-filter-date.svelte";
import DataTableFacetedFilterPayee from "../(components)/(facets)/data-table-faceted-filter-payee.svelte";
import DataTableFacetedFilterStatus from "../(components)/(facets)/data-table-faceted-filter-status.svelte";
import DataTableActions from "../(components)/data-table-actions.svelte";
import DataTableColumnHeader from "../(components)/data-table-column-header.svelte";
import ManageCategoryForm from "../(components)/manage-category-form.svelte";
import ManagePayeeForm from "../(components)/manage-payee-form.svelte";

export const columns = (
  categories: CategoriesState,
  payees: PayeesState,
  updateData: (id: number, columnId: string, newValue?: unknown) => Promise<void>,
  onScheduleClick?: (transaction: TransactionsFormat) => void
): ColumnDef<TransactionsFormat>[] => {
  const updateHandler = (
    info: CellContext<TransactionsFormat, unknown>,
    columnId: string,
    new_value: unknown,
    value_transformer: (value: unknown) => unknown = (value) => value
  ) => {
    const id = info.row.original.id;
    // Only update for actual transactions (numeric IDs), not scheduled ones (string IDs)
    if (typeof id === 'number') {
      return updateData(id, columnId, value_transformer(new_value));
    }
  };

  /**
   * Helper function to render cells that are editable for normal transactions
   * but read-only with icon for scheduled transactions
   */
  const renderEditableCell = (info: CellContext<TransactionsFormat, unknown>, config: {
    scheduledRenderer: () => { value: string; icon: Component };
    editableRenderer: () => { component: any; props: Record<string, unknown> };
  }) => {
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
      header: ({table}) =>
        renderComponent(Checkbox, {
          checked: table.getIsAllPageRowsSelected(),
          indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select all",
        }),
      cell: ({row}) => {
        const transaction = row.original;
        const isScheduled = transaction.status === "scheduled";

        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect() || isScheduled,
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        });
      },
      aggregatedCell: ({row}) =>
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
      header: ({table}) =>
        table.getCanSomeRowsExpand()
          ? renderComponent(ExpandToggle, {
              checked: table.getIsAllRowsExpanded(),
              // disabled: table.getCanSomeRowsExpand(),
              onCheckedChange: table.getToggleAllRowsExpandedHandler(),
              controlledChecked: true,
              "aria-label": "Expand/contract all",
            })
          : "",
      aggregatedCell: ({row}) =>
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
      cell: (info) => {
        const transaction = info.row.original;
        // Show dash for upcoming scheduled transactions
        if (transaction.status === "scheduled" && typeof transaction.id === "string") {
          return "—";
        }
        return info.getValue();
      },
      aggregatedCell: () => {},
      header: ({column}) =>
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
      cell: (info) => {
        const dateValue = info.getValue() as DateValue;

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: dateValue ? dateFormatter.format(dateValue.toDate(getLocalTimeZone())) : "—",
            icon: CalendarDays
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
            }
          })
        });
      },
      aggregatedCell: () => {},
      header: ({column}) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          title: "Date",
          column,
        }),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.getValue("date") as DateValue;
        const dateB = rowB.getValue("date") as DateValue;
        if (!dateA || !dateB) return 0;
        return dateA.compare(dateB);
      },
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
      cell: (info) => {
        const payee = payees.getById(info.getValue() as number);

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: payee?.name || "—",
            icon: HandCoins
          }),
          editableRenderer: () => ({
            component: EditableEntityCell,
            props: {
              value: payee as EditableEntityItem,
              entityLabel: "payee",
              onUpdateValue: (new_value) => updateHandler(info, "payeeId", new_value),
              entities: payees.all as EditableEntityItem[],
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
            }
          })
        });
      },
      aggregatedCell: () => {},
      header: ({column}) =>
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
      cell: (info) => {
        const notes = info.getValue() as string;

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: notes || "—",
            icon: StickyNote
          }),
          editableRenderer: () => ({
            component: DataTableEditableCell,
            props: {
              value: notes,
              onUpdateValue: (new_value: string) => {
                const id = info.row.original.id;
                if (typeof id === 'number') {
                  return updateData(id, "notes", new_value);
                }
              },
            }
          })
        });
      },
      aggregatedCell: () => {},
      header: ({column}) =>
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
      cell: (info) => {
        const category = categories.getById(info.getValue() as number);

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: category?.name || "—",
            icon: SquareMousePointer
          }),
          editableRenderer: () => ({
            component: EditableEntityCell,
            props: {
              value: category as EditableEntityItem,
              entityLabel: "category",
              onUpdateValue: (new_value) => updateHandler(info, "categoryId", new_value),
              entities: categories.all as EditableEntityItem[],
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
            }
          })
        });
      },
      aggregatedCell: () => {},
      header: ({column}) =>
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
      cell: (info) => {
        const amount = info.getValue() as number;

        return renderEditableCell(info, {
          scheduledRenderer: () => ({
            value: currencyFormatter.format(amount || 0),
            icon: DollarSign
          }),
          editableRenderer: () => ({
            component: EditableNumericCell,
            props: {
              value: amount,
              onUpdateValue: (new_value) => updateHandler(info, "amount", new_value),
            }
          })
        });
      },
      aggregatedCell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(isNaN(value) ? 0 : (value ?? 0));
      },
      header: ({column}) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
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
              renderComponent(DataTableFacetedFilterAmount<TransactionsFormat, unknown>, {
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
      header: ({column}) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
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
          onUpdateValue: (new_value) => updateHandler(info, "status", new_value),
          onScheduleClick: info.row.original.status === "scheduled" && onScheduleClick ?
            () => onScheduleClick(info.row.original) : undefined,
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
      cell: (info) => {
        const transaction = info.row.original;

        // No actions for scheduled transactions
        if (transaction.status === "scheduled") {
          return "";
        }

        return renderComponent(DataTableActions, {id: info.getValue() as number});
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableGrouping: false,
      enableHiding: false,
    },
  ];
};
