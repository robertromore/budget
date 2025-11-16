<script lang="ts">
import * as Dialog from '$lib/components/ui/dialog';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import * as Alert from '$lib/components/ui/alert';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import {ScrollArea} from '$lib/components/ui/scroll-area';
import {Input} from '$lib/components/ui/input';
import {Label} from '$lib/components/ui/label';
import {Checkbox} from '$lib/components/ui/checkbox';

import {PayeesState} from '$lib/states/entities/payees.svelte';
import {getDuplicates, mergeDuplicates} from '$lib/query/payees';
import type {Payee} from '$lib/schema/payees';

// Icons
import Search from '@lucide/svelte/icons/search';
import Users from '@lucide/svelte/icons/users';
import Merge from '@lucide/svelte/icons/merge';
import Eye from '@lucide/svelte/icons/eye';
import EyeOff from '@lucide/svelte/icons/eye-off';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import XCircle from '@lucide/svelte/icons/x-circle';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Settings from '@lucide/svelte/icons/settings';
import Building from '@lucide/svelte/icons/building';
import User from '@lucide/svelte/icons/user';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Phone from '@lucide/svelte/icons/phone';
import Mail from '@lucide/svelte/icons/mail';
import Globe from '@lucide/svelte/icons/globe';

export interface DuplicateGroup {
  primaryPayeeId: number;
  duplicatePayeeIds: number[];
  similarityScore: number;
  similarities: Array<{
    field: 'name' | 'phone' | 'email' | 'website' | 'address';
    primaryValue: string;
    duplicateValue: string;
    matchType: 'exact' | 'fuzzy' | 'normalized' | 'semantic';
    confidence: number;
  }>;
  recommendedAction: 'merge' | 'review' | 'ignore';
  riskLevel: 'low' | 'medium' | 'high';
}

let {
  open = $bindable(),
  onMergeComplete,
}: {
  open: boolean;
  onMergeComplete?: (mergedCount: number) => void;
} = $props();

const payeesState = PayeesState.get();

// Local state
let activeTab = $state('detection');
let similarityThreshold = $state(0.8);
let includeInactive = $state(false);
let groupingStrategy = $state<'name' | 'contact' | 'transaction_pattern' | 'comprehensive'>(
  'comprehensive'
);
let isDetecting = $state(false);
let duplicateGroups = $state<DuplicateGroup[]>([]);
let selectedGroups = $state<Set<number>>(new Set());
let showDetails = $state<Set<number>>(new Set());
let mergeInProgress = $state(false);
let mergeResults = $state<any[]>([]);

// Auto-detect settings
let autoMergeOnDetection = $state(false);
let onlyHighConfidence = $state(true);
let preserveContactInfo = $state(true);
let preserveTransactionHistory = $state(true);

// Query hooks - Get the reactive query results
const duplicatesQuery = $derived(
  getDuplicates(similarityThreshold, includeInactive, groupingStrategy)
);
const mergeDuplicatesMutation = mergeDuplicates();

// Get all payees
const allPayees = $derived(payeesState?.all || []);

// Filter groups based on settings
const filteredGroups = $derived.by(() => {
  let filtered = duplicateGroups;

  if (onlyHighConfidence) {
    filtered = filtered.filter((group) => group.similarityScore >= 0.8);
  }

  return filtered.sort((a, b) => b.similarityScore - a.similarityScore);
});

// Selection helpers
const allGroupsSelected = $derived(
  filteredGroups.length > 0 && filteredGroups.every((g) => selectedGroups.has(g.primaryPayeeId))
);

const someGroupsSelected = $derived(
  filteredGroups.some((g) => selectedGroups.has(g.primaryPayeeId)) && !allGroupsSelected
);

// Get payee by ID
function getPayee(id: number): Payee | undefined {
  return allPayees.find((p) => p.id === id);
}

// Get payee type icon
function getPayeeTypeIcon(payeeType?: string | null) {
  switch (payeeType) {
    case 'merchant':
    case 'utility':
    case 'employer':
    case 'government':
      return Building;
    case 'financial_institution':
      return CreditCard;
    case 'individual':
    default:
      return User;
  }
}

// Get similarity color
function getSimilarityColor(score: number): string {
  if (score >= 0.9) return 'text-green-600';
  if (score >= 0.8) return 'text-blue-600';
  if (score >= 0.7) return 'text-yellow-600';
  return 'text-red-600';
}

