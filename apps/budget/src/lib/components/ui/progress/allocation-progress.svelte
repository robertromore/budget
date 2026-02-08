<script lang="ts">
import { cn } from '$lib/utils';
import type { HTMLAttributes } from 'svelte/elements';

export interface Props extends HTMLAttributes<HTMLDivElement> {
  /** Current allocated value (solid segment) */
  value?: number;
  /** Projected additional value (semi-transparent segment) */
  projected?: number;
  /** Maximum value */
  max?: number;
}

let {
  value = 0,
  projected = 0,
  max = 100,
  class: className,
  ...restProps
}: Props = $props();

const valuePercent = $derived.by(() => {
  if (max <= 0) return 0;
  return Math.min(100, Math.max(0, (value / max) * 100));
});

const projectedPercent = $derived.by(() => {
  if (max <= 0 || projected <= 0) return 0;
  const remaining = 100 - valuePercent;
  return Math.min(remaining, (projected / max) * 100);
});

const isOverAllocated = $derived(value > max);
</script>

<div
  class={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
  {...restProps}>
  {#if isOverAllocated}
    <div class="bg-destructive h-full w-full rounded-full"></div>
  {:else}
    <!-- Solid segment: current allocation -->
    <div
      class="bg-primary absolute top-0 left-0 h-full transition-all duration-300"
      style="width: {valuePercent}%; border-radius: inherit;">
    </div>
    <!-- Projected segment: proposed amount -->
    {#if projectedPercent > 0}
      <div
        class="bg-primary/40 absolute top-0 h-full transition-all duration-300"
        style="left: {valuePercent}%; width: {projectedPercent}%">
      </div>
    {/if}
  {/if}
</div>
