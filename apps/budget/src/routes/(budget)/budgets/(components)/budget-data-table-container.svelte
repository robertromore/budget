<script lang="ts">
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import { columns as createColumns } from '../(data)/columns.svelte';
import BudgetDataTable from './budget-data-table.svelte';

interface Props {
  budgets: BudgetWithRelations[];
  isLoading: boolean;
  selectedIds?: Iterable<number>;
  onToggleSelectId?: (budgetId: number) => void;
  onRangeSelectId?: (budgetId: number) => void;
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  table?: any;
}

let {
  budgets,
  isLoading,
  selectedIds,
  onToggleSelectId,
  onRangeSelectId,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  table = $bindable(),
}: Props = $props();

// Create columns with action handlers. `onRangeSelectId` is forwarded
// into the select-row cell so shift-click extends the page-level
// selection along the current row ordering.
const tableColumns = $derived(
  createColumns({
    onView,
    onEdit,
    onDuplicate,
    onArchive,
    onDelete,
    onRangeSelectId,
  })
);
</script>

<BudgetDataTable
  columns={tableColumns}
  {budgets}
  {selectedIds}
  {onToggleSelectId}
  bind:table />
