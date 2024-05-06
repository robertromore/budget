<script lang="ts">
  import { Combobox as ComboboxPrimitive } from 'bits-ui';
  import { scale } from 'svelte/transition';
  import { cn, flyAndScale } from '$lib/utils.js';

  type $$Props = ComboboxPrimitive.ContentProps;

  let className: $$Props['class'] = undefined;
  export let side: $$Props['side'] = 'bottom';
  export let sideOffset: $$Props['sideOffset'] = 0;
  export let align: $$Props['align'] = 'start';
  export let inTransition: $$Props['inTransition'] = flyAndScale;
  export let inTransitionConfig: $$Props['inTransitionConfig'] = undefined;
  export let outTransition: $$Props['outTransition'] = scale;
  export let outTransitionConfig: $$Props['outTransitionConfig'] = {
    start: 0.95,
    opacity: 0,
    duration: 50
  };
  export { className as class };
</script>

<ComboboxPrimitive.Content
  {inTransition}
  {inTransitionConfig}
  {outTransition}
  {outTransitionConfig}
  {side}
  {sideOffset}
  {align}
  class={cn(
    'relative z-50 mt-2 max-h-[300px] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md focus:outline-none',
    className
  )}
  {...$$restProps}
>
  <div class="p-1">
    <slot />
  </div>
</ComboboxPrimitive.Content>
