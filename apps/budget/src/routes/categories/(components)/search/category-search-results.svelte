<script lang="ts">
import { EntityCard, EntitySearchResults } from '$lib/components/shared/search';
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import { getIconByName } from '$lib/components/ui/icon-picker/icon-categories';
import type { Category } from '$lib/schema';
import type { CategoryWithGroup } from '$lib/server/domains/categories/repository';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { highlightMatches } from '$lib/utils/search';
import ArrowLeftRight from '@lucide/svelte/icons/arrow-left-right';
import Calendar from '@lucide/svelte/icons/calendar';
import FolderTree from '@lucide/svelte/icons/folder-tree';
import PiggyBank from '@lucide/svelte/icons/piggy-bank';
import Receipt from '@lucide/svelte/icons/receipt';
import Tag from '@lucide/svelte/icons/tag';
import TrendingDown from '@lucide/svelte/icons/trending-down';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import type { Table as TanStackTable } from '@tanstack/table-core';
import { columns } from '../../(data)/columns.svelte';
import CategoryDataTableContainer from '../category-data-table-container.svelte';

export type ViewMode = 'list' | 'grid';

interface Props {
  categories: CategoryWithGroup[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  isReorderMode?: boolean;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onBulkDelete: (categories: Category[]) => void;
  onViewAnalytics: (category: Category) => void;
  onReorder?: (reorderedCategories: CategoryWithGroup[]) => void;
}

let {
  categories,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  isReorderMode = false,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  onViewAnalytics,
  onReorder,
}: Props = $props();

// Get categories state from context
const categoriesState = $derived(CategoriesState.get());

// Table binding for list view
let table = $state<TanStackTable<CategoryWithGroup>>();

// Get category type icon and label
const getCategoryTypeInfo = (type: string | null) => {
  switch (type) {
    case 'income':
      return {
        icon: TrendingUp,
        label: 'Income',
        variant: 'default' as const,
        color: 'text-green-600',
      };
    case 'expense':
      return {
        icon: TrendingDown,
        label: 'Expense',
        variant: 'secondary' as const,
        color: 'text-red-600',
      };
    case 'transfer':
      return {
        icon: ArrowLeftRight,
        label: 'Transfer',
        variant: 'outline' as const,
        color: 'text-blue-600',
      };
    case 'savings':
      return {
        icon: PiggyBank,
        label: 'Savings',
        variant: 'default' as const,
        color: 'text-purple-600',
      };
    default:
      return {
        icon: Tag,
        label: 'Expense',
        variant: 'secondary' as const,
        color: 'text-muted-foreground',
      };
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

<EntitySearchResults
  entities={categories}
  {isLoading}
  {searchQuery}
  {viewMode}
  {isReorderMode}
  emptyIcon={Tag}
  emptyTitle="No categories found"
  emptyDescription="Try adjusting your filters or search terms"
  {onView}
  {onEdit}
  {onDelete}
  {onBulkDelete}
  {onViewAnalytics}
  {onReorder}>
  {#snippet gridCard(category)}
    {@const typeInfo = getCategoryTypeInfo(category.categoryType)}
    {@const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
    {@const IconComponent = iconData?.icon || Tag}

    <EntityCard
      entity={category}
      {onView}
      {onEdit}
      {onDelete}
      {onViewAnalytics}
      {isReorderMode}
      viewButtonLabel="View"
      cardStyle={category.categoryColor ? `border-left: 4px solid ${category.categoryColor};` : ''}>
      {#snippet header(c)}
        <!-- Name and Icon -->
        <Card.Title class="flex items-start gap-2">
          <div class="relative shrink-0">
            <IconComponent
              class="mt-0.5 h-5 w-5"
              style={c.categoryColor ? `color: ${c.categoryColor};` : ''} />
            {#if c.categoryColor && !c.categoryIcon}
              <span
                class="border-background absolute -right-0.5 -bottom-0.5 h-2 w-2 rounded-full border"
                style={`background-color: ${c.categoryColor};`}></span>
            {/if}
          </div>
          <div class="min-w-0 flex-1">
            <a href="/categories/{c.slug}" class="block truncate font-medium hover:underline">
              {@html highlightMatches(c.name || 'Unnamed Category', searchQuery)}
            </a>
            <div class="mt-1 flex flex-wrap items-center gap-1.5">
              {#if c.parentId}
                <div class="text-muted-foreground flex items-center gap-1 text-xs">
                  <FolderTree class="h-3 w-3" />
                  <span>Subcategory</span>
                </div>
              {/if}
              {#if !c.isActive}
                <Badge variant="outline" class="h-5 py-0 text-xs">Inactive</Badge>
              {/if}
            </div>
          </div>
        </Card.Title>

        {#if c.notes}
          <Card.Description>
            <span class="line-clamp-2 text-sm">
              {@html highlightMatches(
                c.notes.length > 100 ? c.notes.substring(0, 100) + '...' : c.notes,
                searchQuery
              )}
            </span>
          </Card.Description>
        {/if}
      {/snippet}

      {#snippet content(c)}
        <!-- Category Type Badge -->
        <div class="flex flex-wrap items-center gap-1.5">
          <Badge variant={typeInfo.variant} class="text-xs">
            <typeInfo.icon class="mr-1 h-3 w-3" />
            {typeInfo.label}
          </Badge>

          {#if c.isTaxDeductible}
            <Badge
              variant="secondary"
              class="bg-green-100 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-200">
              <Receipt class="mr-1 h-3 w-3" />
              Tax Deductible
            </Badge>
          {/if}

          {#if c.spendingPriority}
            <Badge variant="outline" class="text-xs {getPriorityColor(c.spendingPriority)}">
              {c.spendingPriority.charAt(0).toUpperCase() + c.spendingPriority.slice(1)}
            </Badge>
          {/if}
        </div>

        {#if c.isSeasonal && c.seasonalMonths}
          <div class="text-muted-foreground flex items-start gap-2 text-xs">
            <Calendar class="mt-0.5 h-3 w-3 shrink-0" />
            <span class="line-clamp-1">Seasonal: {c.seasonalMonths}</span>
          </div>
        {/if}
      {/snippet}
    </EntityCard>
  {/snippet}

  {#snippet listView()}
    <!-- List View with Data Table -->
    <CategoryDataTableContainer
      {isLoading}
      {categories}
      {columns}
      {categoriesState}
      {onView}
      {onEdit}
      {onDelete}
      {onViewAnalytics}
      {onBulkDelete}
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

.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
