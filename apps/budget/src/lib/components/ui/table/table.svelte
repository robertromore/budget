<script lang="ts">
import type { HTMLTableAttributes } from 'svelte/elements';
import { cn, type WithElementRef } from '$lib/utils';

interface Props extends WithElementRef<HTMLTableAttributes> {
  containerClass?: string;
  stickyHeader?: boolean;
}

let {
  ref = $bindable(null),
  class: className,
  containerClass = '',
  stickyHeader = false,
  children,
  ...restProps
}: Props = $props();

const wrapperClass = $derived(
  cn(
    'relative w-full',
    !stickyHeader && 'overflow-x-auto',
    stickyHeader && 'overflow-visible',
    containerClass
  )
);

const tableClass = $derived(
  cn('w-full caption-bottom text-sm', stickyHeader && 'border-separate border-spacing-0', className)
);
</script>

<div data-slot="table-container" class={wrapperClass}>
  <table bind:this={ref} data-slot="table" class={tableClass} {...restProps}>
    {@render children?.()}
  </table>
</div>
