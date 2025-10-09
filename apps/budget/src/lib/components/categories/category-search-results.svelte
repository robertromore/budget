<script lang="ts">
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {Button} from '$lib/components/ui/button';
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
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import type {Category} from '$lib/schema';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import {CategoriesState} from '$lib/states/entities/categories.svelte';
import CategoryDataTableContainer from '../../../routes/categories/(components)/category-data-table-container.svelte';
import {columns} from '../../../routes/categories/(data)/columns.svelte';

export type ViewMode = 'list' | 'grid';

interface Props {
  categories: Category[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  isReorderMode?: boolean;
  onView: (category: Category) => void;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onViewAnalytics: (category: Category) => void;
  onBulkDelete: (categories: Category[]) => void;
  onReorder?: (reorderedCategories: Category[]) => void;
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
  onViewAnalytics,
  onBulkDelete,
  onReorder
}: Props = $props();

// Get categories state for data table
const categoriesState = $derived(CategoriesState.get());

// Table binding for advanced features
let table = $state<any>();

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


// Drag-and-drop state
let draggedCategory = $state<Category | null>(null);
let isDragging = $state(false);
let dragOverDropZone = $state<number>(-1);
let dragInsertIndex = $state<number>(-1);
let justReordered = $state(false);
let dragUpdateTimeout: number | undefined;

function handleDragStart(category: Category) {
  // Only allow drag and drop in grid view
  if (!isReorderMode || viewMode !== 'grid') return;
  draggedCategory = category;
  isDragging = true;
}

function handleDragEnd() {
  draggedCategory = null;
  isDragging = false;
  dragOverDropZone = -1;
  dragInsertIndex = -1;
  if (dragUpdateTimeout) {
    clearTimeout(dragUpdateTimeout);
    dragUpdateTimeout = undefined;
  }
}

function handleDropZoneDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (draggedCategory && dragOverDropZone !== index) {
    if (dragUpdateTimeout) {
      clearTimeout(dragUpdateTimeout);
    }

    dragOverDropZone = index;

    dragUpdateTimeout = setTimeout(() => {
      if (draggedCategory && dragOverDropZone === index) {
        dragInsertIndex = index;
      }
    }, 50) as unknown as number;
  }
}

function handleDropZoneDragLeave(e: DragEvent) {
  e.stopPropagation();
  const target = e.currentTarget as HTMLElement;
  const relatedTarget = e.relatedTarget as HTMLElement;

  if (!target.contains(relatedTarget)) {
    dragOverDropZone = -1;
    dragInsertIndex = -1;
  }
}

function handleDropZoneDrop(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation();

  if (draggedCategory) {
    const draggedIndex = categories.findIndex((c) => c.id === draggedCategory!.id);

    if (draggedIndex !== -1 && draggedIndex !== index) {
      const reordered = [...categories];
      const [draggedItem] = reordered.splice(draggedIndex, 1);
      if (!draggedItem) return;

      const targetIndex = draggedIndex < index ? index : index;
      reordered.splice(targetIndex, 0, draggedItem);

      // Update displayOrder for all affected categories
      const updatedCategories = reordered.map((cat, idx) => ({
        ...cat,
        displayOrder: idx,
      }));

      justReordered = true;
      onReorder?.(updatedCategories);

      setTimeout(() => {
        justReordered = false;
      }, 50);
    }
  }

  handleDragEnd();
}

function getCategoryShift(category: Category, index: number): string {
  if (!isDragging || !draggedCategory || dragInsertIndex === -1 || dragOverDropZone !== -1) {
    return '';
  }

  const draggedIndex = categories.findIndex((c) => c.id === draggedCategory!.id);

  if (category.id === draggedCategory.id) {
    return '';
  }

  if (draggedIndex < dragInsertIndex) {
    if (index > draggedIndex && index <= dragInsertIndex) {
      return 'translateX(-100%)';
    }
  } else if (draggedIndex > dragInsertIndex) {
    if (index >= dragInsertIndex && index < draggedIndex) {
      return 'translateX(100%)';
    }
  }

  return '';
}
</script>

