<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import Check from '@lucide/svelte/icons/check';
import User from '@lucide/svelte/icons/user';
import Sparkles from '@lucide/svelte/icons/sparkles';
import X from '@lucide/svelte/icons/x';
import type { Row } from '@tanstack/table-core';
import type { ImportRow } from '$lib/types/import';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { cn } from '$lib/utils';
import Fuse from 'fuse.js';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  temporaryPayees?: string[];
}

let { row, onUpdate, temporaryPayees = [] }: Props = $props();

const payeeState = PayeesState.get();
const payeesArray = $derived(payeeState ? Array.from(payeeState.payees.values()) : []);

const rowIndex = $derived(row.original.rowIndex);

// Access row data directly - get payee name from row (which includes overrides)
const selectedPayeeName = $derived(
  (row.original.normalizedData['payee'] as string | null | undefined) ?? ''
);

// Find matching payee ID from payee name
const selectedPayeeId = $derived.by(() => {
  const payeeName = selectedPayeeName;
  if (!payeeName) return null;
  const match = payeesArray.find((p) => p.name?.toLowerCase() === payeeName.toLowerCase());
  return match?.id || null;
});
let open = $state(false);
let searchValue = $state('');

// Combine existing payees with temporary ones for search
const combinedItems = $derived.by(() => {
  const existing = payeesArray.map((p) => ({
    type: 'existing' as const,
    payee: p,
    name: p.name || '',
  }));
  const temporary = temporaryPayees
    .filter((name) => !payeesArray.some((p) => p.name?.toLowerCase() === name.toLowerCase()))
    .map((name) => ({ type: 'temporary' as const, name }));
  return [...existing, ...temporary];
});

const fused = $derived(
  new Fuse(combinedItems, { keys: ['name'], includeScore: true, threshold: 0.3 })
);

let visibleItems = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return combinedItems;
});

const visiblePayees = $derived(
  visibleItems.filter((item) => item.type === 'existing').map((item) => item.payee)
);
const visibleTemporaryPayees = $derived(
  visibleItems.filter((item) => item.type === 'temporary').map((item) => item.name)
);

const selectedPayee = $derived(payeesArray.find((p) => p.id === selectedPayeeId));
const displayName = $derived(selectedPayee?.name || selectedPayeeName || 'Select payee...');

// Show "Create" option when: there's search text AND no exact match exists (case-sensitive)
const showCreateOption = $derived.by(() => {
  if (!searchValue.trim()) return false;
  const searchTrimmed = searchValue.trim();
  // Check for exact match (case-sensitive) - allows creating "Hy-Vee" even if "Hy-vee" exists
  const hasExactMatch =
    visiblePayees.some((p) => p.name === searchTrimmed) ||
    visibleTemporaryPayees.some((t) => t === searchTrimmed);
  return !hasExactMatch;
});

function handleSelect(payeeId: number, payeeName: string) {
  // Only call onUpdate if the value actually changed
  const hasChanged = selectedPayeeId !== payeeId || selectedPayeeName !== payeeName;

  if (hasChanged) {
    onUpdate?.(rowIndex, payeeId, payeeName);
  }

  searchValue = '';
  open = false;
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim();
  if (nameToCreate) {
    console.log('PayeeCell handleCreateNew:', { rowIndex, payeeId: null, payeeName: nameToCreate });
    onUpdate?.(rowIndex, null, nameToCreate);
    searchValue = '';
    open = false;
  }
}

function handleSelectTemporary(payeeName: string) {
  const hasChanged = selectedPayeeName !== payeeName;

  if (hasChanged) {
    console.log('PayeeCell handleSelectTemporary:', { rowIndex, payeeId: null, payeeName });
    onUpdate?.(rowIndex, null, payeeName);
  }

  searchValue = '';
  open = false;
}

function handleClear() {
  onUpdate?.(rowIndex, null, null);
  searchValue = '';
  open = false;
}
</script>

<div class="w-full min-w-[200px]">
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({ props })}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'h-8 w-full justify-start overflow-hidden text-xs text-ellipsis whitespace-nowrap',
            !selectedPayee && !selectedPayeeName && 'text-muted-foreground'
          )}>
          <User class="mr-2 h-3 w-3" />
          {displayName}
        </Button>
      {/snippet}
    </Popover.Trigger>
    <Popover.Content class="w-[250px] p-0" align="start">
      <Command.Root shouldFilter={false}>
        <Command.Input placeholder="Search or create payee..." bind:value={searchValue} />
        <Command.List class="max-h-[300px]">
          <Command.Group>
            {#if showCreateOption}
              <Command.Item
                value="create-new"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{searchValue.trim()}"
              </Command.Item>
            {/if}
            {#if (selectedPayeeName || selectedPayeeId) && !searchValue.trim()}
              <Command.Item value="clear" onSelect={() => handleClear()} class="text-destructive">
                <X class="mr-2 h-4 w-4" />
                Clear payee
              </Command.Item>
              <Command.Separator />
            {/if}
            {#each visiblePayees as payee (payee.id)}
              {@const isSelected = selectedPayeeId === payee.id}
              <Command.Item
                value={String(payee.id)}
                onSelect={() => handleSelect(payee.id, payee.name || '')}>
                <Check class={cn('mr-2 h-4 w-4', !isSelected && 'text-transparent')} />
                {payee.name}
              </Command.Item>
            {/each}
            {#if visibleTemporaryPayees.length > 0}
              <Command.Separator />
              <Command.Group heading="Temporary (Will be created)">
                {#each visibleTemporaryPayees as tempPayee}
                  {@const isSelected = selectedPayeeName === tempPayee}
                  <Command.Item
                    value={tempPayee}
                    onSelect={() => handleSelectTemporary(tempPayee)}
                    class="text-blue-600">
                    <Sparkles class={cn('mr-2 h-4 w-4', !isSelected && 'text-transparent')} />
                    {tempPayee}
                  </Command.Item>
                {/each}
              </Command.Group>
            {/if}
          </Command.Group>
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>
</div>
