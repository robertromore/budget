<script lang="ts">
import { browser } from '$app/environment';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { Category } from '$lib/schema';
import type { CategoryWithGroup } from '$lib/server/domains/categories/repository';
import type { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { ColumnDef } from '@tanstack/table-core';
import CategoryDataTable from './category-data-table.svelte';

interface Props {
  isLoading: boolean;
  categories: CategoryWithGroup[];
  categoriesState: CategoriesState;
  columns: (
    categoriesState: CategoriesState,
    onView: (category: Category) => void,
    onEdit: (category: Category) => void,
    onDelete: (category: Category) => void,
    onViewAnalytics: (category: Category) => void
  ) => ColumnDef<CategoryWithGroup>[];
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
  onBulkDelete: (categories: Category[]) => void;
  table?: any;
}

let {
  isLoading = false,
  categories = [],
  categoriesState,
  columns,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  onBulkDelete,
  table = $bindable(),
}: Props = $props();
</script>

{#if browser && categoriesState}
  <CategoryDataTable
    {columns}
    {categories}
    {onView}
    {onEdit}
    {onDelete}
    {onViewAnalytics}
    {onBulkDelete}
    {categoriesState}
    loading={isLoading}
    bind:table />
{:else}
  <!-- SSR/loading skeleton -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{/if}
