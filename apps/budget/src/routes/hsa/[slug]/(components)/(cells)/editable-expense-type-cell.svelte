<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import { medicalExpenseCategories } from '$lib/schema/medical-expenses';
import { cn } from '$lib/utils';
import Check from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';

interface Props {
  value: string;
  onSave: (newValue: string) => Promise<void>;
}

let { value, onSave }: Props = $props();

let open = $state(false);
let searchQuery = $state('');

// Flatten all expenses with their categories for search
const allExpenses = $derived(
  Object.entries(medicalExpenseCategories).flatMap(([category, items]) =>
    items.map((item) => ({
      ...item,
      category,
    }))
  )
);

// Filter expenses based on search query
const filteredCategories = $derived.by(() => {
  if (!searchQuery.trim()) {
    return medicalExpenseCategories;
  }

  const query = searchQuery.toLowerCase();
  const filtered: Record<string, Array<{ key: string; label: string }>> = {};

  Object.entries(medicalExpenseCategories).forEach(([category, items]) => {
    const matchingItems = items.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.key.toLowerCase().includes(query) ||
        category.toLowerCase().includes(query)
    );

    if (matchingItems.length > 0) {
      filtered[category] = matchingItems;
    }
  });

  return filtered;
});

async function handleSelect(selectedValue: string) {
  if (selectedValue !== value) {
    await onSave(selectedValue);
  }
  open = false;
  searchQuery = '';
}

const selectedLabel = $derived(allExpenses.find((e) => e.key === value)?.label || value);
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="sm"
        role="combobox"
        aria-expanded={open}
        class="w-full justify-between font-normal">
        <span class="truncate text-left">{selectedLabel}</span>
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[500px] p-0" align="start">
    <Command.Root>
      <Command.Input bind:value={searchQuery} placeholder="Search expense types..." />
      <Command.Empty>No expense type found.</Command.Empty>
      <Command.List class="max-h-[400px]">
        {#each Object.entries(filteredCategories) as [category, items]}
          <Command.Group heading={category}>
            {#each items as item}
              <Command.Item value={item.key} onSelect={() => handleSelect(item.key)}>
                <Check
                  class={cn('mr-2 h-4 w-4', value === item.key ? 'opacity-100' : 'opacity-0')} />
                <span class="flex-1">{item.label}</span>
              </Command.Item>
            {/each}
          </Command.Group>
        {/each}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
