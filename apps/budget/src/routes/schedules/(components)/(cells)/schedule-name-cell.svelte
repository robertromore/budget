<script lang="ts">
import type {Schedule} from '$lib/schema/schedules';

interface Props {
  schedule: Schedule;
}

let {schedule}: Props = $props();
</script>

<div class="flex flex-col gap-0.5">
  <a href="/schedules/{schedule.slug}" class="font-medium hover:underline">
    {schedule.name}
  </a>
  {#if schedule.account}
    <div class="text-muted-foreground text-xs">{schedule.account.name}</div>
  {/if}
</div>
