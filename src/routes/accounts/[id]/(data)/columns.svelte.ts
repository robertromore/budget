import type { EditableEntityItem, EditableNumericItem, TransactionsFormat } from '$lib/types';
import { Checkbox } from '$lib/components/ui/checkbox';
import { renderComponent } from '$lib/components/ui/data-table';
import type { ColumnDef, FilterFnOption } from '@tanstack/table-core';
import DataTableColumnHeader from '../(components)/data-table-column-header.svelte';
import EditableDateCell from '$lib/components/data-table/editable-date-cell.svelte';
import { getLocalTimeZone, type DateValue } from '@internationalized/date';
import EditableEntityCell from '$lib/components/data-table/editable-entity-cell.svelte';
import DataTableEditableCell from '../(components)/(cells)/data-table-editable-cell.svelte';
import EditableNumericCell from '$lib/components/data-table/editable-numeric-cell.svelte';
import DataTableActions from '../(components)/data-table-actions.svelte';
import { compareAlphanumeric } from '$lib/utils';
import type { Category, Payee } from '$lib/schema';
import DataTableEditableStatusCell from '../(components)/(cells)/data-table-editable-status-cell.svelte';
import ManagePayeeForm from '$lib/components/forms/manage-payee-form.svelte';
import ManageCategoryForm from '$lib/components/forms/manage-category-form.svelte';
import type { CategoriesState } from '$lib/states/categories.svelte';
import type { PayeesState } from '$lib/states/payees.svelte';

export const columns = (
  categories: CategoriesState,
  payees: PayeesState,
  updateData: (id: number, columnId: string, newValue?: unknown) => Promise<void>
): ColumnDef<TransactionsFormat>[] => {
  return [
    {
      id: 'select-col',
      header: ({ table }) =>
        renderComponent(Checkbox, {
          checked: table.getIsAllPageRowsSelected(),
          indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
          onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
          controlledChecked: true,
          'aria-label': 'Select all'
        }),
      cell: ({ row }) =>
        renderComponent(Checkbox, {
          checked: row.getIsSelected(),
          disabled: !row.getCanSelect(),
          onCheckedChange: (value) => row.toggleSelected(!!value),
          controlledChecked: true,
          'aria-label': 'Select row'
        }),
      enableColumnFilter: false
    },
    {
      accessorKey: 'id',
      cell: (info) => info.getValue(),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: 'ID'
        }),
      sortingFn: 'alphanumeric',
      enableColumnFilter: false
    },
    {
      accessorKey: 'date',
      id: 'date',
      cell: (info) =>
        renderComponent(EditableDateCell, {
          value: info.getValue() as DateValue,
          onUpdateValue: (new_value) =>
            updateData(
              info.row.original.id,
              'date',
              (new_value as DateValue)?.toDate(getLocalTimeZone()).toString()
            )
        }),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          title: 'Date',
          column
        }),
      sortingFn: 'datetime',
      filterFn: 'dateAfter' as FilterFnOption<TransactionsFormat>,
      meta: {
        availableFilters: [
          {
            id: 'dateOn',
            label: 'on'
          },
          {
            id: 'dateBefore',
            label: 'before'
          },
          {
            id: 'dateAfter',
            label: 'after'
          }
        ]
      }
    },
    {
      accessorKey: 'payeeId',
      id: 'payee',
      cell: (info) =>
        renderComponent(EditableEntityCell, {
          value: payees.getById(info.getValue() as number) as EditableEntityItem,
          entityLabel: 'payee',
          onUpdateValue: (new_value) => updateData(info.row.original.id, 'payeeId', new_value),
          entities: payees.payees as EditableEntityItem[],
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
            }
          }
        }),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: 'Payee'
        }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(
          payees.getById(rowA.getValue('payee'))?.name || '',
          payees.getById(rowB.getValue('payee'))?.name || ''
        );
      },
      enableColumnFilter: true,
      filterFn: 'entityIsFilter' as FilterFnOption<TransactionsFormat>,
      meta: {
        availableFilters: [
          {
            id: 'entityIsFilter',
            label: 'is'
          },
          {
            id: 'entityIsNotFilter',
            label: 'is not'
          }
        ]
      }
    },
    {
      accessorKey: 'notes',
      id: 'notes',
      cell: (info) =>
        renderComponent(DataTableEditableCell, {
          value: info.getValue(),
          onUpdateValue: (new_value: string) => updateData(info.row.original.id, 'notes', new_value)
        }),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: 'Notes'
        }),
      enableSorting: false
    },
    {
      accessorKey: 'categoryId',
      id: 'category',
      cell: (info) =>
        renderComponent(EditableEntityCell, {
          value: categories.getById(info.getValue() as number) as EditableEntityItem,
          entityLabel: 'category',
          onUpdateValue: (new_value) => updateData(info.row.original.id, 'categoryId', new_value),
          entities: categories.categories as EditableEntityItem[],
          management: {
            enable: true,
            component: ManageCategoryForm,
            onSave: (new_value: EditableEntityItem, is_new: boolean) => {
              console.log('save', new_value);
              if (is_new) {
                categories.addCategory(new_value as Category);
              } else {
                categories.updateCategory(new_value as Category);
              }
            },
            onDelete: (id: number) => {
              categories.deleteCategory(id);
            }
          }
        }),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: 'Category'
        }),
      sortingFn: (rowA, rowB) => {
        return compareAlphanumeric(
          categories.getById(rowA.getValue('category'))?.name || '',
          categories.getById(rowB.getValue('category'))?.name || ''
        );
      },
      filterFn: 'entityIsFilter' as FilterFnOption<TransactionsFormat>,
      meta: {
        availableFilters: [
          {
            id: 'entityIsFilter',
            label: 'is'
          },
          {
            id: 'entityIsNotFilter',
            label: 'is not'
          }
        ]
      }
    },
    {
      accessorKey: 'amount',
      id: 'amount',
      cell: (info) =>
        renderComponent(EditableNumericCell, {
          value: info.getValue() as number,
          onUpdateValue: (new_value) => updateData(info.row.original.id, 'amount', new_value)
        }),
      header: ({ column }) =>
        renderComponent(DataTableColumnHeader<TransactionsFormat, unknown>, {
          column,
          title: 'Amount'
        }),
      sortingFn: (rowA, rowB) => {
        return (
          ((rowA.getValue('amount') as EditableNumericItem).value || 0) -
          ((rowB.getValue('amount') as EditableNumericItem).value || 0)
        );
      }
    },
    {
      accessorKey: 'status',
      id: 'status',
      cell: (info) =>
        renderComponent(DataTableEditableStatusCell, {
          value: info.getValue() as string,
          onUpdateValue: (new_value) => updateData(info.row.original.id, 'status', new_value)
        }),
      header: '',
      filterFn: 'equalsString' as FilterFnOption<TransactionsFormat>,
      meta: {
        availableFilters: [
          {
            id: 'equalsString',
            label: 'is'
          },
          {
            id: 'doesntEqualString',
            label: 'is not'
          }
        ]
      }
    },
    {
      id: 'actions',
      accessorFn: (row) => row.id,
      header: '',
      cell: (info) => renderComponent(DataTableActions, { id: info.getValue() as number }),
      enableColumnFilter: false,
      enableSorting: false
    }
  ];
};
