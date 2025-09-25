<script lang="ts">
import {MediaQuery} from 'svelte/reactivity';
import * as Sheet from '$lib/components/ui/sheet/index.js';
import * as Drawer from '$lib/components/ui/drawer/index.js';
import type {Snippet} from 'svelte';

interface Props {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  side?: 'top' | 'right' | 'bottom' | 'left';
  trigger?: Snippet;
  header?: Snippet;
  content?: Snippet;
  footer?: Snippet;
  children?: Snippet;
  class?: string;
}

let {
  open = $bindable(false),
  onOpenChange,
  side = 'right',
  trigger,
  header,
  content,
  footer,
  children,
  class: className,
}: Props = $props();

const isDesktop = new MediaQuery('(min-width: 768px)');

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
    <Sheet.Content {side} class="flex flex-col {className || ''}">
      {#if header}
        <Sheet.Header class="border-b px-6 py-6">
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
      {#if footer}
        <Sheet.Footer class="border-t px-6 py-4">
          {@render footer()}
        </Sheet.Footer>
      {/if}
    </Sheet.Content>
  </Sheet.Root>
{:else}
  <Drawer.Root bind:open>
    {#if trigger}
      <Drawer.Trigger>
        {@render trigger()}
      </Drawer.Trigger>
    {/if}
    <Drawer.Content class="flex max-h-[85vh] flex-col">
      {#if header}
        <Drawer.Header class="border-b px-6 py-6 text-left">
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
        <Drawer.Footer class="border-t px-6 py-4">
          {@render footer()}
        </Drawer.Footer>
      {:else}
        <Drawer.Footer class="border-t px-6 py-4">
          <Drawer.Close class="w-full">Close</Drawer.Close>
        </Drawer.Footer>
      {/if}
    </Drawer.Content>
  </Drawer.Root>
{/if}
