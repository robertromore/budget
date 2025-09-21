<script lang="ts">
// --- Imports ---
import {Button} from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import {tick} from 'svelte';
import NumericInput from './numeric-input.svelte';

// --- Props ---
let {
  value = $bindable([0, 0]),
  open = $bindable(),
  type = $bindable('exact'),
}: {
  value: [number, number];
  onSubmit?: () => void;
  open?: boolean;
  type?: 'exact' | 'approximate' | 'range';
} = $props();

let types = $state([
  {value: 'exact', label: 'is exactly'},
  {value: 'approximate', label: 'is approximately'},
  {value: 'range', label: 'is between'},
]);
let triggerRef = $state<HTMLButtonElement>(null!);
let typeOpen = $state(false);

// --- Functions: Type Selection ---
function closeAndFocusTrigger() {
  typeOpen = false;
  tick().then(() => {
    triggerRef.focus();
  });
}

// --- Functions: Range Logic ---
function handleTypeChange(newType: 'exact' | 'approximate' | 'range') {
  if (newType === 'range' && type !== 'range') {
    // When switching to range, set max to min + 0.01 if max is not already set
    if ((value[1] ?? 0) === 0 || (value[1] ?? 0) <= (value[0] ?? 0)) {
      value[1] = (value[0] ?? 0) + 0.01;
    }
  }
  type = newType;
}

// --- Reactive Effects ---
$effect(() => {
  // Ensure max is always at least min + 0.01 in range mode
  if (type === 'range' && (value[1] ?? 0) <= (value[0] ?? 0)) {
    value[1] = (value[0] ?? 0) + 0.01;
  }
});
</script>

<div class="space-y-3">
  <!-- Type Selector -->
  <div class="flex items-center justify-between">
    <span class="text-sm font-medium">Amount Type</span>
    <Popover.Root bind:open={typeOpen}>
      <Popover.Trigger bind:ref={triggerRef}>
        {#snippet child({props})}
          <Button
            variant="outline"
            size="sm"
            class="justify-between min-w-[140px]"
            {...props}
            role="combobox"
            aria-expanded={open}>
            {types.find((t) => t.value === type)?.label ?? 'Select Type'}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-auto p-0">
        <Command.Root>
          <Command.List>
            <Command.Group>
              {#each types as availableType}
                <Command.Item
                  value={availableType.label}
                  onSelect={() => {
                    handleTypeChange(availableType.value as 'exact' | 'approximate' | 'range');
                    closeAndFocusTrigger();
                  }}>
                  {availableType.label}
                </Command.Item>
              {/each}
            </Command.Group>
          </Command.List>
        </Command.Root>
      </Popover.Content>
    </Popover.Root>
  </div>

  <!-- Amount Input(s) -->
  {#if type === 'exact' || type === 'approximate'}
    <NumericInput bind:value={value[0]} buttonClass="w-full" />
  {:else if type === 'range'}
    <div class="grid grid-cols-2 gap-3">
      <div class="space-y-1">
        <label class="text-xs text-muted-foreground">Minimum</label>
        <NumericInput bind:value={value[0]} buttonClass="w-full" />
      </div>
      <div class="space-y-1">
        <label class="text-xs text-muted-foreground">Maximum</label>
        <NumericInput bind:value={value[1]} buttonClass="w-full" />
      </div>
    </div>
  {/if}
</div>
