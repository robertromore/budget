<script lang="ts">
import type { Payee } from '$lib/schema';
import type { Table } from '@tanstack/table-core';
import EntityBulkActions from '$lib/components/shared/data-table/entity-bulk-actions.svelte';

interface Props {
  table: Table<Payee>;
  allPayees: Payee[];
  onBulkDelete: (payees: Payee[]) => void;
}

let { table, allPayees, onBulkDelete }: Props = $props();
</script>

<EntityBulkActions
  {table}
  allEntities={allPayees}
  {onBulkDelete}
  entityName="payee"
  entityNamePlural="payees"
/>
