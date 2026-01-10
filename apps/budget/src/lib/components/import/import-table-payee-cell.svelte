<script lang="ts">
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import * as Tabs from '$lib/components/ui/tabs';
import { Checkbox } from '$lib/components/ui/checkbox';
import { Label } from '$lib/components/ui/label';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { AccountsState } from '$lib/states/entities';
import type { AliasCandidate, ImportRow } from '$lib/types/import';
import { cn } from '$lib/utils';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Check from '@lucide/svelte/icons/check';
import Sparkles from '@lucide/svelte/icons/sparkles';
import User from '@lucide/svelte/icons/user';
import Wallet from '@lucide/svelte/icons/wallet';
import X from '@lucide/svelte/icons/x';
import type { Row } from '@tanstack/table-core';
import Fuse from 'fuse.js';

interface Props {
  row: Row<ImportRow>;
  onUpdate?: (rowIndex: number, payeeId: number | null, payeeName: string | null) => void;
  onAliasCandidate?: (rowIndex: number, alias: AliasCandidate) => void;
  /** Handler for transfer account selection */
  onTransferUpdate?: (
    rowIndex: number,
    accountId: number | null,
    accountName: string | null,
    rememberMapping?: boolean
  ) => void;
  temporaryPayees?: string[];
  /** ID of the account being imported into (to exclude from transfer options) */
  currentAccountId?: number;
}

let { row, onUpdate, onAliasCandidate, onTransferUpdate, temporaryPayees = [], currentAccountId }: Props = $props();

// Get the original payee string from the import data (before any user overrides)
// This is set by import/+page.svelte when creating previewData
const rawPayeeString = $derived(row.original.originalPayee ?? '');

const payeeState = PayeesState.get();
const payeesArray = $derived(payeeState ? Array.from(payeeState.payees.values()) : []);

// Get accounts for transfer mode
const accountsState = AccountsState.get();
const accountsArray = $derived(
  accountsState?.all
    .filter((a) => a.id !== currentAccountId && !a.closed) // Exclude current account and closed accounts
    .map((a) => ({
      id: a.id,
      name: a.name,
      accountIcon: a.accountIcon,
      accountColor: a.accountColor,
    })) ?? []
);

const rowIndex = $derived(row.original.rowIndex);
const isInvalid = $derived(row.original.validationStatus === 'invalid');

// Check if this row is configured as a transfer
const transferAccountId = $derived(row.original.normalizedData['transferAccountId'] as number | null | undefined);
const transferAccountName = $derived(row.original.normalizedData['transferAccountName'] as string | null | undefined);
const isTransfer = $derived(!!transferAccountId);

// Check for suggested transfer from saved mappings
const suggestedTransferAccountId = $derived(
  row.original.normalizedData['suggestedTransferAccountId'] as number | undefined
);
const suggestedTransferAccountName = $derived(
  row.original.normalizedData['suggestedTransferAccountName'] as string | undefined
);
const transferMappingConfidence = $derived(
  row.original.normalizedData['transferMappingConfidence'] as 'high' | 'medium' | 'low' | undefined
);
const hasSuggestion = $derived(!!suggestedTransferAccountId && !isTransfer);

// Access row data directly - get payee name from row (which includes overrides)
const selectedPayeeName = $derived(
  (row.original.normalizedData['payee'] as string | null | undefined) ?? ''
);

