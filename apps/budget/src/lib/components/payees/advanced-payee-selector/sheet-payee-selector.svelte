<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import {Input} from '$lib/components/ui/input';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import {User, Search, ChevronDown, ChevronRight, Check, Clock, TrendingUp} from '@lucide/svelte/icons';
import Fuse from 'fuse.js';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {PayeeCategoriesState} from '$lib/states/entities/payee-categories.svelte';
import {cn} from '$lib/utils';
import type {Payee} from '$lib/schema/payees';
import type {
  TransactionContext,
  GroupStrategy,
  DisplayMode,
} from './types';
import {
  groupPayees,
  getRecentPayees,
  saveToRecentPayees,
  formatLastUsed,
} from './utils';

interface Props {
  value?: number | null;
  onValueChange?: (value: number | null) => void;
  transactionContext?: TransactionContext;
  groupStrategy?: GroupStrategy;
  displayMode?: DisplayMode;
  showQuickAccess?: boolean;
  allowCreate?: boolean;
  buttonClass?: string;
  placeholder?: string;
}

let {
  value = $bindable(null),
  onValueChange,
  transactionContext,
  groupStrategy = 'smart',
  displayMode = 'normal',
  showQuickAccess = true,
  allowCreate = false,
  buttonClass = '',
  placeholder = 'Select payee...',
}: Props = $props();

const payeesState = PayeesState.get();
const allPayees = $derived(payeesState ? Array.from(payeesState.payees.values()) : []);

const payeeCategoriesState = PayeeCategoriesState.get();
const payeeCategoryMap = $derived.by(() => {
  if (!payeeCategoriesState) return new Map<number, string>();
  const map = new Map<number, string>();
  for (const category of payeeCategoriesState.all) {
    map.set(category.id, category.name);
  }
  return map;
});

// Sheet state
let open = $state(false);
let searchValue = $state('');

// Expanded groups state
let expandedGroups = $state(new Set<string>(['Recent', 'Frequent', 'Suggested']));

// Search/filter
const fuse = $derived(
  new Fuse(allPayees, {
    keys: ['name'],
    threshold: 0.3,
    includeScore: true,
  })
);

const filteredPayees = $derived.by(() => {
  if (!searchValue.trim()) return allPayees;
  return fuse.search(searchValue).map((result) => result.item);
});

// Selected payee
const selectedPayee = $derived(allPayees.find((p) => p.id === value));

// Quick access payees
const recentPayees = $derived.by(() => {
  if (!showQuickAccess) return [];
  return getRecentPayees(allPayees, 6);
});

const frequentPayees = $derived.by(() => {
  if (!showQuickAccess) return [];
  // Show payees that have a recurring payment frequency set
  return allPayees
    .filter((p) => p.paymentFrequency && p.paymentFrequency !== 'irregular')
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    .slice(0, 6);
});

// Grouped payees
const groupedPayees = $derived(groupPayees(filteredPayees, groupStrategy, payeeCategoryMap));

// Helper to check if group is expanded
function isGroupExpanded(label: string): boolean {
  return expandedGroups.has(label);
}

// Toggle group expansion
function toggleGroup(label: string) {
  if (expandedGroups.has(label)) {
    expandedGroups.delete(label);
  } else {
    expandedGroups.add(label);
  }
  expandedGroups = new Set(expandedGroups);
}

// Select payee
function handleSelect(payeeId: number) {
  value = payeeId;
  onValueChange?.(payeeId);
  saveToRecentPayees(payeeId);
  open = false;
  searchValue = '';
}

// Clear selection
function handleClear() {
  value = null;
  onValueChange?.(null);
  open = false;
  searchValue = '';
}

// Get payee type label
function getTypeLabel(type?: string | null): string {
  if (!type) return 'Other';
  return type.charAt(0).toUpperCase() + type.slice(1);
}
</script>

