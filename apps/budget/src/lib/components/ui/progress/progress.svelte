<script lang="ts">
import {cn} from '$lib/utils';
import type {HTMLAttributes} from 'svelte/elements';

export interface Props extends HTMLAttributes<HTMLDivElement> {
  value?: number | undefined;
  max?: number | undefined;
  getValueLabel?: ((value: number, max: number) => string) | undefined;
}

let {
  value = 0,
  max = 100,
  getValueLabel = (value, max) => `${Math.round((value / max) * 100)}%`,
  class: className,
  ...restProps
}: Props = $props();

const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
  class={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
  {...restProps}>
  <div
    class="bg-primary h-full w-full flex-1 transition-all"
    style={`transform: translateX(-${100 - percentage}%)`}>
  </div>
</div>
