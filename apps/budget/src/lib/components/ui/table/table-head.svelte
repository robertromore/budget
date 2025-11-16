<script lang="ts">
import { cn, type WithElementRef } from '$lib/utils';
import type { HTMLThAttributes } from 'svelte/elements';

interface Props extends WithElementRef<HTMLThAttributes> {
  density?: 'normal' | 'dense';
}

let {
  ref = $bindable(null),
  class: className,
  density = 'normal',
  children,
  ...restProps
}: Props = $props();
</script>

<th
  bind:this={ref}
  data-slot="table-head"
  class={cn(
    'text-foreground bg-clip-padding px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0',
    density === 'dense' ? 'h-8' : 'h-10',
    className
  )}
  {...restProps}>
  {@render children?.()}
</th>
