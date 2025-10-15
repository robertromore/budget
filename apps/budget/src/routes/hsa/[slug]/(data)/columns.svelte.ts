import { Checkbox } from "$lib/components/ui/checkbox";
import { renderComponent } from "$lib/components/ui/data-table";
import { ExpandToggle } from "$lib/components/ui/expand-toggle";
import { currencyFormatter } from "$lib/utils/formatters";
import { dateFormatter } from "$lib/utils/date-formatters";
import { type DateValue, getLocalTimeZone } from "@internationalized/date";
import type { CellContext, ColumnDef } from "@tanstack/table-core";
import type { Component } from "svelte";
import { medicalExpenseTypeEnum, type MedicalExpenseType } from "$lib/schema/medical-expenses";
import { claimStatusEnum, type ClaimStatus } from "$lib/schema/hsa-claims";

// Import cell components
import EditableDateCell from "../(components)/(cells)/editable-date-cell.svelte";
import EditableTextCell from "../(components)/(cells)/editable-text-cell.svelte";
import EditableNumericCell from "../(components)/(cells)/editable-numeric-cell.svelte";
import EditableExpenseTypeCell from "../(components)/(cells)/editable-expense-type-cell.svelte";
import ClaimStatusCell from "../(components)/(cells)/claim-status-cell.svelte";
import ExpenseActionsCell from "../(components)/(cells)/expense-actions-cell.svelte";
import DataTableColumnHeader from "../(components)/data-table-column-header.svelte";

// Type for expense table format
export interface ExpenseFormat {
  id: number;
  date: DateValue;
  provider: string | null;
  patientName: string | null;
  expenseType: MedicalExpenseType;
  diagnosis: string | null;
  treatmentDescription: string | null;
  amount: number;
  insuranceCovered: number;
  outOfPocket: number;
  serviceDate: string;
  paidDate: string | null;
  taxYear: number;
  notes: string | null;
  isQualified: boolean;
  hsaAccountId: number;
  transactionId: number;

  // Relations
  claims?: any[];
  receipts?: any[];

  // Computed
  claimStatus?: ClaimStatus;
  hasReceipts?: boolean;
}

