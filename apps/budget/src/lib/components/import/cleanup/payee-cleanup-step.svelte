<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import { Input } from '$lib/components/ui/input';
import * as InputGroup from '$lib/components/ui/input-group';
import { Progress } from '$lib/components/ui/progress';
import { ScrollArea } from '$lib/components/ui/scroll-area';
import * as Tabs from '$lib/components/ui/tabs';
import * as Popover from '$lib/components/ui/popover';
import type { CleanupState, PayeeGroup } from '$core/types/import';
import { AccountsState } from '$lib/states/entities/accounts.svelte';
import { cn } from '$lib/utils';
import { trpc } from '$lib/trpc/client';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Check from '@lucide/svelte/icons/check';
import ChevronDown from '@lucide/svelte/icons/chevron-down';
import ChevronUp from '@lucide/svelte/icons/chevron-up';
import Edit3 from '@lucide/svelte/icons/edit-3';
import Loader2 from '@lucide/svelte/icons/loader-2';
import MoreHorizontal from '@lucide/svelte/icons/more-horizontal';
import Search from '@lucide/svelte/icons/search';
import Sparkles from '@lucide/svelte/icons/sparkles';
import X from '@lucide/svelte/icons/x';
import { toast } from '$lib/utils/toast-interceptor';
import Fuse from 'fuse.js';

interface Props {
  rows: Array<{
    rowIndex: number;
    normalizedData: Record<string, any>;
  }>;
  onNext: (cleanupState: CleanupState) => void;
  onBack: () => void;
  onSkip: () => void;
  /** Current account being imported into (excluded from transfer options) */
  currentAccountId?: number;
}

let { rows, onNext, onBack, onSkip, currentAccountId }: Props = $props();

type FilterTab = 'pending' | 'accepted' | 'skipped' | 'all';

// State
let cleanupState = $state<CleanupState>({
  payeeGroups: [],
  categorySuggestions: [],
  isAnalyzing: true,
  analysisProgress: 0,
  analysisPhase: 'grouping_payees',
});

let expandedGroups = $state(new Set<string>());
let editingGroup = $state<string | null>(null);
let editingName = $state('');
let filterTab = $state<FilterTab>('pending');
let searchQuery = $state('');

// Account search value per group
let groupAccountSearch = $state<Record<string, string>>({});
// Track which group's popover is open (for transfer flow)
let groupPopoverOpen = $state<Record<string, boolean>>({});

// Get accounts for transfer selection
const accountsState = AccountsState.get();
const accountsArray = $derived(
  accountsState?.all
    .filter((a) => a.id !== currentAccountId && !a.closed)
    .map((a) => ({
      id: a.id,
      name: a.name,
      accountIcon: a.accountIcon,
      accountColor: a.accountColor,
    })) ?? []
);

// Fuse for account search
const accountsFused = $derived(
  new Fuse(accountsArray, { keys: ['name'], includeScore: true, threshold: 0.3 })
);

function getFilteredAccounts(groupId: string) {
  const searchValue = groupAccountSearch[groupId] || '';
  if (!searchValue) return accountsArray;
  return accountsFused.search(searchValue).map((r) => r.item);
}

function markGroupAsTransfer(groupId: string, account: { id: number; name: string }) {
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.groupId === groupId
      ? {
          ...g,
          userDecision: 'accept' as const,
          transferAccountId: account.id,
          transferAccountName: account.name,
        }
      : g
  );
  groupAccountSearch = { ...groupAccountSearch, [groupId]: '' };
}

function clearGroupTransfer(groupId: string) {
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.groupId === groupId
      ? { ...g, transferAccountId: undefined, transferAccountName: undefined }
      : g
  );
}

/**
 * Classify a group's current state into one of four buckets. Pending
 * items are the actionable ones; the other buckets hide behind tabs.
 */
