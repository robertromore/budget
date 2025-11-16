<script lang="ts">
import { formatCurrency } from '$lib/utils/formatters';
import type { Row } from '@tanstack/table-core';
import type { ImportRow } from '$lib/types/import';

interface Props {
  row: Row<ImportRow>;
}

let { row }: Props = $props();

const amount = $derived(row.original.normalizedData['amount']);
const isNegative = $derived(amount < 0);
</script>

{#if amount === undefined || amount === null}
  <span>—</span>
{:else}
  <span class={isNegative ? 'text-destructive font-medium' : 'font-medium text-green-600'}>
    {formatCurrency(amount)}
  </span>
{/if}
