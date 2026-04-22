<script lang="ts">
import { cn } from '$lib/utils';
import type { BudgetProgressStatus } from '$core/schema/budgets';

/**
 * Single-row inline progress indicator for data-table cells. The full
 * `BudgetProgress` card's Spent / Over / Over-Budget labels live in
 * adjacent table columns (Consumed, Remaining, Status), so those get
 * stripped here. All we need: a capped bar + the clamped percent.
 */
interface Props {
  consumed?: number;
  allocated?: number;
  status?: BudgetProgressStatus;
  class?: string;
}

let { consumed = 0, allocated = 0, status = 'on_track', class: className }: Props = $props();

const ratio = $derived.by(() => {
  if (!Number.isFinite(allocated) || allocated <= 0) return 0;
  return consumed / allocated;
});

const percentage = $derived(Math.max(0, ratio * 100));
const clampedPercentage = $derived(Math.min(percentage, 100));

const displayPercent = $derived.by(() => {
  const rounded = Math.round(percentage);
  return rounded > 999 ? '999+%' : `${rounded}%`;
});

const barClasses = $derived.by(() => {
  switch (status) {
    case 'approaching':
      return 'bg-budget-warning';
    case 'over':
      return 'bg-budget-danger';
    case 'paused':
      return 'bg-muted-foreground/60';
    case 'setup_needed':
      return 'bg-info';
    case 'on_track':
    default:
      return 'bg-budget-success';
  }
});

const percentColor = $derived(
  status === 'over'
    ? 'text-destructive font-medium'
    : status === 'approaching'
      ? 'text-budget-warning-foreground font-medium'
      : 'text-muted-foreground',
);
</script>

<div class={cn('flex items-center gap-2', className)}>
  <div
    class="bg-muted relative h-1.5 w-24 overflow-hidden rounded-full"
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={Math.round(clampedPercentage)}
    aria-valuetext={`${Math.round(percentage)}% of budget`}>
    <div
      class={cn('h-full rounded-full transition-all duration-300', barClasses)}
      style={`width: ${clampedPercentage}%`}>
    </div>
  </div>
  <span class={cn('text-xs tabular-nums', percentColor)}>
    {displayPercent}
  </span>
</div>
