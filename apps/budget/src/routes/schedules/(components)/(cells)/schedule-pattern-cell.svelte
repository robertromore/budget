<script lang="ts">
import {recurringFormatter} from '$lib/utils/formatters';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import type {Schedule} from '$lib/schema/schedules';

interface Props {
  schedule: Schedule;
}

let {schedule}: Props = $props();

function formatRecurringPattern(schedule: Schedule): string {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return 'One-time';

  return recurringFormatter.format(
    schedule.scheduleDate.frequency,
    schedule.scheduleDate.interval || 1
  );
}
</script>

<div class="flex items-center gap-2">
  {#if schedule.scheduleDate}
    <RotateCw class="h-3 w-3 text-muted-foreground" />
  {/if}
  <span>{formatRecurringPattern(schedule)}</span>
</div>
