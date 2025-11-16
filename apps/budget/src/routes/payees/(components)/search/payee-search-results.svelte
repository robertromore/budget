<script lang="ts">
import { EntityCard, EntitySearchResults } from '$lib/components/shared/search';
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import type { Payee } from '$lib/schema';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import { cn, currencyFormatter } from '$lib/utils';
import { highlightMatches } from '$lib/utils/search';
import Building from '@lucide/svelte/icons/building';
import Calendar from '@lucide/svelte/icons/calendar';
import CircleCheck from '@lucide/svelte/icons/circle-check';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Globe from '@lucide/svelte/icons/globe';
import Mail from '@lucide/svelte/icons/mail';
import Phone from '@lucide/svelte/icons/phone';
import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
import User from '@lucide/svelte/icons/user';
import type { Table as TanStackTable } from '@tanstack/table-core';
import { columns } from '../../(data)/columns.svelte';
import PayeeDataTableContainer from '../payee-data-table-container.svelte';

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
  onViewAnalytics,
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
    icon: isActive ? CircleCheck : TriangleAlert,
    color: isActive ? 'text-green-600' : 'text-orange-600',
    bgColor: isActive ? 'bg-green-50 dark:bg-green-950' : 'bg-orange-50 dark:bg-orange-950',
    label: isActive ? 'Active' : 'Inactive',
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
  {onViewAnalytics}>
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
      cardClass={cn(!payee.isActive && 'opacity-75')}>
      {#snippet header(p)}
        <!-- Status Badge -->
        <div class="absolute top-3 right-3">
          <Badge
            variant="outline"
            class={cn('text-xs', statusDisplay.color, statusDisplay.bgColor)}>
            <statusDisplay.icon class="mr-1 h-3 w-3" />
            {statusDisplay.label}
          </Badge>
        </div>

        <!-- Name and Type -->
        <Card.Title class="flex items-start gap-2 pr-20">
          <TypeIcon class="text-muted-foreground mt-0.5 h-5 w-5 shrink-0" />
          <div class="min-w-0 flex-1">
            <a href="/payees/{p.slug}" class="block truncate font-medium hover:underline">
              {@html highlightMatches(p.name || 'Unnamed Payee', searchQuery)}
            </a>
            {#if p.payeeType}
              <div class="text-muted-foreground mt-0.5 text-xs">
                {formatPayeeType(p.payeeType)}
              </div>
            {/if}
          </div>
        </Card.Title>

        {#if p.notes}
          <Card.Description>
            <span class="line-clamp-2 text-sm">
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
            <div class="text-muted-foreground flex items-center gap-2 text-xs">
              <Mail class="h-3 w-3" />
              <span class="truncate">{p.email}</span>
            </div>
          {/if}

          {#if p.phone}
            <div class="text-muted-foreground flex items-center gap-2 text-xs">
              <Phone class="h-3 w-3" />
              <span>{p.phone}</span>
            </div>
          {/if}

          {#if p.website}
            <div class="text-muted-foreground flex items-center gap-2 text-xs">
              <Globe class="h-3 w-3" />
              <span class="truncate">{p.website}</span>
            </div>
          {/if}
        </div>

        <!-- Financial Information -->
        <div class="space-y-1.5">
          {#if p.avgAmount}
            <div class="flex items-center gap-2 text-xs">
              <CreditCard class="text-muted-foreground h-3 w-3" />
              <span class="font-medium">{currencyFormatter.format(p.avgAmount)}</span>
              <span class="text-muted-foreground">avg</span>
            </div>
          {/if}

          {#if p.lastTransactionDate}
            <div class="text-muted-foreground flex items-center gap-2 text-xs">
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
      bind:table />
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