function classifyGroup(g: PayeeGroup): 'pending' | 'accepted' | 'skipped' {
  if (g.userDecision === 'reject') return 'skipped';
  if (g.userDecision === 'pending') return 'pending';
  // 'accept' | 'custom' | has transfer → all considered accepted for filtering
  return 'accepted';
}

// Derived stats — drives the compact summary strip + the tab counts.
const stats = $derived.by(() => {
  const groups = cleanupState.payeeGroups;
  const accepted = groups.filter((g) => g.userDecision === 'accept' && !g.transferAccountId).length;
  const rejected = groups.filter((g) => g.userDecision === 'reject').length;
  const pending = groups.filter((g) => g.userDecision === 'pending').length;
  const withExisting = groups.filter((g) => g.existingMatch).length;
  const transfers = groups.filter((g) => g.transferAccountId).length;
  const custom = groups.filter((g) => g.userDecision === 'custom').length;

  const catSuggestions = cleanupState.categorySuggestions;
  const autoFilled = catSuggestions.filter((s) => s.selectedCategoryId && !s.userOverride).length;
  const needsReview = catSuggestions.filter((s) => !s.selectedCategoryId).length;

  return {
    totalGroups: groups.length,
    accepted: accepted + custom + transfers, // "accepted" bucket for tab
    rejected,
    pending,
    withExisting,
    transfers,
    autoFilled,
    needsReview,
  };
});

const highConfidencePending = $derived(
  cleanupState.payeeGroups.filter((g) => g.confidence >= 0.85 && g.userDecision === 'pending')
    .length
);

const filteredGroups = $derived.by(() => {
  let list = cleanupState.payeeGroups;

  // Tab filter — hides accepted + skipped by default so the eye
  // lands on the items that still need a decision.
  if (filterTab !== 'all') {
    list = list.filter((g) => classifyGroup(g) === filterTab);
  }

  // Search across canonical name, custom name, and all member
  // variations so a user looking for "Uber" finds it regardless of
  // which spelling the group settled on.
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    list = list.filter((g) => {
      const name = (g.customName || g.canonicalName || '').toLowerCase();
      if (name.includes(q)) return true;
      if (g.members.some((m) => (m.originalPayee || '').toLowerCase().includes(q))) return true;
      return false;
    });
  }
  return list;
});

// Run analysis on mount
$effect(() => {
  analyzeData();
});

async function analyzeData() {
  cleanupState.isAnalyzing = true;
  cleanupState.analysisProgress = 0;
  cleanupState.analysisPhase = 'grouping_payees';

  try {
    // Extract payee data from rows
    const payeeInputs = rows
      .filter((row) => row.normalizedData['payee'])
      .map((row) => ({
        rowIndex: row.rowIndex,
        payeeName: row.normalizedData['payee'] as string,
        originalPayee: (row.normalizedData['originalPayee'] ||
          row.normalizedData['payee']) as string,
        amount: row.normalizedData['amount'] as number,
        date: row.normalizedData['date'] as string,
        memo: row.normalizedData['description'] || row.normalizedData['notes'],
      }));

    if (payeeInputs.length === 0) {
      cleanupState.isAnalyzing = false;
      return;
    }

    cleanupState.analysisProgress = 20;

    const result = await trpc().importCleanupRoutes.analyzeImport.mutate({
      rows: payeeInputs,
    });

    cleanupState.analysisProgress = 80;
    cleanupState.analysisPhase = 'suggesting_categories';

    cleanupState.payeeGroups = result.payeeGroups;
    cleanupState.categorySuggestions = result.categorySuggestions;
    cleanupState.analysisProgress = 100;
  } catch (error) {
    console.error('Failed to analyze import data:', error);
    toast.error('Failed to analyze import data');
  } finally {
    cleanupState.isAnalyzing = false;
  }
}

function toggleGroup(groupId: string) {
  const newExpanded = new Set(expandedGroups);
  if (newExpanded.has(groupId)) {
    newExpanded.delete(groupId);
  } else {
    newExpanded.add(groupId);
  }
  expandedGroups = newExpanded;
}

