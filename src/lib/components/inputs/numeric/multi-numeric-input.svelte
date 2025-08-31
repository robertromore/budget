<script lang="ts">
  // --- Imports ---
  import { Button } from "$lib/components/ui/button";
  import * as Command from "$lib/components/ui/command";
  import NumericInput from "./numeric-input.svelte";
  import * as Popover from "$lib/components/ui/popover";
  import { tick } from "svelte";

  // --- Props ---
  let {
    value = $bindable([0,0]),
    open = $bindable(),
    type = $bindable("exact"),
  }: {
    value: number[];
    onSubmit?: () => void;
    open?: boolean;
    type?: "exact" | "approximate" | "range";
  } = $props();

  let types = $state([
    { value: "exact", label: "is exactly" },
    { value: "approximate", label: "is approximately" },
    { value: "range", label: "is between" }
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

</script>

<div class="flex items-center space-x-1">
  <!-- Type Selector -->
  <Popover.Root bind:open={typeOpen}>
    <Popover.Trigger bind:ref={triggerRef}>
      {#snippet child({ props })}
        <Button
          variant="outline"
          class="justify-between"
          {...props}
          role="combobox"
          aria-expanded={open}
        >
          {types.find((t) => t.value === type)?.label || "Select Type"}
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
                  type = availableType.value as "exact" | "approximate" | "range";
                  closeAndFocusTrigger();
                }}
              >
                {availableType.label}
              </Command.Item>
            {/each}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  {#if type === 'exact' || type === 'approximate'}
    <NumericInput
      bind:value={value[0]}
    />
  {:else if type === 'range'}
    <NumericInput
      bind:value={value[0]}
    />
    <NumericInput
      bind:value={value[1]}
    />
  {/if}
</div>
