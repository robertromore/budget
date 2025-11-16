<script lang="ts" generics="TEntity">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { cn } from '$lib/utils';
import Pencil from '@lucide/svelte/icons/pencil';
import Trash2 from '@lucide/svelte/icons/trash-2';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Eye from '@lucide/svelte/icons/eye';
import type { Snippet } from 'svelte';
import type { HTMLAttributes } from 'svelte/elements';

interface Props extends HTMLAttributes<HTMLDivElement> {
  entity: TEntity;
  isReorderMode?: boolean;
  isDragging?: boolean;

  // Callbacks
  onView?: (entity: TEntity) => void;
  onEdit?: (entity: TEntity) => void;
  onDelete?: (entity: TEntity) => void;
  onViewAnalytics?: (entity: TEntity) => void;

  // Customizable content via snippets
  header?: Snippet<[TEntity]>;
  content?: Snippet<[TEntity]>;
  footer?: Snippet<[TEntity]>;
  badges?: Snippet<[TEntity]>;

  // Action button configuration
  showViewButton?: boolean;
  showEditButton?: boolean;
  showDeleteButton?: boolean;
  showAnalyticsButton?: boolean;
  viewButtonLabel?: string;

  // Styling
  cardStyle?: string;
  cardClass?: string;
}

let {
  entity,
  isReorderMode = false,
  isDragging = false,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  header,
  content,
  badges,
  footer,
  showViewButton = true,
  showEditButton = true,
  showDeleteButton = true,
  showAnalyticsButton = true,
  viewButtonLabel = 'View',
  cardStyle = '',
  cardClass = '',
  class: className,
  ...restProps
}: Props = $props();

const hasDefaultFooter = $derived(
  !footer && (showViewButton || showEditButton || showDeleteButton || showAnalyticsButton)
);
</script>

<Card.Root
  class={cn(
    'relative transition-all duration-200',
    !isReorderMode && 'hover:shadow-md',
    isDragging && 'scale-98 transform opacity-70',
    cardClass,
    className
  )}
  style={cardStyle}
  {...restProps}>
  {#if header}
    <Card.Header class="pb-3">
      {@render header(entity)}
    </Card.Header>
  {/if}

  {#if content}
    <Card.Content class="space-y-3 pb-3">
      {@render content(entity)}
    </Card.Content>
  {/if}

  {#if badges}
    <Card.Content class="pt-0 pb-3">
      {@render badges(entity)}
    </Card.Content>
  {/if}

  {#if footer}
    <Card.Footer class="flex gap-1.5">
      {@render footer(entity)}
    </Card.Footer>
  {:else if hasDefaultFooter}
    <Card.Footer class="flex gap-1.5">
      {#if showViewButton && onView}
        <Button
          onclick={() => onView?.(entity)}
          variant="outline"
          size="sm"
          class="flex-1"
          disabled={isReorderMode}
          aria-label="View entity">
          <Eye class="mr-1 h-3 w-3" />
          {viewButtonLabel}
        </Button>
      {/if}

      {#if showAnalyticsButton && onViewAnalytics}
        <Button
          onclick={() => onViewAnalytics?.(entity)}
          variant="outline"
          size="sm"
          disabled={isReorderMode}
          aria-label="View analytics">
          <BarChart3 class="h-3 w-3" />
        </Button>
      {/if}

      {#if showEditButton && onEdit}
        <Button
          onclick={() => onEdit?.(entity)}
          variant="outline"
          size="sm"
          disabled={isReorderMode}
          aria-label="Edit entity">
          <Pencil class="h-3 w-3" />
        </Button>
      {/if}

      {#if showDeleteButton && onDelete}
        <Button
          onclick={() => onDelete?.(entity)}
          variant="outline"
          size="sm"
          class="text-destructive hover:text-destructive"
          disabled={isReorderMode}
          aria-label="Delete entity">
          <Trash2 class="h-3 w-3" />
        </Button>
      {/if}
    </Card.Footer>
  {/if}
</Card.Root>
