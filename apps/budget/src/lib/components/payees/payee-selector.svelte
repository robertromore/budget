<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Command from '$lib/components/ui/command';
import * as Dialog from '$lib/components/ui/dialog';
import * as Popover from '$lib/components/ui/popover';
import { Separator } from '$lib/components/ui/separator';

import ManagePayeeForm from '$lib/components/forms/manage-payee-form.svelte';
import type { Payee } from '$lib/schema/payees';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { trpc } from '$lib/trpc/client';
import { formatDateDisplay, parseISOString } from '$lib/utils/dates';
import { currencyFormatter } from '$lib/utils/formatters';
// Icons
import Brain from '@lucide/svelte/icons/brain';
import Building from '@lucide/svelte/icons/building';
import Calendar from '@lucide/svelte/icons/calendar';
import Check from '@lucide/svelte/icons/check';
import ChevronsUpDown from '@lucide/svelte/icons/chevrons-up-down';
import Clock from '@lucide/svelte/icons/clock';
import CreditCard from '@lucide/svelte/icons/credit-card';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import Globe from '@lucide/svelte/icons/globe';
import LoaderCircle from '@lucide/svelte/icons/loader-circle';
import Mail from '@lucide/svelte/icons/mail';
import Phone from '@lucide/svelte/icons/phone';
import Plus from '@lucide/svelte/icons/plus';
import Search from '@lucide/svelte/icons/search';
import Sparkles from '@lucide/svelte/icons/sparkles';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import User from '@lucide/svelte/icons/user';

let {
  value = null,
  onValueChange,
  placeholder = 'Select payee...',
  showDetails = true,
  showMLSuggestions = true,
  showRecentActivity = true,
  allowCreate = true,
  disabled = false,
  transactionContext,
}: {
  value?: number | null;
  onValueChange?: (payeeId: number | null) => void;
  placeholder?: string;
  showDetails?: boolean;
  showMLSuggestions?: boolean;
  showRecentActivity?: boolean;
  allowCreate?: boolean;
  disabled?: boolean;
  transactionContext?: {
    amount?: number;
    date?: string;
    description?: string;
  };
} = $props();

// Local state
let open = $state(false);
let searchValue = $state('');
let isSearching = $state(false);
let searchResults = $state<Payee[]>([]);
let mlSuggestions = $state<any[]>([]);
let recentPayees = $state<Payee[]>([]);
let payeeStats = $state<Record<number, any>>({});
let createDialogOpen = $state(false);
let selectedPayeeId = $state<number | null>(null);
let isLoadingDetails = $state(false);
let payeeDetails = $state<any>(null);

// States
const payeesState = PayeesState.get();
const allPayees = $derived(payeesState.payees);

// Convert SvelteMap to array for operations
const payeeArray = $derived(Array.from(allPayees.values()));

// Selected payee
const selectedPayee = $derived(value ? payeeArray.find((p) => p.id === value) : null);

// Search and filter payees
const filteredPayees = $derived(() => {
  if (!searchValue) return payeeArray.slice(0, 20); // Show first 20 when no search

  const query = searchValue.toLowerCase();
  return payeeArray
    .filter(
      (payee) =>
        payee.name?.toLowerCase().includes(query) ||
        payee.notes?.toLowerCase().includes(query) ||
        (payee.payeeType && payee.payeeType.toLowerCase().includes(query))
    )
    .slice(0, 50); // Limit results for performance
});

// Perform advanced search
async function performAdvancedSearch(query: string) {
  if (query.length < 2) return;

  isSearching = true;
  try {
    const results = await trpc().payeeRoutes.searchAdvanced.query({
      query,
      isActive: true,
      payeeType: undefined,
    });

    searchResults = results as Payee[];
  } catch (error) {
    console.error('Failed to perform advanced search:', error);
  } finally {
    isSearching = false;
  }
}

