<script lang="ts">
  import type { FilterWidget } from "$lib/filters/BaseFilter.svelte";
  import { cn } from "$lib/utils";
  import * as ToggleGroup from "$lib/components/ui/toggle-group/index.js";

  type Props = {
    widgets: FilterWidget[];
    value: string;
    onValueChange?: ((value: string) => void) | ((value: string[]) => void) | ((value: undefined) => void);
  }

  let { widgets, value = $bindable(), onValueChange }: Props = $props();
</script>

<div class="grid grid-flow-col auto-cols-max absolute -top-5 right-2 bg-primary gap-0">
  <ToggleGroup.Root type="single" variant="outline" size="sm" class="gap-0" bind:value {onValueChange}>
  {#each widgets as widget}
    <ToggleGroup.Item value="{widget.id}" aria-label="{widget.label}" class="rounded-none border-0 hover:bg-primary-foreground-active hover:text-primary-foreground-active data-[state=on]:bg-primary-foreground-active data-[state=on]:text-primary-foreground-active size-5 p-1">
      <span class={cn(widget.icon, 'text-white')}></span>
    </ToggleGroup.Item>
    <!-- <Button class="size-5 p-0" builders={[builder]}><span class={cn(widget.icon, 'text-white')}></span></Button> -->
  {/each}
  </ToggleGroup.Root>
</div>
