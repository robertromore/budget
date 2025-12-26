<script lang="ts">
import { AdvancedDataTable } from '$lib/components/data-table';
import type { BudgetWithRelations } from '$lib/server/domains/budgets';
import { columns } from '../(data)/budget-columns.svelte.ts';
import BudgetBulkActions from '../../../budgets/(components)/budget-bulk-actions.svelte';
import AccountBudgetsEmptyState from './account-budgets-empty-state.svelte';

interface Props {
  budgets: BudgetWithRelations[];
  accountId: number;
  accountSlug: string;
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onBulkArchive: (budgets: BudgetWithRelations[]) => void;
}

let {
  budgets,
  accountId,
  accountSlug,
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete,
  onBulkDelete,
  onBulkArchive,
}: Props = $props();

const budgetColumns = $derived(
  columns({
    onView,
    onEdit,
    onDuplicate,
    onArchive,
    onDelete,
  })
);
</script>

<div data-tour-id="budgets-overview">
  <AdvancedDataTable
    data={budgets}
    columns={budgetColumns}
    features={{
      sorting: true,
      filtering: true,
      pagination: true,
      rowSelection: true,
      columnVisibility: true,
    }}
    showPagination={true}
    pageSizeOptions={[10, 25, 50, 100]}>
    {#snippet footer(tableInstance)}
      <BudgetBulkActions table={tableInstance} allBudgets={budgets} {onBulkDelete} {onBulkArchive} />
    {/snippet}
    {#snippet empty()}
      <AccountBudgetsEmptyState {accountId} {accountSlug} />
    {/snippet}
  </AdvancedDataTable>
</div>