function acceptGroup(groupId: string) {
  clearGroupTransfer(groupId);
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.groupId === groupId ? { ...g, userDecision: 'accept' as const } : g
  );
}

function rejectGroup(groupId: string) {
  clearGroupTransfer(groupId);
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.groupId === groupId ? { ...g, userDecision: 'reject' as const } : g
  );
}

function startEditGroup(group: PayeeGroup) {
  editingGroup = group.groupId;
  editingName = group.customName || group.canonicalName;
}

function saveEditGroup(groupId: string) {
  if (editingName.trim()) {
    cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
      g.groupId === groupId
        ? { ...g, userDecision: 'custom' as const, customName: editingName.trim() }
        : g
    );
  }
  editingGroup = null;
  editingName = '';
}

function cancelEditGroup() {
  editingGroup = null;
  editingName = '';
}

function acceptAllHighConfidence() {
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.confidence >= 0.85 && g.userDecision === 'pending'
      ? { ...g, userDecision: 'accept' as const }
      : g
  );
  toast.success('Accepted all high-confidence groups');
}

function resetAllDecisions() {
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) => ({
    ...g,
    userDecision: g.confidence >= 0.95 ? ('accept' as const) : ('pending' as const),
    customName: undefined,
  }));
  toast.info('Reset all decisions');
}

function resetGroup(groupId: string) {
  cleanupState.payeeGroups = cleanupState.payeeGroups.map((g) =>
    g.groupId === groupId
      ? {
          ...g,
          userDecision: g.confidence >= 0.95 ? ('accept' as const) : ('pending' as const),
          customName: undefined,
          transferAccountId: undefined,
          transferAccountName: undefined,
        }
      : g
  );
}

/**
 * Confidence pill classes — green ≥95, amber 80–94, red <80. Gives
 * one-glance scanability for "which ones look dubious".
 */
function confidenceClasses(confidence: number): string {
  if (confidence >= 0.95) {
    return 'border-success/30 bg-success/10 text-success-fg';
  }
  if (confidence >= 0.8) {
    return 'border-warning/40 bg-warning/10 text-warning-fg';
  }
  return 'border-destructive/40 bg-destructive/10 text-destructive';
}

function handleProceed() {
  onNext(cleanupState);
}

function openTransferPopover(groupId: string) {
  groupPopoverOpen = { ...groupPopoverOpen, [groupId]: true };
}

// ---- Tab label helpers ----
const TAB_LABELS: Record<FilterTab, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  skipped: 'Skipped',
  all: 'All',
};
</script>