// Load ML suggestions based on transaction context
async function loadMLSuggestions() {
  if (!transactionContext?.amount || !showMLSuggestions) return;

  try {
    // Get intelligent payee suggestions based on transaction context
    const suggestions = await trpc().payeeRoutes.bulkUnifiedRecommendations.query({
      payeeIds: payeeArray.slice(0, 10).map((p) => p.id), // Top 10 payees
      options: {
        priorityFilter: 'high',
        confidenceThreshold: 0.6,
        maxResults: 5,
      },
    });

    mlSuggestions = suggestions;
  } catch (error) {
    console.error('Failed to load ML suggestions:', error);
  }
}

// Load recent payees based on transaction history
async function loadRecentPayees() {
  if (!showRecentActivity) return;

  try {
    // Get payees that need attention (recently used, high activity)
    const recent = await trpc().payeeRoutes.needingAttention.query();
    recentPayees = recent.slice(0, 5) as Payee[];
  } catch (error) {
    console.error('Failed to load recent payees:', error);
  }
}

// Load payee statistics for display
async function loadPayeeStats(payeeIds: number[]) {
  try {
    const stats = await Promise.all(
      payeeIds.map(async (id) => {
        try {
          const stat = await trpc().payeeRoutes.stats.query({id});
          return {id, stat};
        } catch {
          return {id, stat: null};
        }
      })
    );

    const statsMap: Record<number, any> = {};
    stats.forEach(({id, stat}) => {
      statsMap[id] = stat;
    });
    payeeStats = statsMap;
  } catch (error) {
    console.error('Failed to load payee stats:', error);
  }
}

// Load detailed payee information
async function loadPayeeDetails(payeeId: number) {
  isLoadingDetails = true;
  try {
    const [intelligence, suggestions, stats] = await Promise.all([
      trpc().payeeRoutes.intelligence.query({id: payeeId}),
      trpc().payeeRoutes.suggestions.query({id: payeeId}),
      trpc().payeeRoutes.stats.query({id: payeeId}),
    ]);

    payeeDetails = {intelligence, suggestions, stats};
  } catch (error) {
    console.error('Failed to load payee details:', error);
  } finally {
    isLoadingDetails = false;
  }
}

// Handle payee selection
function handlePayeeSelect(payeeId: number) {
  if (onValueChange) {
    onValueChange(payeeId);
  }
  open = false;
  selectedPayeeId = payeeId;

  // Load details for selected payee
  if (showDetails) {
    loadPayeeDetails(payeeId);
  }
}

// Handle create new payee
function handleCreatePayee() {
  createDialogOpen = true;
  open = false;
}

function handlePayeeCreated(newPayee: any) {
  payeesState.addPayee(newPayee);
  createDialogOpen = false;

  // Auto-select the new payee
  handlePayeeSelect(newPayee.id);
}

// Get payee icon based on type
function getPayeeTypeIcon(payeeType?: string | null) {
  switch (payeeType) {
    case 'merchant':
      return Building;
    case 'utility':
      return Building;
    case 'employer':
      return Building;
    case 'financial_institution':
      return CreditCard;
    case 'government':
      return Building;
    case 'individual':
      return User;
    default:
      return User;
  }
}

// Get payee type color
function getPayeeTypeColor(payeeType?: string | null) {
  switch (payeeType) {
    case 'merchant':
      return 'text-blue-500';
    case 'utility':
      return 'text-green-500';
    case 'employer':
      return 'text-purple-500';
    case 'financial_institution':
      return 'text-orange-500';
    case 'government':
      return 'text-red-500';
    case 'individual':
      return 'text-gray-500';
    default:
      return 'text-gray-500';
  }
}

// Handle search input with reactive effect
$effect(() => {
  if (searchValue.length >= 2) {
    performAdvancedSearch(searchValue);
  } else {
    searchResults = [];
  }
});

// Initialize component
$effect(() => {
  if (open) {
    loadMLSuggestions();
    loadRecentPayees();

    // Load stats for visible payees
    const visiblePayeeIds = filteredPayees().map((p) => p.id);
    if (visiblePayeeIds.length > 0) {
      loadPayeeStats(visiblePayeeIds);
    }
  }
});

// Load details when value changes
$effect(() => {
  if (value && showDetails) {
    loadPayeeDetails(value);
  }
});
</script>

