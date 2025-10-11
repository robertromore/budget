<script lang="ts">
import type {BudgetWithRelations} from '$lib/server/domains/budgets';
import type {ColumnDef} from '@tanstack/table-core';
import BudgetDataTable from './budget-data-table.svelte';
import {columns as createColumns} from '../(data)/columns.svelte';

interface Props {
  budgets: BudgetWithRelations[];
  isLoading: boolean;
  columns: ColumnDef<BudgetWithRelations>[];
  onView: (budget: BudgetWithRelations) => void;
  onEdit: (budget: BudgetWithRelations) => void;
  onDelete: (budget: BudgetWithRelations) => void;
  onDuplicate: (budget: BudgetWithRelations) => void;
  onArchive: (budget: BudgetWithRelations) => void;
  onBulkDelete: (budgets: BudgetWithRelations[]) => void;
  onBulkArchive: (budgets: BudgetWithRelations[]) => void;
  table?: any;
}

let {
  budgets,
  isLoading,
  columns,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onArchive,
  onBulkDelete,
  onBulkArchive,
  table = $bindable()
}: Props = $props();

// Create columns with action handlers
const tableColumns = $derived(createColumns({
  onView,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete
}));
</script>

<BudgetDataTable
  columns={tableColumns}
  {budgets}
  {onBulkDelete}
  {onBulkArchive}
  bind:table
/>