<div class="space-y-6">
  <!-- Header -->
  <div>
    <div class="mb-2 flex items-center gap-3">
      <Sparkles class="text-primary h-8 w-8" />
      <h2 class="text-2xl font-bold">Cleanup & Review</h2>
    </div>
    <p class="text-muted-foreground">
      Review and merge similar payees, and check category suggestions before importing.
    </p>
  </div>

  {#if cleanupState.isAnalyzing}
    <!-- Analysis Progress -->
    <Card.Root>
      <Card.Content class="py-8">
        <div class="flex flex-col items-center justify-center space-y-4">
          <Loader2 class="text-primary h-8 w-8 animate-spin" />
          <div class="text-center">
            <p class="font-medium">Analyzing import data...</p>
            <p class="text-muted-foreground text-sm">
              {#if cleanupState.analysisPhase === 'grouping_payees'}
                Grouping similar payees
              {:else if cleanupState.analysisPhase === 'matching_existing'}
                Matching to existing payees
              {:else}
                Suggesting categories
              {/if}
            </p>
          </div>
          <Progress value={cleanupState.analysisProgress} class="w-64" />
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Compact stats strip + primary bulk action. Zero-valued stats
         collapse into quieter text; "Pending review" gets an amber
         callout when it's >0 because that's the actionable number. -->
    <div
      class="bg-card flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <span>
          <span class="font-semibold tabular-nums">{stats.totalGroups}</span>
          <span class="text-muted-foreground">payee {stats.totalGroups === 1 ? 'group' : 'groups'}</span>
        </span>
        <span class="text-muted-foreground" aria-hidden="true">·</span>
        <span class={stats.withExisting > 0 ? '' : 'text-muted-foreground'}>
          <span class="font-medium tabular-nums">{stats.withExisting}</span> matched
        </span>
        <span class="text-muted-foreground" aria-hidden="true">·</span>
        <span class={stats.autoFilled > 0 ? '' : 'text-muted-foreground'}>
          <span class="font-medium tabular-nums">{stats.autoFilled}</span> auto-categorized
        </span>
        <span class="text-muted-foreground" aria-hidden="true">·</span>
        {#if stats.pending > 0}
          <span
            class="border-warning/40 bg-warning/10 text-warning-fg inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium">
            <Edit3 class="h-3 w-3" />
            {stats.pending} need review
          </span>
        {:else}
          <span class="text-muted-foreground">
            <span class="font-medium tabular-nums">0</span> need review
          </span>
        {/if}
      </div>

      <div class="flex items-center gap-2">
        {#if highConfidencePending > 0}
          <Button size="sm" onclick={acceptAllHighConfidence}>
            <Check class="mr-1 h-4 w-4" />
            Accept {highConfidencePending} high-confidence
          </Button>
        {/if}
        {#if stats.accepted > 0 || stats.rejected > 0 || stats.pending < stats.totalGroups}
          <Button variant="ghost" size="sm" onclick={resetAllDecisions}>Reset all</Button>
        {/if}
      </div>
    </div>

    <!-- Payee Groups -->
    {#if cleanupState.payeeGroups.length > 0}
      <Card.Root>
        <Card.Header class="gap-3 pb-3">
          <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Card.Title class="text-base">Payee Groups</Card.Title>
              <Card.Description>
                Review similar payees and decide how to handle them.
              </Card.Description>
            </div>
            <div class="sm:w-64">
              <InputGroup.InputGroup>
                <InputGroup.InputGroupAddon align="inline-start">
                  <Search class="h-4 w-4" />
                </InputGroup.InputGroupAddon>
                <InputGroup.InputGroupInput
                  type="text"
                  placeholder="Search payees…"
                  value={searchQuery}
                  oninput={(e) => (searchQuery = (e.currentTarget as HTMLInputElement).value)} />
                {#if searchQuery}
                  <InputGroup.InputGroupAddon align="inline-end">
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-foreground"
                      aria-label="Clear search"
                      onclick={() => (searchQuery = '')}>
                      <X class="h-3.5 w-3.5" />
                    </button>
                  </InputGroup.InputGroupAddon>
                {/if}
              </InputGroup.InputGroup>
            </div>
          </div>
          <Tabs.Root value={filterTab} onValueChange={(v) => (filterTab = v as FilterTab)}>
            <Tabs.List>
              <Tabs.Trigger value="pending" class="gap-1.5">
                {TAB_LABELS.pending}
                {#if stats.pending > 0}
                  <Badge variant="secondary" class="h-5 min-w-5 px-1.5 tabular-nums">
                    {stats.pending}
                  </Badge>
                {/if}
              </Tabs.Trigger>
              <Tabs.Trigger value="accepted" class="gap-1.5">
                {TAB_LABELS.accepted}
                {#if stats.accepted > 0}
                  <Badge variant="secondary" class="h-5 min-w-5 px-1.5 tabular-nums">
                    {stats.accepted}
                  </Badge>
                {/if}
              </Tabs.Trigger>
              <Tabs.Trigger value="skipped" class="gap-1.5">
                {TAB_LABELS.skipped}
                {#if stats.rejected > 0}
                  <Badge variant="secondary" class="h-5 min-w-5 px-1.5 tabular-nums">
                    {stats.rejected}
                  </Badge>
                {/if}
              </Tabs.Trigger>
              <Tabs.Trigger value="all" class="gap-1.5">
                {TAB_LABELS.all}
                <Badge variant="secondary" class="h-5 min-w-5 px-1.5 tabular-nums">
                  {stats.totalGroups}
                </Badge>
              </Tabs.Trigger>
            </Tabs.List>
          </Tabs.Root>
        </Card.Header>
        <Card.Content class="overflow-hidden">
          {#if filteredGroups.length === 0}
            <p class="text-muted-foreground py-8 text-center text-sm">
              {#if searchQuery}
                No payees match "{searchQuery}".
              {:else if filterTab === 'pending'}
                All groups have been reviewed.
              {:else if filterTab === 'accepted'}
                No accepted groups yet.
              {:else if filterTab === 'skipped'}
                No skipped groups.
              {:else}
                No payee groups to review.
              {/if}
            </p>
          {:else}
            <ScrollArea class="h-100">
              <div class="space-y-2 pr-4">
                {#each filteredGroups as group (group.groupId)}
                  {@const isExpanded = expandedGroups.has(group.groupId)}
                  {@const isEditing = editingGroup === group.groupId}
                  {@const displayName =
                    group.userDecision === 'custom' && group.customName
                      ? group.customName
                      : group.transferAccountName || group.canonicalName}
                  {@const isTransfer = !!group.transferAccountId}
                  {@const bucket = classifyGroup(group)}
                  {@const filteredAccounts = getFilteredAccounts(group.groupId)}

                  <div
                    class={cn(
                      'rounded-lg border p-3 transition-colors',
                      isTransfer &&
                        'border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950',
                      !isTransfer && bucket === 'accepted' && 'border-success/30 bg-success-bg',
                      !isTransfer && bucket === 'skipped' && 'border-destructive/30 bg-danger-bg',
                    )}>
                    <div class="flex items-start gap-3">
                      <!-- Expand/Collapse Toggle -->
                      <button
                        type="button"
                        class="text-muted-foreground hover:text-foreground mt-0.5 shrink-0"
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                        onclick={() => toggleGroup(group.groupId)}>
                        {#if isExpanded}
                          <ChevronUp class="h-4 w-4" />
                        {:else}
                          <ChevronDown class="h-4 w-4" />
                        {/if}
                      </button>

                      <!-- Main Content -->
                      <div class="min-w-0 flex-1">
                        <!-- Header with name and badges -->
                        <div class="mb-2 flex flex-wrap items-center gap-2">
                          {#if isTransfer}
                            <ArrowRightLeft class="h-4 w-4 text-purple-600" />
                          {/if}
                          <span class="font-medium">{displayName}</span>
                          <Badge
                            variant="outline"
                            class={cn('text-xs', confidenceClasses(group.confidence))}>
                            {Math.round(group.confidence * 100)}%
                          </Badge>
                          {#if group.members.length > 1}
                            <span class="text-muted-foreground text-xs">
                              ({group.members.length} variations)
                            </span>
                          {/if}
                          {#if isTransfer}
                            <Badge variant="secondary" class="text-xs">Transfer</Badge>
                          {/if}
                        </div>

                        {#if group.existingMatch && !isTransfer}
                          <p class="text-muted-foreground mb-2 text-xs">
                            Matches existing: <span class="font-medium"
                              >{group.existingMatch.name}</span>
                            ({Math.round(group.existingMatch.confidence * 100)}% match)
                          </p>
                        {/if}

                        <!-- Action area -->
                        {#if isEditing}
                          <div class="flex items-center gap-2">
                            <Input
                              bind:value={editingName}
                              class="h-8"
                              placeholder="Enter custom name"
                              onkeydown={(e) => {
                                if (e.key === 'Enter') saveEditGroup(group.groupId);
                                if (e.key === 'Escape') cancelEditGroup();
                              }} />
                            <Button
                              variant="ghost"
                              size="sm"
                              onclick={() => saveEditGroup(group.groupId)}>
                              <Check class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onclick={cancelEditGroup}>
                              <X class="h-4 w-4" />
                            </Button>
                          </div>
                        {:else if bucket === 'pending'}
                          <!-- Pending: single primary Accept + overflow for
                               Edit/Skip/Transfer. 90% of clicks land on Accept,
                               so that's the one-shot path. -->
                          <div class="flex flex-wrap items-center gap-1">
                            <Button
                              variant="default"
                              size="sm"
                              class="h-7"
                              onclick={() => acceptGroup(group.groupId)}>
                              <Check class="mr-1 h-3 w-3" />
                              Accept
                            </Button>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                {#snippet child({ props })}
                                  <Button
                                    {...props}
                                    variant="outline"
                                    size="sm"
                                    class="h-7 px-2"
                                    aria-label="More actions">
                                    <MoreHorizontal class="h-4 w-4" />
                                  </Button>
                                {/snippet}
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content align="start">
                                <DropdownMenu.Item onclick={() => startEditGroup(group)}>
                                  <Edit3 class="mr-2 h-4 w-4" />
                                  Rename…
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onclick={() => openTransferPopover(group.groupId)}>
                                  <ArrowRightLeft class="mr-2 h-4 w-4" />
                                  Mark as transfer…
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item onclick={() => rejectGroup(group.groupId)}>
                                  <X class="mr-2 h-4 w-4" />
                                  Skip
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                          </div>
                        {:else if bucket === 'accepted' && !isTransfer}
                          <!-- Accepted or renamed: confirmation pill + small
                               overflow for edit/transfer/reset. -->
                          {@const label = group.userDecision === 'custom' ? 'Renamed' : 'Accepted'}
                          <div class="flex flex-wrap items-center gap-2">
                            <div
                              class={cn(
                                'flex items-center gap-1.5 rounded-md px-2 py-1 text-sm',
                                group.userDecision === 'custom'
                                  ? 'bg-info-bg text-info-fg'
                                  : 'bg-success-bg text-success-fg',
                              )}>
                              <Check class="h-3 w-3" />
                              <span>{label}</span>
                            </div>
                            <DropdownMenu.Root>
                              <DropdownMenu.Trigger>
                                {#snippet child({ props })}
                                  <Button
                                    {...props}
                                    variant="ghost"
                                    size="sm"
                                    class="h-7 px-2"
                                    aria-label="More actions">
                                    <MoreHorizontal class="h-4 w-4" />
                                  </Button>
                                {/snippet}
                              </DropdownMenu.Trigger>
                              <DropdownMenu.Content align="start">
                                <DropdownMenu.Item onclick={() => startEditGroup(group)}>
                                  <Edit3 class="mr-2 h-4 w-4" />
                                  Rename…
                                </DropdownMenu.Item>
                                <DropdownMenu.Item
                                  onclick={() => openTransferPopover(group.groupId)}>
                                  <ArrowRightLeft class="mr-2 h-4 w-4" />
                                  Mark as transfer…
                                </DropdownMenu.Item>
                                <DropdownMenu.Separator />
                                <DropdownMenu.Item onclick={() => resetGroup(group.groupId)}>
                                  Reset to pending
                                </DropdownMenu.Item>
                              </DropdownMenu.Content>
                            </DropdownMenu.Root>
                          </div>
                        {:else if isTransfer}
                          <!-- Transfer set — show the destination + a Clear
                               affordance. Transfer is less common; the full
                               menu isn't needed. -->
                          <div class="flex flex-wrap items-center gap-2">
                            <div
                              class="flex items-center gap-1.5 rounded-md bg-purple-100 px-2 py-1 text-sm text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                              <ArrowRightLeft class="h-3 w-3" />
                              <span>Transfer to {group.transferAccountName}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              class="h-7"
                              onclick={() => clearGroupTransfer(group.groupId)}>
                              Clear
                            </Button>
                          </div>
                        {:else if bucket === 'skipped'}
                          <div class="flex flex-wrap items-center gap-2">
                            <div
                              class="bg-danger-bg text-danger-fg flex items-center gap-1.5 rounded-md px-2 py-1 text-sm">
                              <X class="h-3 w-3" />
                              <span>Skipped</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              class="h-7"
                              onclick={() => resetGroup(group.groupId)}>
                              Undo
                            </Button>
                          </div>
                        {/if}

                        <!-- Transfer popover trigger — anchored near the
                             row so it opens in context. Hidden trigger
                             (width/height 0) used because the opening
                             action comes from the overflow menu. -->
                        <Popover.Root
                          open={groupPopoverOpen[group.groupId] ?? false}
                          onOpenChange={(open) => {
                            groupPopoverOpen = { ...groupPopoverOpen, [group.groupId]: open };
                          }}>
                          <Popover.Trigger>
                            {#snippet child({ props })}
                              <button
                                {...props}
                                type="button"
                                class="sr-only"
                                aria-hidden="true"
                                tabindex={-1}>
                                transfer
                              </button>
                            {/snippet}
                          </Popover.Trigger>
                          <Popover.Content class="w-64 p-2" align="start">
                            <div class="space-y-2">
                              <p class="text-muted-foreground px-1 text-xs">
                                Mark as a transfer to another account — this row won't create a
                                payee.
                              </p>
                              <Input
                                placeholder="Search accounts..."
                                class="h-8"
                                value={groupAccountSearch[group.groupId] || ''}
                                oninput={(e) => {
                                  groupAccountSearch = {
                                    ...groupAccountSearch,
                                    [group.groupId]: e.currentTarget.value,
                                  };
                                }} />
                              <div class="max-h-40 space-y-1 overflow-y-auto">
                                {#each filteredAccounts.slice(0, 6) as account (account.id)}
                                  <button
                                    type="button"
                                    class="hover:bg-muted flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm"
                                    onclick={() => {
                                      markGroupAsTransfer(group.groupId, account);
                                      groupPopoverOpen = {
                                        ...groupPopoverOpen,
                                        [group.groupId]: false,
                                      };
                                    }}>
                                    <ArrowRightLeft class="h-3 w-3 text-purple-600" />
                                    <span>{account.name}</span>
                                  </button>
                                {:else}
                                  <p class="text-muted-foreground py-2 text-center text-xs">
                                    No accounts found
                                  </p>
                                {/each}
                              </div>
                            </div>
                          </Popover.Content>
                        </Popover.Root>

                        <!-- Expanded Members -->
                        {#if isExpanded && group.members.length > 0}
                          <div class="mt-3 space-y-1 border-t pt-3">
                            <p class="text-muted-foreground mb-2 text-xs font-medium uppercase">
                              Original names:
                            </p>
                            {#each group.members as member}
                              <div
                                class="text-muted-foreground flex items-center gap-2 text-sm">
                                <span class="text-muted-foreground/50">•</span>
                                <span class="font-mono text-xs">{member.originalPayee}</span>
                              </div>
                            {/each}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            </ScrollArea>
          {/if}
        </Card.Content>
      </Card.Root>
    {:else}
      <Card.Root>
        <Card.Content class="py-8 text-center">
          <p class="text-muted-foreground">No payee groups to review.</p>
        </Card.Content>
      </Card.Root>
    {/if}

    <!-- Navigation -->
    <div class="flex items-center justify-between">
      <Button variant="outline" onclick={onBack}>Back</Button>
      <div class="flex items-center gap-2">
        <Button variant="ghost" onclick={onSkip}>Skip Cleanup</Button>
        <Button onclick={handleProceed}>Continue</Button>
      </div>
    </div>
  {/if}
</div>
