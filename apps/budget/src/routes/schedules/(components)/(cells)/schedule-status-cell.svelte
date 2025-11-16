<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import type { Schedule } from '$lib/schema/schedules';

interface Props {
  schedule: Schedule;
}

let { schedule }: Props = $props();

function getStatusVariant(status: string | null) {
  return status === 'active' ? 'default' : 'secondary';
}
</script>

<div class="flex flex-wrap gap-1">
  <Badge variant={getStatusVariant(schedule.status)}>
    {schedule.status}
  </Badge>
  {#if schedule.auto_add}
    <Badge variant="outline" class="text-xs">Auto</Badge>
  {/if}
</div>
