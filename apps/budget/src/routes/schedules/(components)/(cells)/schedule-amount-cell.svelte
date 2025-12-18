<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { Schedule } from '$lib/schema/schedules';
import { currencyFormatter } from '$lib/utils/formatters';

interface Props {
  schedule: Schedule;
}

let { schedule }: Props = $props();

function formatAmount(schedule: Schedule): string {
  if (schedule.amount_type === 'range') {
    return `${currencyFormatter.format(schedule.amount)} - ${currencyFormatter.format(schedule.amount_2)}`;
  } else if (schedule.amount_type === 'approximate') {
    return `~${currencyFormatter.format(schedule.amount)}`;
  } else {
    return currencyFormatter.format(schedule.amount);
  }
}
</script>

<div class="flex flex-col gap-1">
  <div class="font-medium">{formatAmount(schedule)}</div>
  {#if schedule.amount_type !== 'exact'}
    <Badge variant="outline" class="w-fit text-xs">{schedule.amount_type}</Badge>
  {/if}
</div>