<div class="w-full">
  <ResponsiveSheet
    bind:open
    triggerClass={cn(
      'flex items-center w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background',
      'hover:bg-accent hover:text-accent-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
      'justify-start text-left font-normal',
      !selectedPayee && 'text-muted-foreground',
      buttonClass
    )}>
    {#snippet trigger()}
      <User class="mr-2 h-4 w-4 shrink-0" />
      <span class="truncate">{selectedPayee?.name || placeholder}</span>
    {/snippet}

  {#snippet header()}
    <div class="space-y-4">
      <div>
        <h2 class="text-lg font-semibold">Select Payee</h2>
        <p class="text-sm text-muted-foreground">
          Choose a payee or search to find one
        </p>
      </div>

      <div class="relative">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search payees..."
          bind:value={searchValue}
          class="pl-9"
        />
      </div>
    </div>
  {/snippet}

  {#snippet content()}
    <div class="space-y-6">
      <!-- Selected Payee (if any) -->
      {#if selectedPayee}
        <div class="space-y-2">
          <div class="flex items-center justify-between text-sm font-medium">
            <span>Current Selection</span>
            <Button variant="ghost" size="sm" onclick={handleClear} class="h-7 text-xs">
              Clear
            </Button>
          </div>
          <div class="rounded-lg border bg-muted/50 p-3">
            <div class="flex items-center gap-3">
              <Check class="h-5 w-5 text-primary" />
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">{selectedPayee.name}</p>
                <p class="text-xs text-muted-foreground">
                  {getTypeLabel(selectedPayee.payeeType)}
                </p>
              </div>
            </div>
          </div>
        </div>
        <Separator />
      {/if}

      <!-- Quick Access: Recent Payees -->
      {#if showQuickAccess && recentPayees.length > 0 && !searchValue}
        <div class="space-y-3">
          <button
            type="button"
            onclick={() => toggleGroup('Recent')}
            class="flex items-center gap-2 text-sm font-semibold w-full hover:text-primary transition-colors">
            {#if isGroupExpanded('Recent')}
              <ChevronDown class="h-4 w-4" />
            {:else}
              <ChevronRight class="h-4 w-4" />
            {/if}
            <Clock class="h-4 w-4" />
            Recent
            <Badge variant="secondary" class="ml-auto text-xs">{recentPayees.length}</Badge>
          </button>

          {#if isGroupExpanded('Recent')}
            <div class="grid grid-cols-2 gap-2">
              {#each recentPayees as payee (payee.id)}
                <button
                  type="button"
                  onclick={() => handleSelect(payee.id)}
                  class={cn(
                    'rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-accent',
                    value === payee.id && 'border-primary bg-accent'
                  )}>
                  <p class="font-medium text-sm truncate">{payee.name}</p>
                  <p class="text-xs text-muted-foreground">{getTypeLabel(payee.payeeType)}</p>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Quick Access: Frequent Payees -->
      {#if showQuickAccess && frequentPayees.length > 0 && !searchValue}
        <div class="space-y-3">
          <button
            type="button"
            onclick={() => toggleGroup('Frequent')}
            class="flex items-center gap-2 text-sm font-semibold w-full hover:text-primary transition-colors">
            {#if isGroupExpanded('Frequent')}
              <ChevronDown class="h-4 w-4" />
            {:else}
              <ChevronRight class="h-4 w-4" />
            {/if}
            <TrendingUp class="h-4 w-4" />
            Frequently Used
            <Badge variant="secondary" class="ml-auto text-xs">{frequentPayees.length}</Badge>
          </button>

          {#if isGroupExpanded('Frequent')}
            <div class="grid grid-cols-2 gap-2">
              {#each frequentPayees as payee (payee.id)}
                <button
                  type="button"
                  onclick={() => handleSelect(payee.id)}
                  class={cn(
                    'rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-accent',
                    value === payee.id && 'border-primary bg-accent'
                  )}>
                  <p class="font-medium text-sm truncate">{payee.name}</p>
                  <p class="text-xs text-muted-foreground mt-1">{getTypeLabel(payee.payeeType)}</p>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/if}

      <!-- Separator between quick access and main list -->
      {#if showQuickAccess && (recentPayees.length > 0 || frequentPayees.length > 0) && !searchValue}
        <Separator />
      {/if}

      <!-- Main Grouped List -->
      <div class="space-y-4">
        {#if searchValue}
          <p class="text-sm font-semibold">
            Search Results
            <Badge variant="secondary" class="ml-2 text-xs">{filteredPayees.length}</Badge>
          </p>
        {/if}

        {#if groupedPayees.length === 0}
          <div class="text-center py-8">
            <p class="text-sm text-muted-foreground">No payees found</p>
          </div>
        {:else}
          {#each groupedPayees as group (group.label)}
            <div class="space-y-2">
              <!-- Group Header -->
              <button
                type="button"
                onclick={() => toggleGroup(group.label)}
                class="flex items-center gap-2 text-sm font-semibold w-full hover:text-primary transition-colors">
                {#if isGroupExpanded(group.label)}
                  <ChevronDown class="h-4 w-4" />
                {:else}
                  <ChevronRight class="h-4 w-4" />
                {/if}
                {group.label}
                <Badge variant="secondary" class="ml-auto text-xs">{group.count}</Badge>
              </button>

              <!-- Group Items -->
              {#if isGroupExpanded(group.label)}
                <div class="space-y-1">
                  {#each group.payees as payee (payee.id)}
                    <button
                      type="button"
                      onclick={() => handleSelect(payee.id)}
                      class={cn(
                        'w-full rounded-lg border p-3 text-left transition-all hover:border-primary hover:bg-accent',
                        value === payee.id && 'border-primary bg-accent'
                      )}>
                      <div class="flex items-center gap-3">
                        <Check
                          class={cn(
                            'h-4 w-4 shrink-0',
                            value === payee.id ? 'opacity-100 text-primary' : 'opacity-0'
                          )}
                        />
                        <div class="flex-1 min-w-0">
                          <p class="font-medium text-sm truncate">{payee.name}</p>
                          <div class="flex items-center gap-2 mt-0.5">
                            <p class="text-xs text-muted-foreground">
                              {getTypeLabel(payee.payeeType)}
                            </p>
                            {#if payee.lastTransactionDate}
                              <span class="text-xs text-muted-foreground">•</span>
                              <p class="text-xs text-muted-foreground">
                                {formatLastUsed(payee.lastTransactionDate)}
                              </p>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
          {/each}
        {/if}
      </div>
    </div>
  {/snippet}

  {#snippet footer()}
    {#if allowCreate}
      <Button variant="outline" class="w-full">
        Create New Payee
      </Button>
    {/if}
  {/snippet}
</ResponsiveSheet>
</div>
