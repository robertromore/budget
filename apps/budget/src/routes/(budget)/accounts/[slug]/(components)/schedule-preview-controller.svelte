<!--
  Schedule Preview Controller — owns the open state for the schedule
  preview sheet. Bind a `TransactionsFormat | null` from the parent;
  setting it non-null opens the sheet, the sheet closes by clearing
  the binding.
-->
<script lang="ts">
import type { TransactionsFormat } from '$lib/types';
import SchedulePreviewSheet from './schedule-preview-sheet.svelte';

interface Props {
  transaction: TransactionsFormat | null;
}

let { transaction = $bindable(null) }: Props = $props();

const isOpen = $derived(transaction !== null);

function handleOpenChange(value: boolean) {
  if (!value) transaction = null;
}

const occurrenceDate = $derived.by(() => {
  const d = transaction?.date;
  if (d instanceof Date) return d.toISOString().split('T')[0];
  if (typeof d === 'string') return d;
  return undefined;
});
</script>

<SchedulePreviewSheet
  open={isOpen}
  onOpenChange={handleOpenChange}
  scheduleId={transaction?.scheduleId}
  scheduleSlug={transaction?.scheduleSlug}
  scheduleName={transaction?.scheduleName}
  amount={transaction?.amount}
  frequency={transaction?.scheduleFrequency}
  interval={transaction?.scheduleInterval}
  nextOccurrence={transaction?.scheduleNextOccurrence}
  {occurrenceDate} />
