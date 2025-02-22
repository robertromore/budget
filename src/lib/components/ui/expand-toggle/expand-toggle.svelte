<script lang="ts">
  import { Checkbox as CheckboxPrimitive, type WithoutChildrenOrChild } from "bits-ui";
  import Minimize from "lucide-svelte/icons/minimize-2";
  import Expand from "lucide-svelte/icons/expand";
  import { cn } from "$lib/utils.js";

  let {
    ref = $bindable(null),
    checked = $bindable(false),
    class: className,
    ...restProps
  }: WithoutChildrenOrChild<CheckboxPrimitive.RootProps> = $props();
</script>

<CheckboxPrimitive.Root
  bind:ref
  class={cn(
    "peer box-content size-5 shrink-0 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-50",
    className
  )}
  bind:checked
  {...restProps}
>
  {#snippet children({ checked })}
    <div class="flex items-center justify-center text-current">
      {#if checked}
        <Minimize class="size-4 text-slate-500" />
      {:else}
        <Expand class="size-4 text-slate-500" />
      {/if}
    </div>
  {/snippet}
</CheckboxPrimitive.Root>
