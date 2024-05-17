<script lang="ts">
  import * as Combobox from '$lib/components/ui/combobox';
  import { cn, flyAndScale } from '$lib/utils';
  import type { Selected } from 'bits-ui';
  import { Button } from '../ui/button';

  type SelectValue = { label: string; value: string };
  type Props = {
    items: SelectValue[];
    allItems: SelectValue[];
    inputValue: string;
    touchedInput: boolean;
    value: Selected<string | undefined> | undefined;
    class?: string;
    changeFilterValue: (new_value: unknown) => void;
    label?: string;
    pluralLabel?: string;
  };

  let {
    items,
    allItems,
    inputValue = $bindable(''),
    touchedInput = $bindable(false),
    value = $bindable(),
    class: className,
    changeFilterValue,
    pluralLabel
  }: Props = $props();

  let showAllItems = $state(false);
  const filteredItems: SelectValue[] = $derived.by(() => {
    return inputValue && touchedInput
      ? allItems.filter(
          (item) =>
            item.label &&
            typeof item.label === 'string' &&
            item.label.includes(inputValue.toLowerCase())
        )
      : allItems;
  }) as SelectValue[];
  const filteredFacetedItems: SelectValue[] = $derived.by(() => {
    const itemValues = items.map((item) => item.value);
    return filteredItems.filter((item) => itemValues.includes(item.value))
  });
  const displayItems: SelectValue[] = $derived(showAllItems ? filteredItems : filteredFacetedItems);

  const toggleItems = () => {
    showAllItems = !showAllItems;
  };
</script>

<div class={cn('flex items-center space-x-4', className)}>
  <Combobox.Root
    {items}
    bind:inputValue
    bind:touchedInput
    bind:selected={value}
    onSelectedChange={changeFilterValue}
  >
    <div class="relative w-full">
      <Combobox.Input
        placeholder="Search {pluralLabel}"
        aria-label="Search {pluralLabel}"
        bind:value
        onClear={() => {
          value = {
            value: '',
            label: ''
          };
          changeFilterValue(undefined);
        }}
        inputClass="searchInput"
      />
    </div>

    <Combobox.Content transition={flyAndScale} sameWidth={false}>
      {#each displayItems as item (item.value)}
        <Combobox.Item value={item.value} label={item.label}>
          {item.label}
          <Combobox.ItemIndicator class="ml-auto" asChild={false} />
        </Combobox.Item>
      {:else}
        <span class="block px-5 py-2 text-sm text-muted-foreground">No results found</span>
      {/each}

      <Button onclick={toggleItems} variant="ghost" size="sm" class="px-2">
        {showAllItems ? 'Hide' : 'Show' } {filteredItems.length - filteredFacetedItems.length} not matching any transactions
      </Button>
    </Combobox.Content>
  </Combobox.Root>
</div>
