<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';

interface Option {
  value: string;
  label: string;
}

interface Props {
  value: string;
  options: Option[];
  onSave: (newValue: string) => Promise<void>;
}

let {value, options, onSave}: Props = $props();

const currentLabel = $derived(options.find((opt) => opt.value === value)?.label || value);

const handleSelect = async (newValue: string) => {
  if (newValue !== value) {
    await onSave(newValue);
  }
};
</script>

<DropdownMenu.Root>
  <DropdownMenu.Trigger>
    {#snippet child({props})}
      <Button {...props} variant="ghost" size="sm" class="justify-start text-left font-normal">
        <span class="truncate">{currentLabel}</span>
        <ChevronDown class="ml-2 size-4 opacity-50" />
      </Button>
    {/snippet}
  </DropdownMenu.Trigger>
  <DropdownMenu.Content align="start">
    <DropdownMenu.Label>Select Type</DropdownMenu.Label>
    <DropdownMenu.Separator />
    {#each options as option}
      <DropdownMenu.Item onclick={() => handleSelect(option.value)}>
        <Check class="mr-2 size-4 {value === option.value ? 'opacity-100' : 'opacity-0'}" />
        {option.label}
      </DropdownMenu.Item>
    {/each}
  </DropdownMenu.Content>
</DropdownMenu.Root>