{#if categories.length === 0 && !isLoading}
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
{:else if viewMode === 'grid'}
  <!-- Results Grid -->
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 {isDragging && isReorderMode ? 'drag-active' : ''}">
    {#each categories as category, index (category.id)}
      {@const typeInfo = getCategoryTypeInfo(category.categoryType)}
      {@const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
      {@const IconComponent = iconData?.icon || Tag}
      {@const categoryShift = getCategoryShift(category, index)}

      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <div
        draggable={isReorderMode}
        role={isReorderMode ? 'button' : undefined}
        tabindex={isReorderMode ? 0 : undefined}
        aria-label={isReorderMode ? `Reorder ${category.name}` : undefined}
        class="category-wrapper relative
             {isReorderMode ? 'draggable' : ''}
             {draggedCategory?.id === category.id ? 'being-dragged' : ''}
             {isDragging && draggedCategory?.id !== category.id ? 'hidden-during-drag' : ''}
             {justReordered ? 'no-transition' : ''}"
        style={categoryShift ? `transform: ${categoryShift}` : ''}
        ondragstart={(e) => {
          if (isReorderMode) {
            handleDragStart(category);
            e.dataTransfer?.setData('text/plain', String(category.id));

            if (e.dataTransfer && e.currentTarget) {
              const originalElement = e.currentTarget as HTMLElement;
              const dragImage = originalElement.cloneNode(true) as HTMLElement;

              dragImage.style.position = 'absolute';
              dragImage.style.top = '-9999px';
              dragImage.style.left = '-9999px';
              dragImage.style.width = originalElement.offsetWidth + 'px';
              dragImage.style.height = originalElement.offsetHeight + 'px';
              dragImage.style.transform = 'rotate(3deg) scale(0.9)';
              dragImage.style.opacity = '0.8';
              dragImage.style.pointerEvents = 'none';
              dragImage.style.zIndex = '9999';
              dragImage.style.background = 'white';
              dragImage.style.border = '2px dashed hsl(var(--primary) / 0.6)';
              dragImage.style.borderRadius = '8px';
              dragImage.style.boxShadow = '0 8px 25px hsl(var(--foreground) / 0.3)';

              document.body.appendChild(dragImage);

              e.dataTransfer.setDragImage(
                dragImage,
                originalElement.offsetWidth / 2,
                originalElement.offsetHeight / 2
              );

              setTimeout(() => {
                if (document.body.contains(dragImage)) {
                  document.body.removeChild(dragImage);
                }
              }, 1);
            }
          } else {
            e.preventDefault();
          }
        }}
        ondragend={handleDragEnd}
      >
        <!-- Drop zone overlay -->
        {#if isDragging && isReorderMode && draggedCategory?.id !== category.id}
          <div
            class="drop-zone-overlay {dragOverDropZone === index ? 'drag-over' : ''}"
            ondragover={(e) => handleDropZoneDragOver(index, e)}
            ondragleave={(e) => handleDropZoneDragLeave(e)}
            ondrop={(e) => handleDropZoneDrop(index, e)}
            role="presentation"
            data-drop-index={index}
          >
            {#if dragOverDropZone === index}
              <div class="drop-zone-text">Drop here</div>
            {/if}
          </div>
        {/if}

        <Card.Root
          class="relative transition-all duration-200 {!isReorderMode ? 'hover:shadow-md' : ''}"
          style={category.categoryColor ? `border-left: 4px solid ${category.categoryColor};` : ''}
        >
          <!-- Drag Handle (only in reorder mode) -->
          {#if isReorderMode}
            <div class="absolute top-2 right-2 z-10 drag-handle cursor-grab active:cursor-grabbing">
              <GripVertical class="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
            </div>
          {/if}

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
            disabled={isReorderMode}
            aria-label="View category {category.name}">
            <Tag class="mr-1 h-3 w-3" />
            View
          </Button>

          <Button
            onclick={() => onViewAnalytics(category)}
            variant="outline"
            size="sm"
            disabled={isReorderMode}
            aria-label="View analytics for {category.name}">
            <BarChart3 class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onEdit(category)}
            variant="outline"
            size="sm"
            disabled={isReorderMode}
            aria-label="Edit category {category.name}">
            <Pencil class="h-3 w-3" />
          </Button>

          <Button
            onclick={() => onDelete(category)}
            variant="outline"
            size="sm"
            class="text-destructive hover:text-destructive"
            disabled={isReorderMode}
            aria-label="Delete category {category.name}">
            <Trash2 class="h-3 w-3" />
          </Button>
        </Card.Footer>
      </Card.Root>
      </div>
    {/each}
  </div>
{:else}
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
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  /* Drag-and-drop styles */
  .category-wrapper {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
  }

  .category-wrapper:not(.being-dragged) {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .category-wrapper.no-transition {
    transition: none !important;
  }

  .category-wrapper.draggable {
    cursor: grab;
  }

  .category-wrapper.draggable:active {
    cursor: grabbing;
  }

  .category-wrapper.being-dragged {
    opacity: 0.7;
    transform: scale(0.98) rotate(1deg);
    z-index: 1000;
  }

  .category-wrapper.hidden-during-drag {
    opacity: 0.5;
    transform: scale(0.98);
    pointer-events: none;
    filter: grayscale(0.3);
    transition: all 0.3s ease;
  }

  .category-wrapper.hidden-during-drag[style*='translateX'] {
    opacity: 0.8;
    filter: grayscale(0.1);
  }

  /* Drop zone overlay */
  .drop-zone-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: hsl(var(--accent) / 0.15);
    border: 2px solid hsl(var(--primary) / 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    opacity: 1;
    transition: all 0.2s ease;
    pointer-events: auto;
    backdrop-filter: blur(1px);
    box-shadow:
      inset 0 0 12px hsl(var(--primary) / 0.1),
      0 2px 8px hsl(var(--foreground) / 0.05);
  }

  .drop-zone-overlay.drag-over {
    background: hsl(var(--primary) / 0.2);
    border-color: hsl(var(--primary) / 0.8);
    box-shadow:
      0 0 0 4px hsl(var(--primary) / 0.3),
      0 0 30px hsl(var(--primary) / 0.4);
  }

  .drop-zone-text {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
    padding: 6px 12px;
    border-radius: 4px;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
    animation: drop-text-appear 0.2s ease-out;
    pointer-events: none;
    z-index: 1001;
    box-shadow:
      0 2px 8px hsl(var(--foreground) / 0.1),
      0 0 0 1px hsl(var(--background) / 0.8);
    border: 1px solid hsl(var(--border));
  }

  @keyframes drop-text-appear {
    0% {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.8);
    }
    100% {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  /* Grid drag active state */
  .drag-active {
    background: hsl(var(--primary) / 0.03);
    border: 2px dashed hsl(var(--primary) / 0.4);
    border-radius: 12px;
    padding: 8px;
  }

  /* Drag handle */
  .drag-handle {
    transition: all 0.2s ease;
  }

  .drag-handle:hover {
    color: hsl(var(--primary));
  }
</style>
