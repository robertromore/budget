<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { currencyFormatter } from '$lib/utils/formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import { copilotPalette } from './copilot-colors';

let { config }: { config: DashboardWidget } = $props();

const p = $derived(copilotPalette((config.settings as any)?.gradientColor));

const schedulesState = $derived(SchedulesState.get());
const allSchedules = $derived(Array.from(schedulesState.schedules.values()));
const activeSchedules = $derived(allSchedules.filter((s) => s.status === 'active'));

const schedulesByAbs = $derived(
  [...activeSchedules].sort(
    (a, b) => Math.abs(Number(b.amount) || 0) - Math.abs(Number(a.amount) || 0)
  )
);

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
      return schedulesByAbs.slice(0, 14);
  }
});
const remaining = $derived(activeSchedules.length - visibleSchedules.length);

const netAmount = $derived(
  activeSchedules.reduce((s, sch) => s + (Number(sch.amount) || 0), 0)
);

const netTone = $derived(
  netAmount > 0
    ? 'text-amount-positive'
    : netAmount < 0
      ? 'text-amount-negative'
      : 'text-muted-foreground'
);

const headlineClass = $derived(config.size === 'small' ? 'text-xl' : 'text-base');
</script>

<div class="rounded-xl border p-4 shadow-sm {p.container}">
  <div class="mb-3 flex items-center gap-2">
    <div class="rounded-lg p-1.5 {p.iconBg}">
      <CalendarClock class="h-3.5 w-3.5 {p.iconFg}"></CalendarClock>
    </div>
    <span class="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">
      {config.title || 'Upcoming'}
    </span>
  </div>

  {#if activeSchedules.length === 0}
    <div class="flex flex-col items-center gap-2 py-6 text-center">
      <Calendar class="text-muted-foreground h-8 w-8"></Calendar>
      <p class="text-muted-foreground text-sm">No active schedules</p>
    </div>
  {:else if config.size === 'small'}
    <div class="font-bold tabular-nums {headlineClass}">{activeSchedules.length}</div>
    <p class="text-muted-foreground mt-0.5 text-xs tabular-nums">
      <span class={netTone}>
        {netAmount >= 0 ? '+' : ''}{currencyFormatter.format(netAmount)}
      </span>
      net per cycle
    </p>
  {:else}
    <div class="space-y-1.5">
      {#each visibleSchedules as schedule}
        {@const amount = Number(schedule.amount) || 0}
        <div class="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors {p.rowHover}">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full {p.iconBgSoft} {p.iconFg}">
            <Calendar class="h-4 w-4"></Calendar>
          </div>
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
            class="shrink-0 text-sm font-semibold tabular-nums"
            class:text-amount-positive={amount > 0}
            class:text-amount-negative={amount < 0}
            class:text-muted-foreground={amount === 0}>
            {amount > 0 ? '+' : ''}{currencyFormatter.format(amount)}
          </span>
        </div>
      {/each}
      {#if remaining > 0}
        <p class="text-muted-foreground pt-1 text-center text-xs">+{remaining} more</p>
      {/if}
    </div>
  {/if}
</div>
