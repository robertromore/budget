<script lang="ts">
  import * as FormPrimitive from "formsnap";
  import type { WithoutChild } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    class: className,
    ...restProps
  }: WithoutChild<FormPrimitive.LegendProps> = $props();
</script>

<FormPrimitive.Legend
  bind:ref
  {...restProps}
  class={cn("data-[fs-error]:text-destructive text-sm font-medium leading-none", className)}
/>
