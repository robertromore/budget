<script lang="ts">
import { AdvancedDataTable } from '$lib/components/data-table';
import type { TableState } from '$lib/components/data-table/state/create-table-state.svelte';
import type { BudgetWithRelations } from '$core/server/domains/budgets';
import type {
  ColumnDef,
  RowSelectionState,
  Table as TTable,
} from '@tanstack/table-core';
import { untrack } from 'svelte';

interface Props {
  columns: ColumnDef<BudgetWithRelations>[];
  budgets: BudgetWithRelations[];
  /** IDs currently selected at the page level (SvelteSet). */
  selectedIds?: Iterable<number>;
  /**
   * Toggle a single budget's selection. Called when the user clicks a
   * row checkbox (or the header "select all" checkbox). We route each
   * diffed id through this so the page-level SvelteSet stays the
   * single source of truth.
   */
  onToggleSelectId?: (budgetId: number) => void;
  /** Navigate to the budget detail when a "dead zone" row click fires. */
  onRowNavigate?: (budget: BudgetWithRelations) => void;
  table?: TTable<BudgetWithRelations> | undefined;
}

let {
  columns,
  budgets,
  selectedIds,
  onToggleSelectId,
  onRowNavigate,
  table = $bindable(),
}: Props = $props();

// Grab a handle on the inner TanStack state so we can drive the row-
// selection map reactively from the page-level SvelteSet.
let tableState = $state<TableState | undefined>();

/**
 * Shape the page-level selection as TanStack's `{ [rowId]: true }` map.
 * Keys are stringified budget ids because `getRowId` on the table is
 * `(row) => String(row.id)`.
 */
const desiredRowSelection = $derived.by<RowSelectionState>(() => {
  const out: RowSelectionState = {};
  if (selectedIds) {
    for (const id of selectedIds) out[String(id)] = true;
  }
  return out;
});

function rowSelectionEquals(a: RowSelectionState, b: RowSelectionState): boolean {
  const aKeys = Object.keys(a).filter((k) => a[k]);
  const bKeys = Object.keys(b).filter((k) => b[k]);
  if (aKeys.length !== bKeys.length) return false;
  for (const k of aKeys) if (!b[k]) return false;
  return true;
}

// Page SvelteSet → table: mirror the shape into the inner state.
// Guarded by equality so we don't thrash the effect loop when the
// table mirror already matches.
$effect(() => {
  if (!tableState) return;
  const desired = desiredRowSelection;
  const current = untrack(() => tableState!.rowSelection());
  if (!rowSelectionEquals(current, desired)) {
    tableState.setValues.rowSelection(desired);
  }
});

// Table → page: when the user clicks a checkbox the inner state
// updates; diff against the last-observed page selection and route
// each change through `onToggleSelectId`. `untrack` prevents the diff
// from touching `selectedIds` in a tracked way (the opposite direction
// handles that).
let lastSyncedKeys = $state<Set<string>>(new Set());
$effect(() => {
  if (!tableState || !onToggleSelectId) return;
  const current = tableState.rowSelection();
  const nextKeys = new Set(Object.keys(current).filter((k) => current[k]));
  const prevKeys = untrack(() => lastSyncedKeys);

  // Skip if nothing actually changed vs the last synced snapshot. This
  // handles the echo from the page-→-table write (which just rewrote
  // the same keys) without looping.
  if (
    nextKeys.size === prevKeys.size &&
    [...nextKeys].every((k) => prevKeys.has(k))
  ) {
    return;
  }

  for (const k of nextKeys) {
    if (!prevKeys.has(k)) onToggleSelectId(Number(k));
  }
  for (const k of prevKeys) {
    if (!nextKeys.has(k)) onToggleSelectId(Number(k));
  }
  lastSyncedKeys = nextKeys;
});
</script>

<!--
  No inline toolbar or footer slots are passed in — the page-level
  `EntitySearchToolbar` is the single filter/sort entry point for
  budgets, and the sticky `BudgetSelectionBar` handles bulk actions.
  Column-visibility is deferred as a power-user affordance; can be
  added back via a dedicated menu later if users ask for it.
-->
<AdvancedDataTable
  data={budgets}
  {columns}
  features={{
    sorting: true,
    filtering: true,
    pagination: true,
    rowSelection: true,
    columnVisibility: true,
  }}
  getRowId={(row) => String(row.id)}
  showPagination={true}
  pageSizeOptions={[10, 25, 50, 100]}
  emptyMessage="No budgets found."
  onRowClick={onRowNavigate ? (row) => onRowNavigate(row.original) : undefined}
  bind:table
  bind:state={tableState} />
