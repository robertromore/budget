<script lang="ts">
  import { cn } from "$lib/utils";
  import { RangeCalendar as RangeCalendarPrimitive } from "bits-ui";
  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: RangeCalendarPrimitive.HeaderProps = $props();
</script>
<RangeCalendarPrimitive.Header
  bind:ref
  class={cn(
    "h-(--cell-size) flex w-full items-center justify-center gap-1.5 text-sm font-medium",
    className
  )}
  {...restProps}
/>
