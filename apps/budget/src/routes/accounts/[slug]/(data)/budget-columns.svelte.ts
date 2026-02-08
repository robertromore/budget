import { renderComponent } from '$lib/components/ui/data-table';
import type { BudgetEnforcementLevel, BudgetProgressStatus } from '$lib/schema/budgets';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import type { ColumnDef } from '@tanstack/table-core';
import { formatCurrency } from '$lib/utils/formatters';
import { calculateActualSpent } from '$lib/utils/budget-calculations';
import BudgetProgress from '$lib/components/budgets/budget-progress.svelte';
import BudgetTypeCell from '../../../budgets/(components)/(cells)/budget-type-cell.svelte';
import BudgetStatusCell from '../../../budgets/(components)/(cells)/budget-status-cell.svelte';
import BudgetNameCell from '../../../budgets/(components)/(cells)/budget-name-cell.svelte';
import BudgetRemainingCell from '../../../budgets/(components)/(cells)/budget-remaining-cell.svelte';
import BudgetActionsCell from '../../../budgets/(components)/(cells)/budget-actions-cell.svelte';
import BudgetSelectionCheckboxCell from '../(components)/(cells)/budget-selection-checkbox-cell.svelte';
import SelectAllCheckboxCell from '../(components)/(cells)/select-all-checkbox-cell.svelte';

interface BudgetColumnActions {
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
}

function getAllocated(budget: BudgetWithRelations): number {
  // First try to get from period instances
  const templates = budget.periodTemplates ?? [];
  const periods = templates.flatMap((template) => template.periods ?? []);

  if (periods.length) {
    const latest = periods.reduce((latest, current) =>
      latest.endDate > current.endDate ? latest : current
    );
    if (latest?.allocatedAmount) {
      return Math.abs(latest.allocatedAmount);
    }
  }

  // Fall back to budget metadata
  const metadataAmount = (budget.metadata as Record<string, unknown>)?.['allocatedAmount'] as
    | number
    | undefined;
  if (metadataAmount) {
    return Math.abs(metadataAmount);
  }

  return 0;
}

function getConsumed(budget: BudgetWithRelations): number {
  return calculateActualSpent(budget);
}

function resolveStatus(budget: BudgetWithRelations): BudgetProgressStatus {
  if (budget.status !== 'active') return 'paused';
  const allocated = getAllocated(budget);
  const consumed = getConsumed(budget);
  if (!allocated) return 'setup_needed';

  const ratio = consumed / allocated;
  if (ratio > 1) return 'over';
  if (ratio >= 0.8) return 'approaching';
  return 'on_track';
}

function resolveEnforcement(budget: BudgetWithRelations): BudgetEnforcementLevel {
  return (budget.enforcementLevel ?? 'warning') as BudgetEnforcementLevel;
}

export function columns(actions: BudgetColumnActions): ColumnDef<BudgetWithRelations>[] {
  return [
    {
      id: 'select-col',
      header: ({ table }) => {
        return renderComponent(SelectAllCheckboxCell, { table });
      },
      cell: ({ row, table }) => {
        return renderComponent(BudgetSelectionCheckboxCell, {
          row,
          table,
          disabled: !row.getCanSelect(),
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      id: 'name',
      header: 'Name',
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetNameCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      accessorKey: 'type',
      id: 'type',
      header: 'Type',
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetTypeCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      accessorKey: 'scope',
      id: 'scope',
      header: 'Scope',
      cell: (info) => {
        const scope = info.getValue() as string;
        return scope.charAt(0).toUpperCase() + scope.slice(1);
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: 'allocated',
      header: 'Allocated',
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        return formatCurrency(allocated);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getAllocated(rowA.original);
        const b = getAllocated(rowB.original);
        return a - b;
      },
    },
    {
      id: 'consumed',
      header: 'Consumed',
      cell: (info) => {
        const budget = info.row.original;
        const consumed = getConsumed(budget);
        return formatCurrency(consumed);
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const a = getConsumed(rowA.original);
        const b = getConsumed(rowB.original);
        return a - b;
      },
    },
    {
      id: 'remaining',
      header: 'Remaining',
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetRemainingCell, {
          budget,
        });
      },
      enableColumnFilter: false,
      enableSorting: true,
      sortingFn: (rowA, rowB) => {
        const aRemaining = getAllocated(rowA.original) - getConsumed(rowA.original);
        const bRemaining = getAllocated(rowB.original) - getConsumed(rowB.original);
        return aRemaining - bRemaining;
      },
    },
    {
      id: 'progress',
      header: 'Progress',
      cell: (info) => {
        const budget = info.row.original;
        const allocated = getAllocated(budget);
        const consumed = getConsumed(budget);
        const status = resolveStatus(budget);
        const enforcement = resolveEnforcement(budget);

        return renderComponent(BudgetProgress, {
          consumed,
          allocated,
          status,
          enforcementLevel: enforcement,
          consumedLabel: budget.type === 'goal-based' ? 'Saved' : 'Spent',
          label: '',
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
    },
    {
      accessorKey: 'status',
      id: 'status',
      header: 'Status',
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetStatusCell, {
          budget,
        });
      },
      enableColumnFilter: true,
      enableSorting: true,
    },
    {
      id: 'actions',
      header: '',
      cell: (info) => {
        const budget = info.row.original;
        return renderComponent(BudgetActionsCell, {
          budget,
          onView: actions.onView,
          onEdit: actions.onEdit,
          onDuplicate: actions.onDuplicate,
          onArchive: actions.onArchive,
          onDelete: actions.onDelete,
        });
      },
      enableColumnFilter: false,
      enableSorting: false,
      enableHiding: false,
    },
  ];
}
