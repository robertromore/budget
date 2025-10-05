<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
import {Skeleton} from '$lib/components/ui/skeleton';
import {cn, currencyFormatter} from '$lib/utils';
import Tag from '@lucide/svelte/icons/tag';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import Receipt from '@lucide/svelte/icons/receipt';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Calendar from '@lucide/svelte/icons/calendar';
import type {Category} from '$lib/schema';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';

interface Props {
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
}

let {
  categories,
  isLoading,
  searchQuery,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics
}: Props = $props();

// Highlight search matches in text
const highlightMatches = (text: string, query: string) => {
  if (!query || !text) return text;

  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800 rounded px-1">$1</mark>');
};

// Get category type icon and label
const getCategoryTypeInfo = (type: string | null) => {
  switch (type) {
    case 'income':
      return { icon: TrendingUp, label: 'Income', variant: 'default' as const, color: 'text-green-600' };
    case 'expense':
      return { icon: TrendingDown, label: 'Expense', variant: 'secondary' as const, color: 'text-red-600' };
    case 'transfer':
      return { icon: ArrowLeftRight, label: 'Transfer', variant: 'outline' as const, color: 'text-blue-600' };
    case 'savings':
      return { icon: PiggyBank, label: 'Savings', variant: 'default' as const, color: 'text-purple-600' };
    default:
      return { icon: Tag, label: 'Expense', variant: 'secondary' as const, color: 'text-muted-foreground' };
  }
};

// Get spending priority colors
const getPriorityColor = (priority: string | null) => {
  switch (priority) {
    case 'essential':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
    case 'important':
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200';
    case 'discretionary':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200';
    case 'luxury':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200';
    default:
      return '';
  }
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
{:else if categories.length === 0}
  <!-- Empty State -->
  <div class="text-center py-12">
    <Tag class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
    <h3 class="text-lg font-medium text-muted-foreground mb-2">No categories found</h3>
    <p class="text-sm text-muted-foreground">
      {#if searchQuery}
        No categories match your search criteria for "{searchQuery}".
      {:else}
        Try adjusting your filters or search terms.
      {/if}
    </p>
  </div>
{:else}
  <!-- Results Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    {#each categories as category (category.id)}
      {@const typeInfo = getCategoryTypeInfo(category.categoryType)}
      {@const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
      {@const IconComponent = iconData?.icon || Tag}

      <Card.Root
        class="relative transition-all duration-200 hover:shadow-md"
        style={category.categoryColor ? `border-left: 4px solid ${category.categoryColor};` : ''}
      >
        <Card.Header class="pb-3">
          <!-- Name and Icon -->
          <Card.Title class="flex items-start gap-2">
            <div class="relative flex-shrink-0">
              <IconComponent
                class="h-5 w-5 mt-0.5"
                style={category.categoryColor ? `color: ${category.categoryColor};` : ''}
              />
              {#if category.categoryColor && !category.categoryIcon}
                <span
                  class="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background"
                  style={`background-color: ${category.categoryColor};`}
                ></span>
              {/if}
            </div>
            <div class="min-w-0 flex-1">
              <a
                href="/categories/{category.slug}"
                class="font-medium truncate hover:underline block"
              >
                {@html highlightMatches(category.name || 'Unnamed Category', searchQuery)}
              </a>
              <div class="flex items-center gap-1.5 mt-1 flex-wrap">
                {#if category.parentId}
                  <div class="flex items-center gap-1 text-xs text-muted-foreground">
                    <FolderTree class="h-3 w-3" />
                    <span>Subcategory</span>
                  </div>
                {/if}
                {#if !category.isActive}
                  <Badge variant="outline" class="text-xs py-0 h-5">Inactive</Badge>
                {/if}
              </div>
            </div>
          </Card.Title>

          {#if category.notes}
            <Card.Description>
              <span class="text-sm line-clamp-2">
                {@html highlightMatches(
                  category.notes.length > 100 ? category.notes.substring(0, 100) + '...' : category.notes,
                  searchQuery
                )}
              </span>
            </Card.Description>
          {/if}
        </Card.Header>

        <Card.Content class="space-y-3 pb-3">
          <!-- Category Type Badge -->
          <div class="flex items-center gap-1.5 flex-wrap">
            <Badge variant={typeInfo.variant} class="text-xs">
              <typeInfo.icon class="mr-1 h-3 w-3" />
              {typeInfo.label}
            </Badge>

            {#if category.isTaxDeductible}
              <Badge variant="secondary" class="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200">
                <Receipt class="mr-1 h-3 w-3" />
                Tax Deductible
              </Badge>
            {/if}

            {#if category.spendingPriority}
              <Badge variant="outline" class="text-xs {getPriorityColor(category.spendingPriority)}">
                {category.spendingPriority.charAt(0).toUpperCase() + category.spendingPriority.slice(1)}
              </Badge>
            {/if}
          </div>

          {#if category.isSeasonal && category.seasonalMonths}
            <div class="flex items-start gap-2 text-xs text-muted-foreground">
              <Calendar class="h-3 w-3 mt-0.5 flex-shrink-0" />
              <span class="line-clamp-1">Seasonal: {category.seasonalMonths}</span>
            </div>
          {/if}
        </Card.Content>

        <Card.Footer class="flex gap-1.5">
          <Button
            onclick={() => onView(category)}
            variant="outline"
            size="sm"
            class="flex-1"
            aria-label="View category {category.name}">
            <Tag class="mr-1 h-3 w-3" />
            View
          </Button>

          <Button
            onclick={() => onViewAnalytics(category)}
            variant="outline"
            size="sm"
            aria-label="View analytics for {category.name}">
            <BarChart3 class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onEdit(category)}
            variant="outline"
            size="sm"
            aria-label="Edit category {category.name}">
            <Pencil class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onDelete(category)}
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            aria-label="Delete category {category.name}">
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