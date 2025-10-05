<script lang="ts">
import {onMount} from 'svelte';
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
import {Skeleton} from '$lib/components/ui/skeleton';
import {cn, currencyFormatter} from '$lib/utils';
import User from '@lucide/svelte/icons/user';
import Building from '@lucide/svelte/icons/building';
import MapPin from '@lucide/svelte/icons/map-pin';
import Phone from '@lucide/svelte/icons/phone';
import Mail from '@lucide/svelte/icons/mail';
import Globe from '@lucide/svelte/icons/globe';
import Calendar from '@lucide/svelte/icons/calendar';
import CreditCard from '@lucide/svelte/icons/credit-card';
import Brain from '@lucide/svelte/icons/brain';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
import CheckCircle from '@lucide/svelte/icons/check-circle';
import type {Payee} from '$lib/schema';

interface Props {
  payees: Payee[];
  isLoading: boolean;
  searchQuery: string;
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
}

let {
  payees,
  isLoading,
  searchQuery,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics
}: Props = $props();

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

// Highlight search matches in text
const highlightMatches = (text: string, query: string) => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">$1</mark>');
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

{#if isLoading}
  <!-- Loading State -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {#each Array(8) as _}
      <Card.Root>
        <Card.Header>
          <Skeleton class="h-6 w-3/4" />
          <Skeleton class="h-4 w-full" />
        </Card.Header>
        <Card.Content>
          <div class="space-y-2">
            <Skeleton class="h-4 w-1/2" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </Card.Content>
        <Card.Footer>
          <div class="flex gap-2">
            <Skeleton class="h-8 w-16" />
            <Skeleton class="h-8 w-16" />
            <Skeleton class="h-8 w-16" />
          </div>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
{:else if payees.length === 0}
  <!-- Empty State -->
  <div class="text-center py-12">
    <User class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
    <h3 class="text-lg font-medium text-muted-foreground mb-2">No payees found</h3>
    <p class="text-sm text-muted-foreground">
      {#if searchQuery}
        No payees match your search criteria for "{searchQuery}".
      {:else}
        Try adjusting your filters or search terms.
      {/if}
    </p>
  </div>
{:else}
  <!-- Results Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {#each payees as payee (payee.id)}
      {@const TypeIcon = getPayeeTypeIcon(payee.payeeType)}
      {@const statusDisplay = getStatusDisplay(payee.isActive)}

      <Card.Root class={cn(
        "relative transition-all duration-200 hover:shadow-md",
        !payee.isActive && "opacity-75"
      )}>
        <Card.Header class="pb-3">
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
                href="/payees/{payee.slug}"
                class="font-medium truncate hover:underline block"
              >
                {@html highlightMatches(payee.name || 'Unnamed Payee', searchQuery)}
              </a>
              {#if payee.payeeType}
                <div class="text-xs text-muted-foreground mt-0.5">
                  {formatPayeeType(payee.payeeType)}
                </div>
              {/if}
            </div>
          </Card.Title>

          {#if payee.notes}
            <Card.Description>
              <span class="text-sm line-clamp-2">
                {@html highlightMatches(
                  payee.notes.length > 100 ? payee.notes.substring(0, 100) + '...' : payee.notes,
                  searchQuery
                )}
              </span>
            </Card.Description>
          {/if}
        </Card.Header>

        <Card.Content class="space-y-3 pb-3">
          <!-- Contact Information -->
          <div class="space-y-1.5">
            {#if payee.email}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <Mail class="h-3 w-3" />
                <span class="truncate">{payee.email}</span>
              </div>
            {/if}

            {#if payee.phone}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <Phone class="h-3 w-3" />
                <span>{payee.phone}</span>
              </div>
            {/if}

            {#if payee.website}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <Globe class="h-3 w-3" />
                <span class="truncate">{payee.website}</span>
              </div>
            {/if}
          </div>

          <!-- Financial Information -->
          <div class="space-y-1.5">
            {#if payee.avgAmount}
              <div class="flex items-center gap-2 text-xs">
                <CreditCard class="h-3 w-3 text-muted-foreground" />
                <span class="font-medium">{currencyFormatter.format(payee.avgAmount)}</span>
                <span class="text-muted-foreground">avg</span>
              </div>
            {/if}

            {#if payee.lastTransactionDate}
              <div class="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar class="h-3 w-3" />
                <span>Last: {formatLastTransaction(payee.lastTransactionDate)}</span>
              </div>
            {/if}
          </div>

          <!-- Tags and Special Attributes -->
          <div class="flex flex-wrap gap-1">
            {#if payee.taxRelevant}
              <Badge variant="outline" class="text-xs">Tax Relevant</Badge>
            {/if}

            {#if payee.isSeasonal}
              <Badge variant="outline" class="text-xs">Seasonal</Badge>
            {/if}

            {#if payee.defaultCategoryId}
              <Badge variant="outline" class="text-xs">Auto-Category</Badge>
            {/if}

            {#if payee.alertThreshold}
              <Badge variant="outline" class="text-xs">Alert Enabled</Badge>
            {/if}
          </div>
        </Card.Content>

        <Card.Footer class="flex gap-1.5">
          <Button
            onclick={() => onView(payee)}
            variant="outline"
            size="sm"
            class="flex-1"
            aria-label="View payee {payee.name}">
            <User class="mr-1 h-3 w-3" />
            View
          </Button>

          <Button
            onclick={() => onViewAnalytics(payee)}
            variant="outline"
            size="sm"
            aria-label="View analytics for {payee.name}">
            <BarChart3 class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onEdit(payee)}
            variant="outline"
            size="sm"
            aria-label="Edit payee {payee.name}">
            <Pencil class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onDelete(payee)}
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            aria-label="Delete payee {payee.name}">
            <Trash2 class="h-3 w-3" />
          </Button>
        </Card.Footer>
      </Card.Root>
    {/each}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>