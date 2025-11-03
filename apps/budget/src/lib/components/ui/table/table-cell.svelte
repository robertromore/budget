<script lang="ts">
import {cn, type WithElementRef} from '$lib/utils';
import type {HTMLTdAttributes} from 'svelte/elements';

interface Props extends WithElementRef<HTMLTdAttributes> {
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

<td
  bind:this={ref}
  data-slot="table-cell"
  class={cn(
    'bg-clip-padding align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0',
    density === 'dense' ? 'px-2 py-1' : 'p-2',
    className
  )}
  {...restProps}>
  {@render children?.()}
</td>
