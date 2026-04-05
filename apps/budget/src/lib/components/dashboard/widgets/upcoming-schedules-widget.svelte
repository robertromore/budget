<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import Calendar from '@lucide/svelte/icons/calendar';

let { config }: { config: DashboardWidget } = $props();

const schedulesState = $derived(SchedulesState.get());
const schedules = $derived(Array.from(schedulesState.schedules.values()));
const limit = $derived((config.settings as any)?.limit ?? 5);
const visibleSchedules = $derived(schedules.slice(0, limit));
</script>

<div class="space-y-2">
  {#each visibleSchedules as schedule}
    <div class="flex items-center justify-between">
      <span class="truncate text-sm font-medium">{schedule.name}</span>
      <span class="text-muted-foreground text-xs capitalize">{schedule.status}</span>
    </div>
  {/each}
  {#if schedules.length === 0}
    <div class="flex flex-col items-center justify-center gap-2 py-4">
      <Calendar class="text-muted-foreground h-8 w-8" />
      <p class="text-muted-foreground text-sm">No schedules yet</p>
    </div>
  {/if}
</div>