// Get risk level color
function getRiskLevelColor(level: string): string {
  switch (level) {
    case 'low':
      return 'text-green-600';
    case 'medium':
      return 'text-yellow-600';
    case 'high':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

// Get match type display
function getMatchTypeDisplay(type: string): string {
  switch (type) {
    case 'exact':
      return 'Exact';
    case 'fuzzy':
      return 'Fuzzy';
    case 'normalized':
      return 'Normalized';
    case 'semantic':
      return 'Semantic';
    default:
      return type;
  }
}

// Detection
async function runDetection() {
  isDetecting = true;
  duplicateGroups = [];

  try {
    const result = await duplicatesQuery.execute();
    duplicateGroups = result || [];

    if (autoMergeOnDetection && duplicateGroups.length > 0) {
      // Auto-select high confidence groups
      const autoSelected = duplicateGroups
        .filter((g) => g.similarityScore >= 0.9 && g.riskLevel === 'low')
        .map((g) => g.primaryPayeeId);

      selectedGroups = new Set(autoSelected);

      if (autoSelected.length > 0) {
        await performMerge();
      }
    }
  } catch (error) {
    console.error('Duplicate detection failed:', error);
  } finally {
    isDetecting = false;
  }
}

// Group selection
function toggleGroupSelection(primaryPayeeId: number) {
  const newSelected = new Set(selectedGroups);
  if (newSelected.has(primaryPayeeId)) {
    newSelected.delete(primaryPayeeId);
  } else {
    newSelected.add(primaryPayeeId);
  }
  selectedGroups = newSelected;
}

function selectAllGroups() {
  if (allGroupsSelected) {
    selectedGroups = new Set();
  } else {
    selectedGroups = new Set(filteredGroups.map((g) => g.primaryPayeeId));
  }
}

// Details toggle
function toggleDetails(primaryPayeeId: number) {
  const newDetails = new Set(showDetails);
  if (newDetails.has(primaryPayeeId)) {
    newDetails.delete(primaryPayeeId);
  } else {
    newDetails.add(primaryPayeeId);
  }
  showDetails = newDetails;
}

// Merge operations
async function performMerge() {
  if (selectedGroups.size === 0) return;

  mergeInProgress = true;
  mergeResults = [];
  activeTab = 'results';

  try {
    const selectedGroupsData = filteredGroups.filter((g) => selectedGroups.has(g.primaryPayeeId));

    for (const group of selectedGroupsData) {
      try {
        const result = await mergeDuplicatesMutation.mutateAsync({
          primaryPayeeId: group.primaryPayeeId,
          duplicatePayeeIds: group.duplicatePayeeIds,
          mergeStrategy: {
            preserveTransactionHistory,
            conflictResolution: 'best_quality',
            mergeContactInfo: preserveContactInfo,
            mergeIntelligenceData: true,
          },
          confirmMerge: true,
        });

        mergeResults.push({
          groupId: group.primaryPayeeId,
          success: true,
          result,
          group,
        });
      } catch (error) {
        mergeResults.push({
          groupId: group.primaryPayeeId,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          group,
        });
      }
    }

    // Remove successfully merged groups
    const successfulMerges = mergeResults.filter((r) => r.success);
    duplicateGroups = duplicateGroups.filter(
      (g) => !successfulMerges.some((m) => m.groupId === g.primaryPayeeId)
    );

    selectedGroups = new Set();

    if (onMergeComplete) {
      onMergeComplete(successfulMerges.length);
    }
  } catch (error) {
    console.error('Merge operation failed:', error);
  } finally {
    mergeInProgress = false;
  }
}

// Reset state when dialog opens
$effect(() => {
  if (open) {
    duplicateGroups = [];
    selectedGroups = new Set();
    showDetails = new Set();
    mergeResults = [];
    activeTab = 'detection';
  }
});
</script>

<Dialog.Root bind:open>
  <Dialog.Content class="max-h-[90vh] max-w-6xl overflow-hidden">
    <Dialog.Header>
      <Dialog.Title class="flex items-center gap-2">
        <Merge class="h-5 w-5" />
        Duplicate Payee Detection & Merging
      </Dialog.Title>
      <Dialog.Description>
        Find and merge duplicate payees to clean up your data and improve organization.
      </Dialog.Description>
    </Dialog.Header>

    <Tabs.Root bind:value={activeTab} class="h-full">
      <Tabs.List class="grid w-full grid-cols-3">
        <Tabs.Trigger value="detection">Detection</Tabs.Trigger>
        <Tabs.Trigger value="review">Review & Merge</Tabs.Trigger>
        <Tabs.Trigger value="results">Results</Tabs.Trigger>
      </Tabs.List>

      <!-- Detection Tab -->
      <Tabs.Content value="detection" class="space-y-4">
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Settings class="h-5 w-5" />
              Detection Settings
            </Card.Title>
          </Card.Header>
          <Card.Content class="space-y-4">
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <Label for="similarity-threshold">Similarity Threshold</Label>
                <div class="flex items-center gap-2">
                  <Input
                    id="similarity-threshold"
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.1"
                    bind:value={similarityThreshold}
                    class="w-20" />
                  <span class="text-muted-foreground text-sm">
                    {Math.round(similarityThreshold * 100)}%
                  </span>
                </div>
              </div>

              <div class="space-y-2">
                <Label for="grouping-strategy">Grouping Strategy</Label>
                <select bind:value={groupingStrategy} class="w-full rounded-md border px-3 py-2">
                  <option value="name">Name Only</option>
                  <option value="contact">Contact Info</option>
                  <option value="transaction_pattern">Transaction Patterns</option>
                  <option value="comprehensive">Comprehensive</option>
                </select>
              </div>
            </div>

            <div class="flex flex-wrap gap-4">
              <div class="flex items-center space-x-2">
                <Checkbox bind:checked={includeInactive} id="include-inactive" />
                <Label for="include-inactive">Include inactive payees</Label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox bind:checked={autoMergeOnDetection} id="auto-merge" />
                <Label for="auto-merge">Auto-merge high confidence matches</Label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox bind:checked={onlyHighConfidence} id="high-confidence" />
                <Label for="high-confidence">Show only high confidence (80%+)</Label>
              </div>
            </div>

            <Separator />

            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div class="flex items-center space-x-2">
                <Checkbox bind:checked={preserveContactInfo} id="preserve-contact" />
                <Label for="preserve-contact">Preserve contact information when merging</Label>
              </div>

              <div class="flex items-center space-x-2">
                <Checkbox bind:checked={preserveTransactionHistory} id="preserve-history" />
                <Label for="preserve-history">Preserve transaction history</Label>
              </div>
            </div>
          </Card.Content>
        </Card.Root>

        <div class="flex justify-center">
          <Button onclick={runDetection} disabled={isDetecting} size="lg" class="w-full md:w-auto">
            {#if isDetecting}
              <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
              Detecting Duplicates...
            {:else}
              <Search class="mr-2 h-4 w-4" />
              Run Duplicate Detection
            {/if}
          </Button>
        </div>

        {#if duplicateGroups.length > 0}
          <Alert.Root>
            <CircleCheck class="h-4 w-4" />
            <Alert.Title>Detection Complete</Alert.Title>
            <Alert.Description>
              Found {duplicateGroups.length} potential duplicate group{duplicateGroups.length > 1
                ? 's'
                : ''}. Switch to the Review tab to examine and merge them.
            </Alert.Description>
          </Alert.Root>
        {:else if !isDetecting && duplicateGroups.length === 0}
          <Alert.Root>
            <CircleCheck class="h-4 w-4 text-green-600" />
            <Alert.Title>No Duplicates Found</Alert.Title>
            <Alert.Description>
              No duplicate payees were found with the current settings. Your payee data appears to
              be clean!
            </Alert.Description>
          </Alert.Root>
        {/if}
      </Tabs.Content>

      <!-- Review & Merge Tab -->
      <Tabs.Content value="review" class="space-y-4">
        {#if filteredGroups.length > 0}
          <!-- Summary and Controls -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <Checkbox
                checked={allGroupsSelected}
                indeterminate={someGroupsSelected}
                onCheckedChange={selectAllGroups} />
              <span class="text-sm">
                {selectedGroups.size} of {filteredGroups.length} groups selected
              </span>
            </div>

            <Button
              onclick={performMerge}
              disabled={selectedGroups.size === 0 || mergeInProgress}
              variant="default">
              {#if mergeInProgress}
                <LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
                Merging...
              {:else}
                <Merge class="mr-2 h-4 w-4" />
                Merge Selected ({selectedGroups.size})
              {/if}
            </Button>
          </div>

          <!-- Duplicate Groups -->
          <ScrollArea class="h-[500px]">
            <div class="space-y-4">
              {#each filteredGroups as group (group.primaryPayeeId)}
                {@const primaryPayee = getPayee(group.primaryPayeeId)}
                {@const duplicatePayees = group.duplicatePayeeIds
                  .map((id) => getPayee(id))
                  .filter((p): p is Payee => p !== undefined)}
                {@const isSelected = selectedGroups.has(group.primaryPayeeId)}
                {@const showGroupDetails = showDetails.has(group.primaryPayeeId)}

                <Card.Root class="border-2 {isSelected ? 'border-blue-300 bg-blue-50' : ''}">
                  <Card.Header>
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleGroupSelection(group.primaryPayeeId)} />
                        <div>
                          <Card.Title class="text-lg">
                            Duplicate Group - {Math.round(group.similarityScore * 100)}% Match
                          </Card.Title>
                          <Card.Description class="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              class={getSimilarityColor(group.similarityScore)}>
                              {group.recommendedAction}
                            </Badge>
                            <Badge variant="outline" class={getRiskLevelColor(group.riskLevel)}>
                              {group.riskLevel} risk
                            </Badge>
                            <span>{duplicatePayees.length + 1} payees</span>
                          </Card.Description>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onclick={() => toggleDetails(group.primaryPayeeId)}>
                        {#if showGroupDetails}
                          <EyeOff class="mr-2 h-4 w-4" />
                          Hide Details
                        {:else}
                          <Eye class="mr-2 h-4 w-4" />
                          Show Details
                        {/if}
                      </Button>
                    </div>
                  </Card.Header>

                  <Card.Content>
                    <!-- Primary and Duplicate Payees -->
                    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <!-- Primary Payee -->
                      {#if primaryPayee}
                        {@const Icon = getPayeeTypeIcon(primaryPayee.payeeType)}
                        <div class="rounded-lg border-2 border-green-300 bg-green-50 p-3">
                          <div class="mb-2 flex items-center gap-2">
                            <Badge variant="default" class="text-xs">Primary</Badge>
                            <Icon class="h-4 w-4" />
                            <span class="font-medium">{primaryPayee.name}</span>
                          </div>
                          <div class="text-muted-foreground space-y-1 text-xs">
                            {#if primaryPayee.email}
                              <div class="flex items-center gap-1">
                                <Mail class="h-3 w-3" />
                                {primaryPayee.email}
                              </div>
                            {/if}
                            {#if primaryPayee.phone}
                              <div class="flex items-center gap-1">
                                <Phone class="h-3 w-3" />
                                {primaryPayee.phone}
                              </div>
                            {/if}
                            {#if primaryPayee.website}
                              <div class="flex items-center gap-1">
                                <Globe class="h-3 w-3" />
                                {primaryPayee.website}
                              </div>
                            {/if}
                          </div>
                        </div>
                      {/if}

                      <!-- Duplicate Payees -->
                      <div class="space-y-2">
                        {#each duplicatePayees as duplicate}
                          {@const Icon = getPayeeTypeIcon(duplicate.payeeType)}
                          <div class="rounded-lg border-2 border-orange-300 bg-orange-50 p-3">
                            <div class="mb-2 flex items-center gap-2">
                              <Badge variant="secondary" class="text-xs">Duplicate</Badge>
                              <Icon class="h-4 w-4" />
                              <span class="font-medium">{duplicate.name}</span>
                            </div>
                            <div class="text-muted-foreground space-y-1 text-xs">
                              {#if duplicate.email}
                                <div class="flex items-center gap-1">
                                  <Mail class="h-3 w-3" />
                                  {duplicate.email}
                                </div>
                              {/if}
                              {#if duplicate.phone}
                                <div class="flex items-center gap-1">
                                  <Phone class="h-3 w-3" />
                                  {duplicate.phone}
                                </div>
                              {/if}
                              {#if duplicate.website}
                                <div class="flex items-center gap-1">
                                  <Globe class="h-3 w-3" />
                                  {duplicate.website}
                                </div>
                              {/if}
                            </div>
                          </div>
                        {/each}
                      </div>
                    </div>

                    <!-- Similarity Details -->
                    {#if showGroupDetails && group.similarities.length > 0}
                      <Separator class="my-4" />
                      <div class="space-y-2">
                        <h4 class="text-sm font-medium">Similarity Analysis</h4>
                        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {#each group.similarities as similarity}
                            <div class="rounded border p-2 text-xs">
                              <div class="flex items-center justify-between">
                                <span class="font-medium capitalize">{similarity.field}</span>
                                <Badge variant="outline" class="text-xs">
                                  {getMatchTypeDisplay(similarity.matchType)}
                                </Badge>
                              </div>
                              <div class="text-muted-foreground mt-1">
                                <div>Primary: {similarity.primaryValue}</div>
                                <div>Duplicate: {similarity.duplicateValue}</div>
                                <div class="text-xs">
                                  Confidence: {Math.round(similarity.confidence * 100)}%
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      </div>
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          </ScrollArea>
        {:else}
          <div class="py-8 text-center">
            <Users class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p class="text-muted-foreground">
              No duplicate groups found. Run detection first or adjust your settings.
            </p>
          </div>
        {/if}
      </Tabs.Content>

      <!-- Results Tab -->
      <Tabs.Content value="results" class="space-y-4">
        {#if mergeResults.length > 0}
          {@const successCount = mergeResults.filter((r) => r.success).length}
          {@const failCount = mergeResults.filter((r) => !r.success).length}

          <!-- Summary -->
          <Card.Root>
            <Card.Header>
              <Card.Title>Merge Results Summary</Card.Title>
            </Card.Header>
            <Card.Content>
              <div class="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div class="text-2xl font-bold text-green-600">{successCount}</div>
                  <div class="text-muted-foreground text-sm">Successful</div>
                </div>
                <div>
                  <div class="text-2xl font-bold text-red-600">{failCount}</div>
                  <div class="text-muted-foreground text-sm">Failed</div>
                </div>
                <div>
                  <div class="text-2xl font-bold">{mergeResults.length}</div>
                  <div class="text-muted-foreground text-sm">Total</div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>

          <!-- Detailed Results -->
          <ScrollArea class="h-[400px]">
            <div class="space-y-2">
              {#each mergeResults as result}
                {@const primaryPayee = getPayee(result.group.primaryPayeeId)}
                <Card.Root
                  class="border-l-4 {result.success ? 'border-l-green-500' : 'border-l-red-500'}">
                  <Card.Content class="p-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        {#if result.success}
                          <CircleCheck class="h-4 w-4 text-green-500" />
                        {:else}
                          <XCircle class="h-4 w-4 text-red-500" />
                        {/if}
                        <span class="font-medium">{primaryPayee?.name || 'Unknown'}</span>
                        <ArrowRight class="text-muted-foreground h-4 w-4" />
                        <span class="text-muted-foreground text-sm">
                          {result.group.duplicatePayeeIds.length} duplicate{result.group
                            .duplicatePayeeIds.length > 1
                            ? 's'
                            : ''} merged
                        </span>
                      </div>
                      <Badge variant={result.success ? 'default' : 'destructive'}>
                        {result.success ? 'Success' : 'Failed'}
                      </Badge>
                    </div>
                    {#if !result.success && result.error}
                      <div class="mt-2 text-sm text-red-600">
                        Error: {result.error}
                      </div>
                    {/if}
                  </Card.Content>
                </Card.Root>
              {/each}
            </div>
          </ScrollArea>
        {:else if mergeInProgress}
          <div class="py-8 text-center">
            <LoaderCircle class="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p class="text-muted-foreground">Merging duplicates in progress...</p>
          </div>
        {:else}
          <div class="py-8 text-center">
            <Merge class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p class="text-muted-foreground">No merge operations have been performed yet.</p>
          </div>
        {/if}
      </Tabs.Content>
    </Tabs.Root>

    <Dialog.Footer>
      <Button variant="outline" onclick={() => (open = false)}>Close</Button>
    </Dialog.Footer>
  </Dialog.Content>
</Dialog.Root>