export const columns = (
  updateData: (id: number, columnId: string, newValue?: unknown) => Promise<void>,
  onEdit?: (expense: ExpenseFormat) => void,
  onDelete?: (expense: ExpenseFormat) => void,
  onManageClaims?: (expense: ExpenseFormat) => void,
  onAddReceipt?: (expenseId: number) => void
): ColumnDef<ExpenseFormat>[] => {

  const updateHandler = (
    info: CellContext<ExpenseFormat, unknown>,
    columnId: string,
    new_value: unknown,
    value_transformer: (value: unknown) => unknown = (value) => value
  ) => {
    const id = info.row.original.id;
    return updateData(id, columnId, value_transformer(new_value));
  };

  return [
    // Selection column
    {
      id: "select-col",
      header: ({table}) => {
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
      cell: ({row}) => {
        return renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        });
      },
      aggregatedCell: ({row}) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value: boolean) => row.toggleSelected(!!value),
          controlledChecked: true,
          "aria-label": "Select row",
        }),
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false,
    },

    // Expand/Contract column
    {
      id: "expand-contract-col",
      header: ({table}) =>
        table.getCanSomeRowsExpand()
          ? renderComponent(ExpandToggle, {
              checked: table.getIsAllRowsExpanded(),
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

    // Service Date column
    {
      accessorKey: "date",
      id: "date",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Date",
        }),
      cell: (info) => {
        const date = info.getValue() as DateValue;
        return renderComponent(EditableDateCell, {
          value: date,
          onSave: async (newDate: DateValue) => {
            await updateHandler(info, "date", newDate.toString());
          },
        });
      },
      sortingFn: (rowA, rowB, columnId) => {
        const dateA = rowA.getValue(columnId) as DateValue;
        const dateB = rowB.getValue(columnId) as DateValue;
        return dateA.compare(dateB);
      },
      enableGrouping: true,
      aggregatedCell: ({row}) => {
        const date = row.original.date;
        return date ? dateFormatter.format(date.toDate(getLocalTimeZone())) : "";
      },
    },

    // Provider column
    {
      accessorKey: "provider",
      id: "provider",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Provider",
        }),
      cell: (info) => {
        return renderComponent(EditableTextCell, {
          value: info.getValue() as string | null,
          placeholder: "Provider name",
          onSave: async (newValue: string) => {
            await updateHandler(info, "provider", newValue || null);
          },
        });
      },
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        const provider = row.getValue(id) as string | null;
        return value.includes(provider);
      },
      enableGrouping: true,
      aggregatedCell: ({row}) => row.original.provider || "",
    },

    // Patient Name column
    {
      accessorKey: "patientName",
      id: "patientName",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Patient",
        }),
      cell: (info) => {
        return renderComponent(EditableTextCell, {
          value: info.getValue() as string | null,
          placeholder: "Patient name",
          onSave: async (newValue: string) => {
            await updateHandler(info, "patientName", newValue || null);
          },
        });
      },
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        const patient = row.getValue(id) as string | null;
        return value.includes(patient);
      },
      enableGrouping: true,
      aggregatedCell: ({row}) => row.original.patientName || "",
    },

    // Expense Type column
    {
      accessorKey: "expenseType",
      id: "expenseType",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Type",
        }),
      cell: (info) => {
        return renderComponent(EditableExpenseTypeCell, {
          value: info.getValue() as MedicalExpenseType,
          onSave: async (newValue: string) => {
            await updateHandler(info, "expenseType", newValue);
          },
        });
      },
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        const expenseType = row.getValue(id) as MedicalExpenseType;
        return value.includes(expenseType);
      },
      enableGrouping: true,
      aggregatedCell: ({row}) => {
        const type = row.original.expenseType;
        return medicalExpenseTypeEnum[type] || type;
      },
    },

    // Diagnosis column (optional, can be hidden)
    {
      accessorKey: "diagnosis",
      id: "diagnosis",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Diagnosis",
        }),
      cell: (info) => {
        return renderComponent(EditableTextCell, {
          value: info.getValue() as string | null,
          placeholder: "Diagnosis",
          multiline: true,
          onSave: async (newValue: string) => {
            await updateHandler(info, "diagnosis", newValue || null);
          },
        });
      },
      enableSorting: false,
      enableGrouping: false,
    },

    // Treatment Description column (optional, can be hidden)
    {
      accessorKey: "treatmentDescription",
      id: "treatmentDescription",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Treatment",
        }),
      cell: (info) => {
        return renderComponent(EditableTextCell, {
          value: info.getValue() as string | null,
          placeholder: "Treatment description",
          multiline: true,
          onSave: async (newValue: string) => {
            await updateHandler(info, "treatmentDescription", newValue || null);
          },
        });
      },
      enableSorting: false,
      enableGrouping: false,
    },

    // Total Amount column
    {
      accessorKey: "amount",
      id: "amount",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Amount",
        }),
      cell: (info) => {
        return renderComponent(EditableNumericCell, {
          value: info.getValue() as number,
          format: "currency",
          onSave: async (newValue: number) => {
            await updateHandler(info, "amount", newValue);
          },
        });
      },
      aggregatedCell: ({row}) => {
        const subRows = row.subRows;
        if (subRows && subRows.length > 0) {
          const total = subRows.reduce((sum, subRow) => sum + (subRow.original.amount || 0), 0);
          return currencyFormatter.format(total);
        }
        return currencyFormatter.format(row.original.amount);
      },
      aggregationFn: "sum",
      enableGrouping: false,
    },

    // Insurance Covered column
    {
      accessorKey: "insuranceCovered",
      id: "insuranceCovered",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Insurance",
        }),
      cell: (info) => {
        return renderComponent(EditableNumericCell, {
          value: info.getValue() as number,
          format: "currency",
          onSave: async (newValue: number) => {
            await updateHandler(info, "insuranceCovered", newValue);
          },
        });
      },
      aggregatedCell: ({row}) => {
        const subRows = row.subRows;
        if (subRows && subRows.length > 0) {
          const total = subRows.reduce((sum, subRow) => sum + (subRow.original.insuranceCovered || 0), 0);
          return currencyFormatter.format(total);
        }
        return currencyFormatter.format(row.original.insuranceCovered);
      },
      aggregationFn: "sum",
      enableGrouping: false,
    },

    // Out of Pocket column
    {
      accessorKey: "outOfPocket",
      id: "outOfPocket",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Out of Pocket",
        }),
      cell: (info) => {
        const value = info.getValue() as number;
        return currencyFormatter.format(value);
      },
      aggregatedCell: ({row}) => {
        const subRows = row.subRows;
        if (subRows && subRows.length > 0) {
          const total = subRows.reduce((sum, subRow) => sum + (subRow.original.outOfPocket || 0), 0);
          return currencyFormatter.format(total);
        }
        return currencyFormatter.format(row.original.outOfPocket);
      },
      aggregationFn: "sum",
      enableGrouping: false,
    },

    // Claim Status column (unique to HSA)
    {
      accessorKey: "claimStatus",
      id: "status",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Status",
        }),
      cell: (info) => {
        const expense = info.row.original;
        return renderComponent(ClaimStatusCell, {
          expense,
          onManageClaims: () => onManageClaims?.(expense),
        });
      },
      filterFn: (row, id, value) => {
        if (!value || value.length === 0) return true;
        const expense = row.original;
        const status = expense.claimStatus || 'not_submitted';
        return value.includes(status);
      },
      enableGrouping: true,
      enableSorting: false,
      aggregatedCell: ({row}) => {
        const expense = row.original;
        const status = expense.claimStatus || 'not_submitted';
        return claimStatusEnum[status] || status;
      },
    },

    // Notes column (optional, can be hidden by default)
    {
      accessorKey: "notes",
      id: "notes",
      header: ({column}) =>
        renderComponent(DataTableColumnHeader, {
          column,
          title: "Notes",
        }),
      cell: (info) => {
        return renderComponent(EditableTextCell, {
          value: info.getValue() as string | null,
          placeholder: "Add notes",
          multiline: true,
          onSave: async (newValue: string) => {
            await updateHandler(info, "notes", newValue || null);
          },
        });
      },
      enableSorting: false,
      enableGrouping: false,
    },

    // Actions column
    {
      id: "actions",
      header: "Actions",
      cell: (info) => {
        const expense = info.row.original;
        return renderComponent(ExpenseActionsCell, {
          expense,
          onEdit: () => onEdit?.(expense),
          onDelete: () => onDelete?.(expense),
          onManageClaims: () => onManageClaims?.(expense),
          onAddReceipt: () => onAddReceipt?.(expense.id),
        });
      },
      enableColumnFilter: false,
      enableGrouping: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
};
