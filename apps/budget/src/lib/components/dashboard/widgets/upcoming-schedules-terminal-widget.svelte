<script lang="ts">
import type { DashboardWidget } from '$core/schema/dashboards';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { currencyFormatter } from '$lib/utils/formatters';

let { config }: { config: DashboardWidget } = $props();

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
      return schedulesByAbs.slice(0, 5);
    case 'large':
      return schedulesByAbs.slice(0, 10);
    default:
      return schedulesByAbs.slice(0, 18);
  }
});
const remaining = $derived(activeSchedules.length - visibleSchedules.length);

const netAmount = $derived(
  activeSchedules.reduce((s, sch) => s + (Number(sch.amount) || 0), 0)
);

function padRight(s: string, n: number): string {
  if (s.length >= n) return s.slice(0, n - 1) + '…';
  return s + ' '.repeat(n - s.length);
}

function compactCurrency(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1000) return (n >= 0 ? '' : '-') + '$' + (abs / 1000).toFixed(1) + 'K';
  return currencyFormatter.format(n);
}

const netTone = $derived(
  netAmount > 0
    ? 'widget-terminal-bright'
    : netAmount < 0
      ? 'widget-terminal-neg'
      : 'widget-terminal-faint'
);
</script>

<div class="widget-terminal">
  <div class="mb-2 flex items-baseline justify-between border-b border-(--term-border) pb-1.5">
    <span class="widget-terminal-heading">{config.title || 'SCHED.QUEUE'}</span>
    {#if config.size !== 'small'}
      <span class="widget-terminal-faint text-[10px]">{activeSchedules.length} ACTIVE</span>
    {/if}
  </div>

  {#if activeSchedules.length === 0}
    <div class="widget-terminal-muted py-6 text-center text-[10px]">
      &gt; no.active.schedules
    </div>
  {:else if config.size === 'small'}
    <div class="flex items-baseline gap-2">
      <span class="widget-terminal-bright text-base tabular-nums">
        {activeSchedules.length}
      </span>
      <span class="text-[10px] tabular-nums {netTone}">
        {netAmount >= 0 ? '+' : ''}{compactCurrency(netAmount)}
      </span>
    </div>
    <div class="widget-terminal-faint mt-0.5 text-[9px] uppercase">ACTIVE · NET</div>
  {:else}
    <div class="space-y-0.5 text-[11px] tabular-nums">
      <div class="widget-terminal-muted text-[10px] uppercase">
        {padRight('NAME', 22)}{padRight('TYPE', 8)}AMOUNT
      </div>
      {#each visibleSchedules as schedule}
        {@const amount = Number(schedule.amount) || 0}
        {@const typeTag = schedule.recurring ? 'RECUR' : 'ONE'}
        <div class="flex items-center gap-0.5">
          <span class="widget-terminal-bright shrink-0">{padRight(schedule.name, 22)}</span>
          <span class="widget-terminal-dim shrink-0">{padRight(typeTag, 8)}</span>
          <span
            class="ml-auto shrink-0"
            class:widget-terminal-bright={amount > 0}
            class:widget-terminal-neg={amount < 0}
            class:widget-terminal-faint={amount === 0}>
            {amount > 0 ? '+' : ''}{compactCurrency(amount)}
          </span>
        </div>
      {/each}
      {#if remaining > 0}
        <div class="widget-terminal-muted pt-1 text-[10px]">
          &hellip; +{remaining} more
        </div>
      {/if}
    </div>
  {/if}
</div>
