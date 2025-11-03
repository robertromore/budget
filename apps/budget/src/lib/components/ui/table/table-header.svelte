<script lang="ts">
import {cn, type WithElementRef} from '$lib/utils';
import type {HTMLAttributes} from 'svelte/elements';

interface Props extends WithElementRef<HTMLAttributes<HTMLTableSectionElement>> {
  stickyHeader?: boolean;
}

let {
  ref = $bindable(null),
  class: className,
  stickyHeader = false,
  children,
  ...restProps
}: Props = $props();
</script>

<thead
  bind:this={ref}
  data-slot="table-header"
  class={cn(
    '[&_tr]:border-b',
    stickyHeader && 'sticky top-0 z-10 bg-background',
    className
  )}
  {...restProps}>
  {@render children?.()}
</thead>
