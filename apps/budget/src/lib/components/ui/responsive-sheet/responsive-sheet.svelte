<script lang="ts">
  import { MediaQuery } from "svelte/reactivity";
  import * as Sheet from "../sheet/index.js";
  import * as Drawer from "../drawer/index.js";
  import type { Snippet } from "svelte";

  interface Props {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    side?: "top" | "right" | "bottom" | "left";
    trigger?: Snippet;
    header?: Snippet;
    content?: Snippet;
    footer?: Snippet;
    children?: Snippet;
  }

  let {
    open = $bindable(false),
    onOpenChange,
    side = "right",
    trigger,
    header,
    content,
    footer,
    children
  }: Props = $props();

  const isDesktop = new MediaQuery("(min-width: 768px)");

  // Handle open state changes
  $effect(() => {
    if (onOpenChange) {
      onOpenChange(open);
    }
  });
</script>

{#if isDesktop.current}
  <Sheet.Root bind:open>
    {#if trigger}
      <Sheet.Trigger>
        {@render trigger()}
      </Sheet.Trigger>
    {/if}
    <Sheet.Content {side} class="flex flex-col">
      {#if header}
        <Sheet.Header class="px-6 py-6 border-b">
          {@render header()}
        </Sheet.Header>
      {/if}
      <div class="flex-1 overflow-auto">
        {#if content}
          <div class="px-6 py-6">
            {@render content()}
          </div>
        {:else if children}
          <div class="px-6 py-6">
            {@render children()}
          </div>
        {/if}
      </div>
    </Sheet.Content>
  </Sheet.Root>
{:else}
  <Drawer.Root bind:open>
    {#if trigger}
      <Drawer.Trigger>
        {@render trigger()}
      </Drawer.Trigger>
    {/if}
    <Drawer.Content class="flex flex-col max-h-[85vh]">
      {#if header}
        <Drawer.Header class="text-left px-6 py-6 border-b">
          {@render header()}
        </Drawer.Header>
      {/if}
      <div class="flex-1 overflow-auto">
        {#if content}
          <div class="px-6 py-6">
            {@render content()}
          </div>
        {:else if children}
          <div class="px-6 py-6">
            {@render children()}
          </div>
        {/if}
      </div>
      {#if footer}
        <Drawer.Footer class="px-6 py-4 border-t">
          {@render footer()}
        </Drawer.Footer>
      {:else}
        <Drawer.Footer class="px-6 py-4 border-t">
          <Drawer.Close class="w-full">
            Close
          </Drawer.Close>
        </Drawer.Footer>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}