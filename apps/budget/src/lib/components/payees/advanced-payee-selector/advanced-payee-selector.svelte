<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Popover from '$lib/components/ui/popover';
import {cn} from '$lib/utils';
import type {Payee} from '$lib/schema/payees';
import type {AdvancedPayeeSelectorProps, PayeeGroup, QuickAccessSections} from './types';
import {
  groupPayees,
  getRecentPayees,
  getFrequentPayees,
  saveToRecentPayees,
  debounce,
} from './utils';
import SearchHeader from './search-header.svelte';
import QuickAccessSection from './quick-access-section.svelte';
import GroupHeader from './group-header.svelte';
import PayeeItem from './payee-item.svelte';
import Fuse from 'fuse.js';
import {rpc} from '$lib/query';
import HandCoins from '@lucide/svelte/icons/hand-coins';

let {
  value = $bindable(),
  onValueChange,
  transactionContext,
  displayMode = 'normal',
  groupStrategy = 'usage',
  placeholder = 'Select payee...',
  showQuickAccess = true,
  enableMLSuggestions = false,
  allowCreate = true,
  maxVisibleItems = 30,
  popoverWidth,
  buttonClass,
}: AdvancedPayeeSelectorProps = $props();

// State
let open = $state(false);
let searchQuery = $state('');
let expandedGroups = $state<Set<string>>(new Set());

// Load payees
const payeesQuery = $derived(rpc.payees.listPayees().options());
const allPayees = $derived(payeesQuery.data ?? []);

// Selected payee
const selectedPayee = $derived(allPayees.find((p) => p.id === value));

// Search with Fuse.js
const fuse = $derived(
  new Fuse(allPayees, {
    keys: ['name', 'notes', 'payeeType'],
    threshold: 0.3,
    includeScore: true,
  })
);

// Filter payees based on search
const filteredPayees = $derived.by(() => {
  if (!searchQuery.trim()) {
    return allPayees;
  }

  const results = fuse.search(searchQuery);
  return results.map((r) => r.item);
});

// Quick access sections
const quickAccessSections = $derived.by((): QuickAccessSections => {
  const recent = showQuickAccess ? getRecentPayees(allPayees, 5) : [];
  const frequent = showQuickAccess ? getFrequentPayees(allPayees, 5) : [];
  const suggested: Payee[] = []; // TODO: Implement ML suggestions

  return {recent, frequent, suggested};
});

// Group payees
const groupedPayees = $derived.by((): PayeeGroup[] => {
  // Don't group when searching
  if (searchQuery.trim()) {
    return [
      {
        label: 'Search Results',
        payees: filteredPayees,
        count: filteredPayees.length,
        isExpanded: true,
      },
    ];
  }

  const groups = groupPayees(filteredPayees, groupStrategy);

  // Initialize expanded state for new groups
  groups.forEach((group) => {
    if (!expandedGroups.has(group.label)) {
      expandedGroups.add(group.label);
    }
  });

  return groups;
});

// Toggle group expansion
function toggleGroup(label: string) {
  if (expandedGroups.has(label)) {
    expandedGroups.delete(label);
  } else {
    expandedGroups.add(label);
  }
}

// Check if group is expanded
function isGroupExpanded(label: string): boolean {
  return expandedGroups.has(label);
}

// Handle selection
function handleSelect(payeeId: number) {
  value = payeeId;
  onValueChange(payeeId);
  saveToRecentPayees(payeeId);
  open = false;
  searchQuery = '';
}

// Handle create new
function handleCreateNew() {
  // TODO: Implement create new payee dialog
  console.log('Create new payee with name:', searchQuery);
}

// Compute trigger text
const triggerText = $derived.by(() => {
  if (selectedPayee) {
    return selectedPayee.name;
  }
  return placeholder;
});

// Compute popover content width
const contentWidth = $derived.by(() => {
  if (popoverWidth) return popoverWidth;
  if (displayMode === 'compact') return '300px';
  if (displayMode === 'detailed') return '600px';
  return '450px'; // normal
});
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({props})}
      <Button
        {...props}
        variant="outline"
        class={cn(
          'justify-start overflow-hidden text-left font-normal text-ellipsis whitespace-nowrap',
          !selectedPayee && 'text-muted-foreground',
          buttonClass || 'w-full'
        )}>
        <HandCoins class="-mt-1 mr-2 inline-block h-4 w-4" />
        {triggerText}
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content class="overflow-hidden p-0" align="start" style="width: {contentWidth}">
    <Command.Root shouldFilter={false}>
      <SearchHeader bind:searchQuery {placeholder} {allowCreate} onCreateNew={handleCreateNew} />

      <Command.List class="max-h-[400px] overflow-auto">
        <Command.Empty>
          <div class="text-muted-foreground py-6 text-center text-sm">
            <p>No payees found.</p>
            {#if allowCreate && searchQuery.trim()}
              <Button variant="outline" size="sm" class="mt-2" onclick={handleCreateNew}>
                Create "{searchQuery}"
              </Button>
            {/if}
          </div>
        </Command.Empty>

        <Command.Group>
          <!-- Quick Access Section -->
          {#if showQuickAccess && !searchQuery.trim()}
            <QuickAccessSection
              sections={quickAccessSections}
              selectedPayeeId={value}
              {displayMode}
              onSelect={handleSelect} />
          {/if}

          <!-- Grouped Payees -->
          {#each groupedPayees as group (group.label)}
            {#if groupStrategy !== 'none' || searchQuery.trim()}
              <GroupHeader
                label={group.label}
                count={group.count}
                isExpanded={isGroupExpanded(group.label)}
                onToggle={() => toggleGroup(group.label)} />
            {/if}

            {#if isGroupExpanded(group.label)}
              <div class="py-1">
                {#each group.payees as payee (payee.id)}
                  <PayeeItem
                    {payee}
                    {displayMode}
                    isSelected={payee.id === value}
                    onSelect={() => handleSelect(payee.id)} />
                {/each}
              </div>
            {/if}
          {/each}
        </Command.Group>
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
