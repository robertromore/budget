<script lang="ts">
  import { Calendar as CalendarPrimitive } from 'bits-ui';
  import { buttonVariants } from '$lib/components/ui/button';
  import { cn } from '$lib/utils';

  type $$Props = CalendarPrimitive.NextButtonProps;
  type $$Events = CalendarPrimitive.NextButtonEvents;

  let className: $$Props['class'] = undefined;
  export { className as class };
</script>

<CalendarPrimitive.NextButton
  on:click
  class={cn(
    buttonVariants({ variant: 'outline' }),
    'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100',
    className
  )}
  {...$$restProps}
  let:builder
>
  <slot {builder}>
    <span class="icon-[lucide--chevron-right] h-4 w-4" />
  </slot>
</CalendarPrimitive.NextButton>