// Get payee ID - prefer explicit ID from alias match, fall back to name lookup
const selectedPayeeId = $derived.by(() => {
  // First check if we have an explicit payeeId (from alias match or user selection)
  const explicitId = row.original.normalizedData['payeeId'] as number | null | undefined;
  if (explicitId && typeof explicitId === 'number') {
    return explicitId;
  }

  // Fall back to name lookup
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
const displayName = $derived.by(() => {
  // If this is a transfer, show the account name
  if (isTransfer && transferAccountName) {
    return transferAccountName;
  }
  return selectedPayee?.name || selectedPayeeName || 'Select payee...';
});

// Fuse for account search
const accountsFused = $derived(
  new Fuse(accountsArray, { keys: ['name'], includeScore: true, threshold: 0.3 })
);

// Account search value (separate from payee search)
let accountSearchValue = $state('');

// Visible accounts based on search
const visibleAccounts = $derived.by(() => {
  if (accountSearchValue.trim()) {
    return accountsFused.search(accountSearchValue).map((result) => result.item);
  }
  return accountsArray;
});

// Selected account (if in transfer mode)
const selectedAccount = $derived(accountsArray.find((a) => a.id === transferAccountId));

// Tab state - defaults based on whether this is already a transfer
let activeTab = $state<'payee' | 'transfer'>('payee');

// Sync tab state when transfer status changes or suggestion exists
$effect(() => {
  if (isTransfer) {
    activeTab = 'transfer';
  } else if (hasSuggestion) {
    // Auto-switch to transfer tab when we have a suggestion
    activeTab = 'transfer';
  }
});

// Remember mapping checkbox state - default to true so transfers are remembered
let rememberMapping = $state(true);

// Reset rememberMapping to true when popover opens (so it's checked by default each time)
$effect(() => {
  if (open) {
    rememberMapping = true;
  }
});

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

    // Emit alias candidate if the raw string differs from the selected payee
    // This allows us to remember this mapping for future imports
    if (rawPayeeString && rawPayeeString.trim() !== payeeName) {
      onAliasCandidate?.(rowIndex, {
        rawString: rawPayeeString.trim(),
        payeeId,
        payeeName,
      });
    }
  }

  searchValue = '';
  open = false;
}

function handleCreateNew() {
  const nameToCreate = searchValue.trim();
  if (nameToCreate) {
    onUpdate?.(rowIndex, null, nameToCreate);

    // Emit alias candidate if the raw string differs from the new payee name
    if (rawPayeeString && rawPayeeString.trim() !== nameToCreate) {
      onAliasCandidate?.(rowIndex, {
        rawString: rawPayeeString.trim(),
        payeeId: undefined,
        payeeName: nameToCreate,
      });
    }

    searchValue = '';
    open = false;
  }
}

function handleSelectTemporary(payeeName: string) {
  const hasChanged = selectedPayeeName !== payeeName;

  if (hasChanged) {
    onUpdate?.(rowIndex, null, payeeName);

    // Emit alias candidate if the raw string differs from the selected payee name
    if (rawPayeeString && rawPayeeString.trim() !== payeeName) {
      onAliasCandidate?.(rowIndex, {
        rawString: rawPayeeString.trim(),
        payeeId: undefined,
        payeeName,
      });
    }
  }

  searchValue = '';
  open = false;
}

function handleClear() {
  onUpdate?.(rowIndex, null, null);
  searchValue = '';
  open = false;
}

// Transfer handlers
function handleSelectAccount(accountId: number, accountName: string) {
  console.log('[PayeeCell] handleSelectAccount:', {
    rowIndex,
    accountId,
    accountName,
    rememberMapping,
  });
  onTransferUpdate?.(rowIndex, accountId, accountName, rememberMapping);
  accountSearchValue = '';
  open = false;
}

function handleClearTransfer() {
  onTransferUpdate?.(rowIndex, null, null, false);
  accountSearchValue = '';
  open = false;
}
</script>

