<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';

let { config }: { config: DashboardWidget } = $props();

const schedulesState = $derived(SchedulesState.get());
const allSchedules = $derived(Array.from(schedulesState.schedules.values()));
const activeSchedules = $derived(allSchedules.filter((s) => s.status === 'active'));

// Sort by absolute amount so the most-impactful schedules surface
// first regardless of sign — the same pattern used elsewhere.
const schedulesByAbs = $derived(
  [...activeSchedules].sort(
    (a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0)
  )
);

// Per-size visible window. The user's `limit` setting still wins so
// power users can override.
const customLimit = $derived(Number((config.settings as any)?.limit) || 0);
const visibleSchedules = $derived.by(() => {
  if (customLimit > 0) return schedulesByAbs.slice(0, customLimit);
  switch (config.size) {
    case 'small':
      return [];
    case 'medium':
      return schedulesByAbs.slice(0, 4);
    case 'large':
      return schedulesByAbs.slice(0, 8);
    default:
      return schedulesByAbs.slice(0, 15);
  }
});
const remaining = $derived(activeSchedules.length - visibleSchedules.length);

const netAmount = $derived(
  activeSchedules.reduce((s, sch) => s + (Number(sch.amount) || 0), 0)
);

const headlineClass = $derived(config.size === 'small' ? 'text-xl' : 'text-base');
</script>

{#if activeSchedules.length === 0}
  <div class="flex flex-col items-center justify-center gap-2 py-4">
    <Calendar class="text-muted-foreground h-8 w-8"></Calendar>
    <p class="text-muted-foreground text-sm">No schedules yet</p>
  </div>
{:else if config.size === 'small'}
  <div class="flex items-start gap-3">
    <div class="bg-primary/10 rounded-lg p-2.5 shrink-0">
      <CalendarClock class="text-primary h-5 w-5"></CalendarClock>
    </div>
    <div class="min-w-0 flex-1">
      <div class="font-bold tabular-nums {headlineClass}">{activeSchedules.length}</div>
      <p class="text-muted-foreground text-xs tabular-nums">
        {netAmount >= 0 ? '+' : ''}{currencyFormatter.format(netAmount)} net
      </p>
    </div>
  </div>
{:else}
  <div class="space-y-2">
    {#each visibleSchedules as schedule}
      {@const amount = Number(schedule.amount) || 0}
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex-1">
          <div class="truncate text-sm font-medium">{schedule.name}</div>
          {#if config.size === 'large' || config.size === 'full'}
            <div class="text-muted-foreground text-xs capitalize">
              {schedule.recurring ? 'recurring' : 'one-time'}
              {#if config.size === 'full' && schedule.amount_type === 'approximate'}· approx{/if}
              {#if config.size === 'full' && schedule.amount_type === 'range'}· range{/if}
            </div>
          {/if}
        </div>
        <span
          class="shrink-0 text-sm font-medium tabular-nums"
          class:text-amount-positive={amount > 0}
          class:text-amount-negative={amount < 0}
          class:text-muted-foreground={amount === 0}>
          {amount > 0 ? '+' : ''}{currencyFormatter.format(amount)}
        </span>
      </div>
    {/each}
    {#if remaining > 0}
      <p class="text-muted-foreground text-center text-xs">+{remaining} more</p>
    {/if}
  </div>
{/if}
