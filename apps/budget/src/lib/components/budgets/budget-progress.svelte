<script lang="ts">
import { cn } from '$lib/utils';
import { currencyFormatter } from '$lib/utils/formatters';
import * as Tooltip from '$lib/components/ui/tooltip';
import type { BudgetProgressStatus, BudgetEnforcementLevel } from '$core/schema/budgets';

interface Props {
  consumed?: number;
  allocated?: number;
  status?: BudgetProgressStatus;
  enforcementLevel?: BudgetEnforcementLevel;
  formatter?: (value: number) => string;
  label?: string;
  consumedLabel?: string;
  showStatus?: boolean;
  showRemaining?: boolean;
  class?: string;
  size?: 'sm' | 'md' | 'lg';
  onStatusClick?: (status: BudgetProgressStatus) => void;
}

const defaultFormatter = (value: number) => currencyFormatter.format(value ?? 0);

let {
  consumed = 0,
  allocated = 0,
  status = 'on_track',
  enforcementLevel = 'warning',
  formatter = defaultFormatter,
  label = 'Budget Progress',
  consumedLabel = 'Spent',
  showStatus = true,
  showRemaining = true,
  class: className,
  size = 'md',
  onStatusClick,
}: Props = $props();

const ratio = $derived.by(() => {
  if (!Number.isFinite(allocated) || allocated <= 0) return 0;
  return consumed / allocated;
});

const percentage = $derived.by(() => Math.max(0, ratio * 100));
const clampedPercentage = $derived.by(() => Math.min(percentage, 100));
const remaining = $derived.by(() => allocated - consumed);

/**
 * Readable percent for the top-right label. Values beyond 999 read as
 * typos at a glance, so clamp display to `999+%`. The real magnitude
 * lives in the `+$delta` badge to the right of the track and in
 * `aria-valuetext` for screen readers.
 */
const displayPercent = $derived.by(() => {
  const rounded = Math.round(percentage);
  return rounded > 999 ? '999+%' : `${rounded}%`;
});

const statusLabel = $derived.by(() => {
  switch (status) {
    case 'approaching':
      return 'Approaching';
    case 'over':
      return 'Over Budget';
    case 'paused':
      return 'Paused';
    case 'setup_needed':
      return 'Setup Needed';
    case 'on_track':
    default:
      return 'On Track';
  }
});

const statusClasses = $derived.by(() => {
  switch (status) {
    case 'approaching':
      return 'bg-budget-warning text-budget-warning-foreground';
    case 'over':
      return 'bg-budget-danger text-budget-danger-foreground';
    case 'paused':
      return 'bg-muted text-muted-foreground';
    case 'setup_needed':
      return 'bg-info-bg text-info-fg';
    case 'on_track':
    default:
      return 'bg-budget-success text-budget-success-foreground';
  }
});

const barClasses = $derived.by(() => {
  switch (status) {
    case 'approaching':
      return 'bg-budget-warning';
    case 'over':
      return 'bg-budget-danger';
    case 'paused':
      return 'bg-muted-foreground';
    case 'setup_needed':
      return 'bg-info';
    case 'on_track':
    default:
      return 'bg-budget-success';
  }
});

const enforcementClasses = $derived.by(() => {
  switch (enforcementLevel) {
    case 'strict':
      return 'ring-1 ring-budget-danger/40';
    case 'warning':
      return 'ring-1 ring-budget-warning/20';
    case 'none':
    default:
      return '';
  }
});

const sizeClasses = $derived.by(() => {
  switch (size) {
    case 'sm':
      return 'p-3 text-xs';
    case 'lg':
      return 'p-5 text-sm';
    case 'md':
    default:
      return 'p-4 text-sm';
  }
});

const statusHelpText = $derived.by(() => {
  switch (status) {
    case 'setup_needed':
      return 'Add a period template to start tracking.';
    default:
      return null;
  }
});

function handleStatusClick() {
  onStatusClick?.(status);
}
</script>

<div class={cn('bg-card rounded-lg border shadow-sm', enforcementClasses, sizeClasses, className)}>
  <div class="flex items-center justify-between gap-3">
    <div class="text-card-foreground font-medium">{label}</div>
    <div
      class={cn('text-xs', percentage > 100 ? 'text-destructive font-medium' : 'text-muted-foreground')}>
      {displayPercent}
    </div>
  </div>

  <div class="mt-3 flex flex-col gap-3">
    <div
      class="bg-muted relative h-2 w-full overflow-hidden rounded-full"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clampedPercentage)}
      aria-valuetext={`${Math.round(percentage)}% of budget`}>
      <div
        class={cn('h-full rounded-full transition-all duration-300', barClasses)}
        style={`width: ${clampedPercentage}%`}>
      </div>

      {#if percentage > 100}
        <span
          class="text-destructive absolute inset-y-0 right-0 translate-x-full pl-2 text-xs font-medium">
          +{formatter(consumed - allocated)}
        </span>
      {/if}
    </div>

    <div class="grid gap-1 text-xs">
      <div class="text-muted-foreground flex items-center justify-between">
        <span>{consumedLabel}</span>
        <span class="text-card-foreground font-medium">{formatter(consumed)}</span>
      </div>

      {#if showRemaining}
        <div class="text-muted-foreground flex items-center justify-between">
          <span>{remaining >= 0 ? 'Remaining' : 'Over'}</span>
          <span class={cn('font-medium', remaining < 0 && 'text-destructive')}
            >{formatter(Math.abs(remaining))}</span>
        </div>
      {/if}
    </div>

    {#if showStatus}
      <div class="flex flex-col gap-1">
        {#if statusHelpText}
          <Tooltip.Root>
            <Tooltip.Trigger>
              <button
                type="button"
                class={cn(
                  'inline-flex w-max items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium capitalize',
                  statusClasses
                )}
                onclick={handleStatusClick}>
                <span class="size-1.5 rounded-full bg-current"></span>
                {statusLabel}
              </button>
            </Tooltip.Trigger>
            <Tooltip.Portal>
              <Tooltip.Content>
                {statusHelpText}
              </Tooltip.Content>
            </Tooltip.Portal>
          </Tooltip.Root>
        {:else}
          <button
            type="button"
            class={cn(
              'inline-flex w-max items-center gap-1 rounded-full px-2 py-0.5 text-[0.7rem] font-medium capitalize',
              statusClasses
            )}
            onclick={handleStatusClick}>
            <span class="size-1.5 rounded-full bg-current"></span>
            {statusLabel}
          </button>
        {/if}
      </div>
    {/if}
  </div>
</div>
