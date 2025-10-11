<script lang="ts">
import {EntitySearchResults, EntityCard} from '$lib/components/shared/search';
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
import {cn, currencyFormatter} from '$lib/utils';
import {highlightMatches} from '$lib/utils/search';
import User from '@lucide/svelte/icons/user';
import Building from '@lucide/svelte/icons/building';
import Phone from '@lucide/svelte/icons/phone';
import Mail from '@lucide/svelte/icons/mail';
import Globe from '@lucide/svelte/icons/globe';
import Calendar from '@lucide/svelte/icons/calendar';
import CreditCard from '@lucide/svelte/icons/credit-card';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import Eye from '@lucide/svelte/icons/eye';
import type {Payee} from '$lib/schema';
import PayeeDataTableContainer from '../payee-data-table-container.svelte';
import {columns} from '../../(data)/columns.svelte';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import type {Table as TanStackTable} from '@tanstack/table-core';

export type ViewMode = 'list' | 'grid';

interface Props {
  payees: Payee[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onBulkDelete: (payees: Payee[]) => void;
  onViewAnalytics: (payee: Payee) => void;
}

let {
  payees,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  onViewAnalytics
}: Props = $props();

// Get payees state from context
const payeesState = $derived(PayeesState.get());

// Table binding for list view
let table = $state<TanStackTable<Payee>>();

// Get icon for payee type
const getPayeeTypeIcon = (type: string | null) => {
  switch (type) {
    case 'company':
    case 'merchant':
      return Building;
    case 'government':
    case 'bank':
    case 'investment':
      return Building;
    default:
      return User;
  }
};

// Format payee type for display
const formatPayeeType = (type: string | null) => {
  if (!type) return null;
  return type.charAt(0).toUpperCase() + type.slice(1);
};

// Get status color and icon
const getStatusDisplay = (isActive: boolean) => {
  return {
    icon: isActive ? CheckCircle : AlertTriangle,
    color: isActive ? 'text-green-600' : 'text-orange-600',
    bgColor: isActive ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950',
    label: isActive ? 'Active' : 'Inactive'
  };
};

// Format last transaction date
const formatLastTransaction = (date: string | null) => {
  if (!date) return 'No transactions';
  return new Date(date).toLocaleDateString();
};
</script>

<EntitySearchResults
  entities={payees}
  {isLoading}
  {searchQuery}
  {viewMode}
  emptyIcon={User}
  emptyTitle="No payees found"
  emptyDescription="Try adjusting your filters or search terms"
  {onView}
  {onEdit}
  {onDelete}
  {onBulkDelete}
  {onViewAnalytics}
>
  {#snippet gridCard(payee)}
    {@const TypeIcon = getPayeeTypeIcon(payee.payeeType)}
    {@const statusDisplay = getStatusDisplay(payee.isActive)}

    <EntityCard
      entity={payee}
      {onView}
      {onEdit}
      {onDelete}
      {onViewAnalytics}
      viewButtonLabel="View"
      cardClass={cn(!payee.isActive && "opacity-75")}
    >
      {#snippet header(p)}
        <!-- Status Badge -->
        <div class="absolute top-3 right-3">
          <Badge
            variant="outline"
            class={cn("text-xs", statusDisplay.color, statusDisplay.bgColor)}>
            <statusDisplay.icon class="mr-1 h-3 w-3" />
            {statusDisplay.label}
          </Badge>
        </div>

        <!-- Name and Type -->
        <Card.Title class="flex items-start gap-2 pr-20">
          <TypeIcon class="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div class="min-w-0 flex-1">
            <a
              href="/payees/{p.slug}"
              class="font-medium truncate hover:underline block"
            >
              {@html highlightMatches(p.name || 'Unnamed Payee', searchQuery)}
            </a>
            {#if p.payeeType}
              <div class="text-xs text-muted-foreground mt-0.5">
                {formatPayeeType(p.payeeType)}
              </div>
            {/if}
          </div>
        </Card.Title>

        {#if p.notes}
          <Card.Description>
            <span class="text-sm line-clamp-2">
              {@html highlightMatches(
                p.notes.length > 100 ? p.notes.substring(0, 100) + '...' : p.notes,
                searchQuery
              )}
            </span>
          </Card.Description>
        {/if}
      {/snippet}

      {#snippet content(p)}
        <!-- Contact Information -->
        <div class="space-y-1.5">
          {#if p.email}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Mail class="h-3 w-3" />
              <span class="truncate">{p.email}</span>
            </div>
          {/if}

          {#if p.phone}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Phone class="h-3 w-3" />
              <span>{p.phone}</span>
            </div>
          {/if}

          {#if p.website}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Globe class="h-3 w-3" />
              <span class="truncate">{p.website}</span>
            </div>
          {/if}
        </div>

        <!-- Financial Information -->
        <div class="space-y-1.5">
          {#if p.avgAmount}
            <div class="flex items-center gap-2 text-xs">
              <CreditCard class="h-3 w-3 text-muted-foreground" />
              <span class="font-medium">{currencyFormatter.format(p.avgAmount)}</span>
              <span class="text-muted-foreground">avg</span>
            </div>
          {/if}

          {#if p.lastTransactionDate}
            <div class="flex items-center gap-2 text-xs text-muted-foreground">
              <Calendar class="h-3 w-3" />
              <span>Last: {formatLastTransaction(p.lastTransactionDate)}</span>
            </div>
          {/if}
        </div>
      {/snippet}

      {#snippet badges(p)}
        <!-- Tags and Special Attributes -->
        <div class="flex flex-wrap gap-1">
          {#if p.taxRelevant}
            <Badge variant="outline" class="text-xs">Tax Relevant</Badge>
          {/if}

          {#if p.isSeasonal}
            <Badge variant="outline" class="text-xs">Seasonal</Badge>
          {/if}

          {#if p.defaultCategoryId}
            <Badge variant="outline" class="text-xs">Auto-Category</Badge>
          {/if}

          {#if p.alertThreshold}
            <Badge variant="outline" class="text-xs">Alert Enabled</Badge>
          {/if}
        </div>
      {/snippet}
    </EntityCard>
  {/snippet}

  {#snippet listView()}
    <!-- List View with Data Table -->
    <PayeeDataTableContainer
      {isLoading}
      {payees}
      {columns}
      {payeesState}
      {onView}
      {onEdit}
      {onDelete}
      {onBulkDelete}
      {onViewAnalytics}
      bind:table
    />
  {/snippet}
</EntitySearchResults>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }
</style>
