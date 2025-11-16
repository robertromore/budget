<script lang="ts">
import {browser} from '$app/environment';
import type {Category} from '$lib/schema';
import type {CategoriesState} from '$lib/states/entities/categories.svelte';
import type {ColumnDef} from '@tanstack/table-core';
import CategoryDataTable from './category-data-table.svelte';
import {Skeleton} from '$lib/components/ui/skeleton';

interface Props {
  isLoading: boolean;
  categories: Category[];
  categoriesState: CategoriesState;
  columns: (
    categoriesState: CategoriesState,
    onView: (category: Category) => void,
    onEdit: (category: Category) => void,
    onDelete: (category: Category) => void,
    onViewAnalytics: (category: Category) => void
  ) => ColumnDef<Category>[];
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

{#if isLoading}
  <!-- Loading state: Show skeleton while fetching data -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{:else if browser && categoriesState}
  <!-- Show the data table -->
  <CategoryDataTable
    {columns}
    {categories}
    {onView}
    {onEdit}
    {onDelete}
    {onViewAnalytics}
    {onBulkDelete}
    {categoriesState}
    bind:table />
{:else}
  <!-- Fallback loading state -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{/if}