<div class="w-full min-w-50">
  {#if isInvalid}
    <div
      class="text-muted-foreground flex h-8 w-full items-center overflow-hidden text-xs text-ellipsis whitespace-nowrap opacity-50">
      {#if isTransfer}
        <ArrowRightLeft class="mr-2 h-3 w-3" />
      {:else}
        <User class="mr-2 h-3 w-3" />
      {/if}
      {displayName}
    </div>
  {:else}
    <Popover.Root bind:open>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button
            {...props}
            variant="outline"
            class={cn(
              'h-8 w-full justify-start overflow-hidden text-xs text-ellipsis whitespace-nowrap',
              isTransfer && 'text-blue-600 border-blue-200',
              hasSuggestion && 'text-amber-600 border-amber-200',
              !isTransfer && !hasSuggestion && !selectedPayee && !selectedPayeeName && 'text-muted-foreground'
            )}>
            {#if hasSuggestion}
              <Sparkles class="mr-2 h-3 w-3 text-amber-500" />
            {:else if isTransfer}
              <ArrowRightLeft class="mr-2 h-3 w-3" />
            {:else}
              <User class="mr-2 h-3 w-3" />
            {/if}
            {displayName}
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content class="w-72 p-0" align="start">
        <Tabs.Root bind:value={activeTab} class="w-full">
          <Tabs.List class="grid w-full grid-cols-2">
            <Tabs.Trigger value="payee" class="text-xs">
              <User class="mr-1.5 h-3 w-3" />
              Payee
            </Tabs.Trigger>
            <Tabs.Trigger value="transfer" class="text-xs">
              <ArrowRightLeft class="mr-1.5 h-3 w-3" />
              Transfer
            </Tabs.Trigger>
          </Tabs.List>

          <!-- Payee Tab -->
          <Tabs.Content value="payee" class="p-0">
            <Command.Root shouldFilter={false}>
              <Command.Input placeholder="Search or create payee..." bind:value={searchValue} />
              <Command.List class="max-h-60">
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
                      {#each visibleTemporaryPayees as tempPayee (tempPayee)}
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
          </Tabs.Content>

          <!-- Transfer Tab -->
          <Tabs.Content value="transfer" class="p-0">
            {#if hasSuggestion}
              <div class="border-b bg-amber-50 px-3 py-2">
                <div class="flex items-center gap-2 text-xs">
                  <Sparkles class="h-3 w-3 text-amber-500" />
                  <span class="text-amber-700">
                    Suggested: <strong>{suggestedTransferAccountName}</strong>
                    <span class="text-amber-500">({transferMappingConfidence})</span>
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  class="mt-1 h-6 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                  onclick={() => handleSelectAccount(suggestedTransferAccountId!, suggestedTransferAccountName!)}>
                  Accept suggestion
                </Button>
              </div>
            {/if}
            <Command.Root shouldFilter={false}>
              <Command.Input placeholder="Search accounts..." bind:value={accountSearchValue} />
              <Command.List class="max-h-52">
                <Command.Group>
                  {#if isTransfer && !accountSearchValue.trim()}
                    <Command.Item value="clear-transfer" onSelect={() => handleClearTransfer()} class="text-destructive">
                      <X class="mr-2 h-4 w-4" />
                      Clear transfer
                    </Command.Item>
                    <Command.Separator />
                  {/if}
                  {#each visibleAccounts as account (account.id)}
                    {@const isSelected = transferAccountId === account.id}
                    <Command.Item
                      value={String(account.id)}
                      onSelect={() => handleSelectAccount(account.id, account.name)}>
                      <Check class={cn('mr-2 h-4 w-4', !isSelected && 'text-transparent')} />
                      <Wallet class="mr-2 h-4 w-4 text-muted-foreground" />
                      {account.name}
                    </Command.Item>
                  {/each}
                  {#if visibleAccounts.length === 0}
                    <Command.Empty>No accounts found</Command.Empty>
                  {/if}
                </Command.Group>
              </Command.List>
            </Command.Root>
            <!-- Remember mapping option -->
            <div class="border-t p-2">
              <div class="flex items-center gap-2">
                <Checkbox id="remember-{rowIndex}" bind:checked={rememberMapping} />
                <Label for="remember-{rowIndex}" class="text-xs text-muted-foreground cursor-pointer">
                  Remember for future imports
                </Label>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </Popover.Content>
    </Popover.Root>
  {/if}
</div>
