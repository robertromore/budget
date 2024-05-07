<script lang="ts">
  import * as Combobox from '$lib/components/ui/combobox';
  import { cn, flyAndScale } from '$lib/utils';
  import type { Selected } from 'bits-ui';

  type SelectValue = { label: string; value: string };
  type Props = {
    items: SelectValue[];
    inputValue: string;
    touchedInput: boolean;
    value: Selected<string | undefined> | undefined;
    class?: string;
    changeFilterValue: (new_value: unknown) => any;
  };

  let {
    items,
    inputValue = $bindable(''),
    touchedInput = $bindable(false),
    value = $bindable(),
    class: className,
    changeFilterValue
  }: Props = $props();

  let filteredItems = $state() as SelectValue[];
  $effect(() => {
    filteredItems =
      inputValue && touchedInput
        ? items.filter(
            (item) =>
              item.value &&
              typeof item.value === 'string' &&
              item.value.includes(inputValue.toLowerCase())
          )
        : items;
  });
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
        placeholder="Search entities"
        aria-label="Search entities"
        bind:value
        onClear={() => {
          value = {
            value: '',
            label: ''
          };
          changeFilterValue(undefined);
        }}
      />
    </div>

    <Combobox.Content transition={flyAndScale}>
      {#each filteredItems as item (item.value)}
        <Combobox.Item value={item.value} label={item.label}>
          {item.label}
          <Combobox.ItemIndicator class="ml-auto" asChild={false} />
        </Combobox.Item>
      {:else}
        <span class="block px-5 py-2 text-sm text-muted-foreground"> No results found </span>
      {/each}
    </Combobox.Content>
  </Combobox.Root>
</div>
