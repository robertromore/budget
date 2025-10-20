<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import Check from '@lucide/svelte/icons/check';
import User from '@lucide/svelte/icons/user';
import Sparkles from '@lucide/svelte/icons/sparkles';
import X from '@lucide/svelte/icons/x';
import type {Row} from '@tanstack/table-core';
import type {ImportRow} from '$lib/types/import';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {cn} from '$lib/utils';
import Fuse from 'fuse.js';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  temporaryPayees?: string[];
}

let {row, onUpdate, temporaryPayees = []}: Props = $props();

const payeeState = PayeesState.get();
const payeesArray = $derived(payeeState ? Array.from(payeeState.payees.values()) : []);

// Get the current value from the row data
const initialPayeeName = $derived(row.original.normalizedData['payee'] as string | undefined);

// Local state for the selected payee
let selectedPayeeName = $state<string>('');
let selectedPayeeId = $state<number | null>(null);

// Sync with initial value reactively
$effect(() => {
  if (initialPayeeName && selectedPayeeName !== initialPayeeName) {
    selectedPayeeName = initialPayeeName;
    // Try to find matching payee from the initial name
    const match = payeesArray.find(p => p.name?.toLowerCase() === initialPayeeName.toLowerCase());
    if (match) {
      selectedPayeeId = match.id;
    } else {
      selectedPayeeId = null;
    }
  }
});

const rowIndex = $derived(row.original.rowIndex);
let open = $state(false);
let searchValue = $state('');

// When dropdown opens, pre-fill search with current name if creating new
$effect(() => {
  if (open && needsCreation && !searchValue && selectedPayeeName) {
    searchValue = selectedPayeeName;
  }
  if (!open) {
    searchValue = '';
  }
});

// Combine existing payees with temporary ones for search
const combinedItems = $derived.by(() => {
  const existing = payeesArray.map(p => ({type: 'existing' as const, payee: p, name: p.name || ''}));
  const temporary = temporaryPayees
    .filter(name => !payeesArray.some(p => p.name?.toLowerCase() === name.toLowerCase()))
    .map(name => ({type: 'temporary' as const, name}));
  return [...existing, ...temporary];
});

const fused = $derived(new Fuse(combinedItems, {keys: ['name'], includeScore: true, threshold: 0.3}));

let visibleItems = $derived.by(() => {
  if (searchValue) {
    return fused.search(searchValue).map((result) => result.item);
  }
  return combinedItems;
});

const visiblePayees = $derived(visibleItems.filter(item => item.type === 'existing').map(item => item.payee));
const visibleTemporaryPayees = $derived(visibleItems.filter(item => item.type === 'temporary').map(item => item.name));

const selectedPayee = $derived(payeesArray.find(p => p.id === selectedPayeeId));
const displayName = $derived(selectedPayee?.name || selectedPayeeName || 'Select payee...');

// Check if the suggested name from CSV doesn't match any existing payee
const needsCreation = $derived(
  selectedPayeeName &&
  !selectedPayeeId &&
  !payeesArray.some(p => p.name?.toLowerCase() === selectedPayeeName.toLowerCase())
);

function handleSelect(payeeId: number, payeeName: string) {
  selectedPayeeId = payeeId;
  selectedPayeeName = payeeName;
  onUpdate?.(rowIndex, payeeId, payeeName);
  open = false;
  searchValue = '';
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim() || selectedPayeeName;
  if (nameToCreate) {
    selectedPayeeName = nameToCreate;
    selectedPayeeId = null;
    onUpdate?.(rowIndex, null, nameToCreate);
    open = false;
    searchValue = '';
  }
}

function handleSelectTemporary(payeeName: string) {
  selectedPayeeName = payeeName;
  selectedPayeeId = null;
  onUpdate?.(rowIndex, null, payeeName);
  open = false;
  searchValue = '';
}

function handleClear() {
  selectedPayeeName = '';
  selectedPayeeId = null;
  onUpdate?.(rowIndex, null, null);
  open = false;
  searchValue = '';
}
</script>

<div class="w-full min-w-[200px]">
  <Popover.Root bind:open>
    <Popover.Trigger>
      {#snippet child({props})}
        <Button
          {...props}
          variant="outline"
          class={cn(
            'w-full h-8 text-xs justify-start overflow-hidden text-ellipsis whitespace-nowrap',
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
            {#if selectedPayeeName || selectedPayeeId}
              <Command.Item
                value="clear"
                onSelect={() => handleClear()}
                class="text-destructive">
                <X class="mr-2 h-4 w-4" />
                Clear payee
              </Command.Item>
              <Command.Separator />
            {/if}
            {#if searchValue.trim() && visiblePayees.length === 0 && visibleTemporaryPayees.length === 0}
              <Command.Item
                value="create-new"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{searchValue}"
              </Command.Item>
            {:else if needsCreation && !searchValue}
              <Command.Item
                value="create-suggested"
                onSelect={() => handleCreateNew()}
                class="text-primary">
                <Check class="mr-2 h-4 w-4 text-transparent" />
                Create "{selectedPayeeName}"
              </Command.Item>
            {/if}
            {#each visiblePayees as payee (payee.id)}
              <Command.Item
                value={String(payee.id)}
                onSelect={() => handleSelect(payee.id, payee.name || '')}>
                <Check class={cn('mr-2 h-4 w-4', selectedPayeeId !== payee.id && 'text-transparent')} />
                {payee.name}
              </Command.Item>
            {/each}
            {#if visibleTemporaryPayees.length > 0}
              <Command.Separator />
              <Command.Group heading="Temporary (Will be created)">
                {#each visibleTemporaryPayees as tempPayee}
                  <Command.Item
                    value={tempPayee}
                    onSelect={() => handleSelectTemporary(tempPayee)}
                    class="text-blue-600">
                    <Sparkles class={cn('mr-2 h-4 w-4', selectedPayeeName !== tempPayee && 'text-transparent')} />
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
