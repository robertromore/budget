<script lang="ts">
import {cn} from '$lib/utils';
import type {WithElementRef} from 'bits-ui';
import type {HTMLAttributes} from 'svelte/elements';
import {useSidebar} from './context.svelte.js';

let {
  ref = $bindable(null),
  class: className,
  children,
  ...restProps
}: WithElementRef<HTMLAttributes<HTMLDivElement>, HTMLDivElement> = $props();

const sidebar = useSidebar();
</script>

<div
  bind:this={ref}
  data-sidebar="rail"
  class={cn(
    'absolute inset-y-0 z-20 hidden w-10 -translate-x-1/2 flex-col items-center transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 sm:flex',
    'group-data-[collapsible=offcanvas]:translate-x-0',
    '[[data-side=left][data-collapsible=offcanvas]_&]:-right-2',
    '[[data-side=right][data-collapsible=offcanvas]_&]:-left-2',
    className
  )}
  {...restProps}>
  <button
    aria-label="Toggle Sidebar"
    tabIndex={-1}
    onclick={() => sidebar.toggle()}
    title="Toggle Sidebar"
    class={cn(
      'hover:after:bg-sidebar-border relative w-full flex-1 transition-all ease-linear after:absolute after:inset-y-0 after:left-1/2 after:w-[2px]',
      '[[data-side=left]_&]:cursor-w-resize [[data-side=right]_&]:cursor-e-resize',
      '[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize',
      'group-data-[collapsible=offcanvas]:hover:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full'
    )}>
  </button>
  {#if children}
    <div class="flex flex-col items-center gap-2 pb-4">
      {@render children()}
    </div>
  {/if}
</div>