<div class="relative">
  <Popover.Root bind:open>
    <Popover.Trigger>
      <Button
        variant="outline"
        role="combobox"
        aria-expanded={open}
        class="w-full justify-between"
        {disabled}>
        {#if selectedPayee}
          <div class="flex min-w-0 items-center gap-2">
            {#if selectedPayee.payeeType}
              {@const Icon = getPayeeTypeIcon(selectedPayee.payeeType)}
              <Icon class="h-4 w-4 {getPayeeTypeColor(selectedPayee.payeeType)} shrink-0" />
            {:else}
              <User class="h-4 w-4 shrink-0 text-gray-500" />
            {/if}
            <span class="truncate">{selectedPayee.name}</span>
            {#if selectedPayee.payeeType}
              <Badge variant="secondary" class="text-xs">{selectedPayee.payeeType}</Badge>
            {/if}
          </div>
        {:else}
          <span class="text-muted-foreground">{placeholder}</span>
        {/if}
        <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>
    </Popover.Trigger>

    <Popover.Content class="w-[500px] p-0" align="start">
      <Command.Root shouldFilter={false}>
        <div class="flex items-center border-b px-3">
          <Search class="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Command.Input
            placeholder="Search payees..."
            bind:value={searchValue}
            class="placeholder:text-muted-foreground flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50" />
          {#if isSearching}
            <LoaderCircle class="h-4 w-4 animate-spin" />
          {/if}
        </div>

        <Command.List class="max-h-[400px] overflow-auto">
          <Command.Empty>
            <div class="py-6 text-center text-sm">
              <User class="text-muted-foreground mx-auto mb-2 h-8 w-8" />
              <p>No payees found.</p>
              {#if allowCreate}
                <Button variant="outline" size="sm" class="mt-2" onclick={handleCreatePayee}>
                  <Plus class="mr-2 h-4 w-4" />
                  Create new payee
                </Button>
              {/if}
            </div>
          </Command.Empty>

          <!-- ML Suggestions Section -->
          {#if mlSuggestions.length > 0 && !searchValue}
            <Command.Group heading="🧠 AI Suggestions">
              {#each mlSuggestions as suggestion}
                {@const payee = payeeArray.find((p) => p.id === suggestion.payeeId)}
                {#if payee}
                  {@const Icon = getPayeeTypeIcon(payee.payeeType)}
                  <Command.Item
                    value={payee.id.toString()}
                    onSelect={() => handlePayeeSelect(payee.id)}
                    class="cursor-pointer">
                    <div class="flex w-full items-center gap-3">
                      <Icon class="h-4 w-4 {getPayeeTypeColor(payee.payeeType)}" />

                      <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2">
                          <span class="truncate font-medium">{payee.name}</span>
                          <Sparkles class="h-3 w-3 text-blue-500" />
                          {#if suggestion.confidence}
                            <Badge variant="secondary" class="text-xs">
                              {Math.round(suggestion.confidence * 100)}%
                            </Badge>
                          {/if}
                        </div>
                        {#if suggestion.reasoning}
                          <p class="text-muted-foreground truncate text-xs">
                            {suggestion.reasoning}
                          </p>
                        {/if}
                      </div>

                      {#if value === payee.id}
                        <Check class="h-4 w-4" />
                      {/if}
                    </div>
                  </Command.Item>
                {/if}
              {/each}
            </Command.Group>
            <Separator />
          {/if}

          <!-- Recent Activity Section -->
          {#if recentPayees.length > 0 && !searchValue}
            <Command.Group heading="⏰ Recent Activity">
              {#each recentPayees as payee}
                {@const Icon = getPayeeTypeIcon(payee.payeeType)}
                <Command.Item
                  value={payee.id.toString()}
                  onSelect={() => handlePayeeSelect(payee.id)}
                  class="cursor-pointer">
                  <div class="flex w-full items-center gap-3">
                    <Icon class="h-4 w-4 {getPayeeTypeColor(payee.payeeType)}" />

                    <div class="min-w-0 flex-1">
                      <div class="flex items-center gap-2">
                        <span class="truncate font-medium">{payee.name}</span>
                        <Clock class="h-3 w-3 text-orange-500" />
                      </div>
                      <div class="text-muted-foreground flex items-center gap-4 text-xs">
                        {#if payeeStats[payee.id]}
                          <span
                            >{currencyFormatter.format(payeeStats[payee.id].avgAmount)} avg</span>
                          <span>{payeeStats[payee.id].transactionCount} transactions</span>
                        {/if}
                        {#if payee.lastTransactionDate}
                          {@const parsedDate = parseISOString(payee.lastTransactionDate)}
                          {#if parsedDate}
                            <span>Last: {formatDateDisplay(parsedDate, 'short')}</span>
                          {/if}
                        {/if}
                      </div>
                    </div>

                    {#if value === payee.id}
                      <Check class="h-4 w-4" />
                    {/if}
                  </div>
                </Command.Item>
              {/each}
            </Command.Group>
            <Separator />
          {/if}

          <!-- All Payees Section -->
          <Command.Group heading={searchValue ? 'Search Results' : 'All Payees'}>
            {@const displayPayees = searchValue ? searchResults : filteredPayees()}
            {#each displayPayees as payee}
              {@const Icon = getPayeeTypeIcon(payee.payeeType)}
              <Command.Item
                value={payee.id.toString()}
                onSelect={() => handlePayeeSelect(payee.id)}
                class="cursor-pointer">
                <div class="flex w-full items-center gap-3">
                  <Icon class="h-4 w-4 {getPayeeTypeColor(payee.payeeType)}" />

                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="truncate font-medium">{payee.name}</span>
                      {#if payee.payeeType}
                        <Badge variant="outline" class="text-xs">
                          {payee.payeeType.replace('_', ' ')}
                        </Badge>
                      {/if}
                      {#if !payee.isActive}
                        <Badge variant="secondary" class="text-xs">Inactive</Badge>
                      {/if}
                    </div>

                    <!-- Payee details row -->
                    <div class="text-muted-foreground flex items-center gap-4 text-xs">
                      {#if payeeStats[payee.id]}
                        <span class="flex items-center gap-1">
                          <DollarSign class="h-3 w-3" />
                          {currencyFormatter.format(payeeStats[payee.id].avgAmount)}
                        </span>
                        <span class="flex items-center gap-1">
                          <TrendingUp class="h-3 w-3" />
                          {payeeStats[payee.id].transactionCount}
                        </span>
                      {/if}
                      {#if payee.paymentFrequency}
                        <span class="flex items-center gap-1">
                          <Calendar class="h-3 w-3" />
                          {payee.paymentFrequency}
                        </span>
                      {/if}
                      {#if payee.website}
                        <Globe class="h-3 w-3" />
                      {/if}
                      {#if payee.phone}
                        <Phone class="h-3 w-3" />
                      {/if}
                      {#if payee.email}
                        <Mail class="h-3 w-3" />
                      {/if}
                    </div>

                    {#if payee.notes}
                      <p class="text-muted-foreground mt-1 truncate text-xs">{payee.notes}</p>
                    {/if}
                  </div>

                  {#if value === payee.id}
                    <Check class="h-4 w-4" />
                  {/if}
                </div>
              </Command.Item>
            {/each}
          </Command.Group>

          <!-- Create New Option -->
          {#if allowCreate && searchValue && searchResults.length === 0}
            <Separator />
            <Command.Group>
              <Command.Item onSelect={handleCreatePayee} class="cursor-pointer">
                <div class="flex w-full items-center gap-2">
                  <Plus class="text-primary h-4 w-4" />
                  <span>Create "<span class="font-medium">{searchValue}</span>"</span>
                </div>
              </Command.Item>
            </Command.Group>
          {/if}
        </Command.List>
      </Command.Root>
    </Popover.Content>
  </Popover.Root>

  <!-- Selected Payee Details -->
  {#if selectedPayee && showDetails && payeeDetails}
    {@const Icon = getPayeeTypeIcon(selectedPayee.payeeType)}
    <div class="bg-muted/50 mt-3 rounded-lg border p-3">
      <div class="mb-3 flex items-start justify-between">
        <div class="flex items-center gap-2">
          <Icon class="h-5 w-5 {getPayeeTypeColor(selectedPayee.payeeType)}" />
          <div>
            <h4 class="font-medium">{selectedPayee.name}</h4>
            {#if selectedPayee.payeeType}
              <p class="text-muted-foreground text-sm">
                {selectedPayee.payeeType
                  .replace('_', ' ')
                  .split(' ')
                  .map((w: string) => w.charAt(0).toUpperCase() + w.slice(1))
                  .join(' ')}
              </p>
            {/if}
          </div>
        </div>

        {#if isLoadingDetails}
          <LoaderCircle class="h-4 w-4 animate-spin" />
        {/if}
      </div>

      <!-- Stats Row -->
      {#if payeeDetails.stats}
        <div class="mb-3 grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-sm font-medium">
              {currencyFormatter.format(payeeDetails.stats.totalSpent || 0)}
            </div>
            <div class="text-muted-foreground text-xs">Total Spent</div>
          </div>
          <div class="text-center">
            <div class="text-sm font-medium">{payeeDetails.stats.transactionCount || 0}</div>
            <div class="text-muted-foreground text-xs">Transactions</div>
          </div>
          <div class="text-center">
            <div class="text-sm font-medium">
              {currencyFormatter.format(payeeDetails.stats.avgAmount || 0)}
            </div>
            <div class="text-muted-foreground text-xs">Avg Amount</div>
          </div>
        </div>
      {/if}

      <!-- Contact Info -->
      <div class="mb-3 flex flex-wrap gap-2">
        {#if selectedPayee.website}
          <Badge variant="outline" class="text-xs">
            <Globe class="mr-1 h-3 w-3" />
            Website
          </Badge>
        {/if}
        {#if selectedPayee.phone}
          <Badge variant="outline" class="text-xs">
            <Phone class="mr-1 h-3 w-3" />
            Phone
          </Badge>
        {/if}
        {#if selectedPayee.email}
          <Badge variant="outline" class="text-xs">
            <Mail class="mr-1 h-3 w-3" />
            Email
          </Badge>
        {/if}
        {#if selectedPayee.taxRelevant}
          <Badge variant="secondary" class="text-xs">Tax Relevant</Badge>
        {/if}
        {#if selectedPayee.isSeasonal}
          <Badge variant="secondary" class="text-xs">Seasonal</Badge>
        {/if}
      </div>

      <!-- AI Insights -->
      {#if payeeDetails.intelligence}
        <div class="space-y-2">
          {#if payeeDetails.intelligence.categoryRecommendation}
            <div class="flex items-center gap-2 text-xs">
              <Brain class="h-3 w-3 text-blue-500" />
              <span class="text-muted-foreground">Suggested category:</span>
              <Badge variant="secondary"
                >{payeeDetails.intelligence.categoryRecommendation.name}</Badge>
              <span class="text-muted-foreground">
                ({Math.round(payeeDetails.intelligence.categoryRecommendation.confidence * 100)}%)
              </span>
            </div>
          {/if}

          {#if payeeDetails.suggestions && payeeDetails.suggestions.length > 0}
            <div class="flex items-start gap-2 text-xs">
              <Sparkles class="mt-0.5 h-3 w-3 text-orange-500" />
              <div class="flex-1">
                <span class="text-muted-foreground">Quick tip:</span>
                <span class="ml-1">{payeeDetails.suggestions[0].description}</span>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if selectedPayee.notes}
        <Separator class="my-2" />
        <p class="text-muted-foreground text-xs">{selectedPayee.notes}</p>
      {/if}
    </div>
  {/if}
</div>

<!-- Create Payee Dialog -->
<Dialog.Root bind:open={createDialogOpen}>
  <Dialog.Content class="max-h-[80vh] max-w-4xl overflow-auto">
    <Dialog.Header>
      <Dialog.Title>Create New Payee</Dialog.Title>
      <Dialog.Description>
        Add a new payee to your system with comprehensive details and AI-powered defaults.
      </Dialog.Description>
    </Dialog.Header>

    <ManagePayeeForm onSave={handlePayeeCreated} formId="create-payee-form" />
  </Dialog.Content>
</Dialog.Root>
