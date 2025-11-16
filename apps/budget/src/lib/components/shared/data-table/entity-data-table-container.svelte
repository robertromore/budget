<script lang="ts" generics="TEntity, TState">
import type { ColumnDef, Table } from '@tanstack/table-core';
import { Skeleton } from '$lib/components/ui/skeleton';
import { browser } from '$app/environment';

interface Props {
  isLoading: boolean;
  entities: TEntity[];
  columns: (
    state: TState,
    onView: (entity: TEntity) => void,
    onEdit: (entity: TEntity) => void,
    onDelete: (entity: TEntity) => void,
    onViewAnalytics: (entity: TEntity) => void
  ) => ColumnDef<TEntity>[];
  state: TState;
  onView: (entity: TEntity) => void;
  onEdit: (entity: TEntity) => void;
  onDelete: (entity: TEntity) => void;
  onViewAnalytics: (entity: TEntity) => void;
  onBulkDelete: (entities: TEntity[]) => void;
  table?: Table<TEntity> | undefined;
  dataTableComponent: any;
}

let {
  isLoading,
  entities,
  columns,
  state,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  onBulkDelete,
  table = $bindable(),
  dataTableComponent,
}: Props = $props();
</script>

{#if isLoading}
  <div class="space-y-3">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-10 w-full" />
  </div>
{:else if browser && state}
  <dataTableComponent
    {columns}
    {entities}
    {state}
    {onView}
    {onEdit}
    {onDelete}
    {onViewAnalytics}
    {onBulkDelete}
    bind:table />
{/if}
