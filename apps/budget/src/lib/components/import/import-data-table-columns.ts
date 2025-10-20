import type {ColumnDef} from '@tanstack/table-core';
import type {ImportRow} from '$lib/types/import';
import {renderComponent} from '$lib/components/ui/data-table';
import {Checkbox} from '$lib/components/ui/checkbox';
import ImportTableColumnHeader from './import-table-column-header.svelte';
import ImportTableStatusCell from './import-table-status-cell.svelte';
import ImportTableAmountCell from './import-table-amount-cell.svelte';
import ImportTablePayeeCell from './import-table-payee-cell.svelte';
import ImportTableCategoryCell from './import-table-category-cell.svelte';

export function createColumns(options?: {
  onPayeeUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  onCategoryUpdate?: (rowIndex: number, categoryId: number | null, categoryName: string | null) => void;
  temporaryPayees?: string[];
  temporaryCategories?: string[];
}): ColumnDef<ImportRow>[] {
  const {onPayeeUpdate, onCategoryUpdate, temporaryPayees, temporaryCategories} = options || {};

  return [
  {
    id: 'select',
    header: ({table}) => {
      const allPageRowsSelected = table.getIsAllPageRowsSelected();
      const somePageRowsSelected = table.getIsSomePageRowsSelected();

      return renderComponent(Checkbox, {
        checked: allPageRowsSelected,
        indeterminate: somePageRowsSelected && !allPageRowsSelected,
        onCheckedChange: (value: boolean | 'indeterminate') => {
          table.toggleAllPageRowsSelected(!!value);
        },
      });
    },
    cell: ({row}) => {
      return renderComponent(Checkbox, {
        checked: row.getIsSelected(),
        disabled: !row.getCanSelect(),
        onCheckedChange: (value: boolean | 'indeterminate') => {
          row.toggleSelected(!!value);
        },
      });
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'rowIndex',
    header: '#',
    cell: ({row}) => row.original.rowIndex + 1,
  },
  {
    accessorKey: 'validationStatus',
    header: ({column}) => renderComponent(ImportTableColumnHeader, {column, label: 'Status'}),
    cell: ({row}) => renderComponent(ImportTableStatusCell, {row}),
    sortingFn: (rowA, rowB) => {
      const statusOrder = {invalid: 0, warning: 1, pending: 2, valid: 3};
      const statusA = statusOrder[rowA.original.validationStatus as keyof typeof statusOrder] || 0;
      const statusB = statusOrder[rowB.original.validationStatus as keyof typeof statusOrder] || 0;
      return statusA - statusB;
    },
  },
  {
    accessorKey: 'date',
    header: ({column}) => renderComponent(ImportTableColumnHeader, {column, label: 'Date'}),
    cell: ({row}) => row.original.normalizedData['date'] || '—',
    accessorFn: (row) => row.normalizedData['date'],
  },
  {
    accessorKey: 'payee',
    header: ({column}) => renderComponent(ImportTableColumnHeader, {column, label: 'Payee'}),
    cell: ({row}) => renderComponent(ImportTablePayeeCell, {
      row,
      ...(onPayeeUpdate ? {onUpdate: onPayeeUpdate} : {}),
      ...(temporaryPayees ? {temporaryPayees} : {}),
    }),
    accessorFn: (row) => row.normalizedData['payee'],
  },
  {
    accessorKey: 'amount',
    header: ({column}) => renderComponent(ImportTableColumnHeader, {column, label: 'Amount'}),
    cell: ({row}) => renderComponent(ImportTableAmountCell, {row}),
    accessorFn: (row) => row.normalizedData['amount'],
  },
  {
    accessorKey: 'category',
    header: 'Category',
    cell: ({row}) => renderComponent(ImportTableCategoryCell, {
      row,
      ...(onCategoryUpdate ? {onUpdate: onCategoryUpdate} : {}),
      ...(temporaryCategories ? {temporaryCategories} : {}),
    }),
    accessorFn: (row) => row.normalizedData['category'],
  },
  {
    accessorKey: 'description',
    header: 'Description',
    cell: ({row}) => {
      const desc = row.original.normalizedData['description'] || row.original.normalizedData['notes'] || '—';
      return desc;
    },
    accessorFn: (row) => row.normalizedData['description'] || row.normalizedData['notes'],
  },
  ];
}

// Default export for backward compatibility
export const columns = createColumns();
