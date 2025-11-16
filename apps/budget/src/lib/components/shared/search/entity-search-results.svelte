<script lang="ts" generics="TEntity">
import * as Table from '$lib/components/ui/table';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { ViewMode } from './entity-search-state.svelte';
import type { Snippet } from 'svelte';
import type { ComponentType, SvelteComponent } from 'svelte';

interface Props {
  entities: TEntity[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  isReorderMode?: boolean;

  // Empty state configuration
  emptyIcon?: ComponentType<SvelteComponent>;
  emptyTitle?: string;
  emptyDescription?: string;
  emptySearchDescription?: string;

  // Callbacks
  onView: (entity: TEntity) => void;
  onEdit: (entity: TEntity) => void;
  onDelete: (entity: TEntity) => void;
  onBulkDelete: (entities: TEntity[]) => void;
  onViewAnalytics?: (entity: TEntity) => void;
  onReorder?: (reorderedEntities: TEntity[]) => void;

  // Custom rendering via snippets
  gridCard?: Snippet<[TEntity]>;
  listView?: Snippet<[]>;

  // Grid configuration
  gridColumns?: string;
}

let {
  entities,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  isReorderMode = false,
  emptyIcon,
  emptyTitle = 'No items found',
  emptyDescription = 'Try adjusting your search or filters',
  emptySearchDescription,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  onViewAnalytics,
  onReorder,
  gridCard,
  listView,
  gridColumns = 'grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}: Props = $props();
</script>

{#if isLoading}
  <!-- Loading State -->
  {#if viewMode === 'grid'}
    <div class="grid {gridColumns}">
      {#each Array(8) as _}
        <div class="space-y-3 rounded-lg border p-4">
          <Skeleton class="h-6 w-3/4" />
          <Skeleton class="h-4 w-full" />
          <div class="space-y-2">
            <Skeleton class="h-4 w-1/2" />
            <Skeleton class="h-4 w-2/3" />
          </div>
          <div class="flex gap-2">
            <Skeleton class="h-8 w-16" />
            <Skeleton class="h-8 w-16" />
            <Skeleton class="h-8 w-16" />
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <div class="rounded-md border">
      <Table.Root>
        <Table.Header>
          <Table.Row>
            {#each Array(5) as _}
              <Table.Head><Skeleton class="h-4 w-24" /></Table.Head>
            {/each}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each Array(10) as _}
            <Table.Row>
              {#each Array(5) as _}
                <Table.Cell><Skeleton class="h-4 w-32" /></Table.Cell>
              {/each}
            </Table.Row>
          {/each}
        </Table.Body>
      </Table.Root>
    </div>
  {/if}
{:else if entities.length === 0}
  <!-- Empty State -->
  <div class="py-12 text-center">
    {#if emptyIcon}
      {@const Icon = emptyIcon}
      <Icon class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
    {/if}
    <h3 class="text-muted-foreground mb-2 text-lg font-medium">{emptyTitle}</h3>
    <p class="text-muted-foreground text-sm">
      {#if searchQuery && emptySearchDescription}
        {emptySearchDescription.replace('{query}', searchQuery)}
      {:else if searchQuery}
        No items match your search for "{searchQuery}".
      {:else}
        {emptyDescription}
      {/if}
    </p>
  </div>
{:else if viewMode === 'grid' && gridCard}
  <!-- Grid View -->
  <div class="grid {gridColumns}">
    {#each entities as entity (entity.id)}
      {@render gridCard(entity)}
    {/each}
  </div>
{:else if viewMode === 'list' && listView}
  <!-- List View -->
  {@render listView()}
{:else}
  <!-- Fallback: Simple list -->
  <div class="space-y-2">
    {#each entities as entity}
      <div class="rounded-lg border p-4">
        <pre>{JSON.stringify(entity, null, 2)}</pre>
      </div>
    {/each}
  </div>
{/if}
