<script lang="ts">
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import {cn} from '$lib/utils';
import PlusCircle from '@lucide/svelte/icons/plus-circle';
import type {PayeeType, PaymentFrequency, Payee} from '$lib/schema';
import type {PayeeSearchFilters} from '$lib/server/domains/payees/repository';

interface FilterOption {
  label: string;
  value: string;
  icon?: any;
}

interface Props {
  title: string;
  options: FilterOption[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  variant?: 'default' | 'outline';
  payees?: Payee[];
  fieldName?: keyof Payee;
}

let {
  title,
  options,
  selectedValues = $bindable(),
  onSelectionChange,
  variant = 'outline',
  payees = [],
  fieldName,
}: Props = $props();

const toggleOption = (value: string, checked: boolean) => {
  const newValues = checked
    ? [...selectedValues, value]
    : selectedValues.filter((v) => v !== value);

  selectedValues = newValues;
  onSelectionChange(newValues);
};

const clearSelection = () => {
  selectedValues = [];
  onSelectionChange([]);
};

const selectedLabels = $derived.by(() => {
  return selectedValues
    .map((value) => options.find((option) => option.value === value)?.label)
    .filter(Boolean);
});

const facetCounts = $derived.by(() => {
  if (!payees || !fieldName) {
    return {};
  }

  // Count actual occurrences of each option value in the payee data
  const counts: Record<string, number> = {};

  options.forEach((option) => {
    counts[option.value] = 0;
  });

  payees.forEach((payee) => {
    const fieldValue = payee[fieldName];

    if (fieldName === 'isActive') {
      // Handle boolean field
      const boolValue = fieldValue ? 'true' : 'false';
      if (counts[boolValue] !== undefined) {
        counts[boolValue]++;
      }
    } else if (fieldValue && typeof fieldValue === 'string') {
      // Handle string fields (payeeType, paymentFrequency)
      if (counts[fieldValue] !== undefined) {
        counts[fieldValue]++;
      }
    }
  });

  return counts;
});
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({props})}
      <Button {...props} {variant} size="sm" class="h-8 border-dashed">
        <PlusCircle class="mr-2 h-4 w-4" />
        {title}
        {#if selectedValues.length > 0}
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge variant="secondary" class="rounded-sm px-1 font-normal lg:hidden">
            {selectedValues.length}
          </Badge>
          <div class="hidden space-x-1 lg:flex">
            {#if selectedValues.length > 2}
              <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                {selectedValues.length} selected
              </Badge>
            {:else}
              {#each selectedLabels as label}
                <Badge variant="secondary" class="rounded-sm px-1 font-normal">
                  {label}
                </Badge>
              {/each}
            {/if}
          </div>
        {/if}
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>

  <DropdownMenu.Content class="w-[200px]" align="start">
    {#each options as option}
      <DropdownMenu.CheckboxItem
        checked={selectedValues.includes(option.value)}
        onCheckedChange={(checked) => toggleOption(option.value, checked)}>
        {#if option.icon}
          <option.icon class="text-muted-foreground mr-2 h-4 w-4"></option.icon>
        {/if}
        <span>{option.label}</span>
        {#if facetCounts[option.value]}
          <span
            class="text-muted-foreground ml-auto flex h-4 w-4 items-center justify-center font-mono text-xs">
            {facetCounts[option.value]}
          </span>
        {/if}
      </DropdownMenu.CheckboxItem>
    {/each}
    {#if selectedValues.length > 0}
      <DropdownMenu.Separator />
      <DropdownMenu.Item onclick={clearSelection} class="justify-center text-center">
        Clear filters
      </DropdownMenu.Item>
    {/if}
  </DropdownMenu.Content>
</DropdownMenu.Root>
