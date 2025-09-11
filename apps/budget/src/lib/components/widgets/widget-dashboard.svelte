<script lang="ts">
import {browser} from '$app/environment';
import {Button} from '$ui/components/ui/button';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import {widgetStore} from '$lib/stores/widgets.svelte';
import type {WidgetConfig} from '$lib/types/widgets';
import {Plus, Settings} from '$lib/components/icons';
import {getWidgetComponent} from './widget-registry';

let {
  accountId,
  transactions,
  summary,
}: {
  accountId: number;
  transactions: any[];
  summary: any;
} = $props();

// Calculate widget data
const widgetData = $derived.by(() => {
  return widgetStore.calculateWidgetData(accountId, transactions, summary);
});

const enabledWidgets = $derived(widgetStore.enabledWidgets);
const availableWidgets = $derived(widgetStore.availableWidgets);
const isEditMode = $derived(widgetStore.isEditMode);

function handleWidgetUpdate(widgetId: string, updates: Partial<WidgetConfig>) {
  widgetStore.updateWidget(widgetId, updates);
}

function handleWidgetRemove(widgetId: string) {
  widgetStore.removeWidget(widgetId);
}

function handleAddWidget(widgetType: string) {
  widgetStore.addWidget(widgetType);
}

// Helper function to determine if widget should be shifted during drag
function getWidgetShift(widget: WidgetConfig, index: number): string {
  if (!isDragging || !draggedWidget || dragInsertIndex === -1) {
    return '';
  }

  // Disable shifting animations when using overlay drop zones to prevent wiggling
  if (dragOverDropZone !== -1) {
    return '';
  }

  const draggedIndex = enabledWidgets.findIndex((w) => w.id === draggedWidget?.id);

  // Don't shift the dragged widget itself
  if (widget.id === draggedWidget.id) {
    return '';
  }

  // When dragging over drop zones, the dragInsertIndex represents the position where
  // the widget will be inserted, taking the place of the widget at that position
  if (draggedIndex < dragInsertIndex) {
    // Dragging forward (left to right) - widgets from after dragged position up to and including target shift left
    if (index > draggedIndex && index <= dragInsertIndex) {
      return `translateX(-100%)`;
    }
  } else if (draggedIndex > dragInsertIndex) {
    // Dragging backward (right to left) - widgets from target position up to before dragged position shift right
    if (index >= dragInsertIndex && index < draggedIndex) {
      return `translateX(100%)`;
    }
  }

  return '';
}

let draggedWidget = $state<WidgetConfig | null>(null);
let isDragging = $state(false);
let dragOverWidget = $state<WidgetConfig | null>(null);
let dragInsertIndex = $state<number>(-1);
let justReordered = $state(false);
let dragOverDropZone = $state<number>(-1);
let lastStableInsertIndex = $state<number>(-1);
let dragUpdateTimeout: number | undefined;

function handleDragStart(widget: WidgetConfig) {
  draggedWidget = widget;
  isDragging = true;
  lastStableInsertIndex = -1;
}

function handleDragEnd() {
  draggedWidget = null;
  isDragging = false;
  dragOverWidget = null;
  dragInsertIndex = -1;
  dragOverDropZone = -1;
  lastStableInsertIndex = -1;
  if (dragUpdateTimeout) {
    clearTimeout(dragUpdateTimeout);
    dragUpdateTimeout = undefined;
  }
}

function handleDragOver(widget: WidgetConfig, e: DragEvent) {
  e.preventDefault();
  // Only handle regular drag over if we're not already over a drop zone overlay
  if (draggedWidget && draggedWidget.id !== widget.id && dragOverDropZone === -1) {
    dragOverWidget = widget;
    const targetIndex = enabledWidgets.findIndex((w) => w.id === widget.id);
    dragInsertIndex = targetIndex;
  }
}

function handleDragLeave(_e: DragEvent) {
  // Only clear if we're actually leaving and not going to a drop zone overlay
  if (dragOverDropZone === -1) {
    dragOverWidget = null;
  }
}

function handleDropZoneDragOver(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation(); // Prevent event from bubbling to widget wrapper

  if (draggedWidget && dragOverDropZone !== index) {
    // Clear any existing timeout
    if (dragUpdateTimeout) {
      clearTimeout(dragUpdateTimeout);
    }

    // Immediately update the visual state
    dragOverDropZone = index;
    dragOverWidget = null;

    // Debounce the shift animation updates to prevent rapid oscillation
    dragUpdateTimeout = setTimeout(() => {
      if (draggedWidget && dragOverDropZone === index) {
        dragInsertIndex = index;
        lastStableInsertIndex = index;
      }
    }, 50) as unknown as number; // Small delay to stabilize
  }
}

function handleDropZoneDragLeave(e: DragEvent) {
  e.stopPropagation(); // Prevent event from bubbling to widget wrapper
  // Only clear drag over state if we're actually leaving the drop zone
  // Check if the related target is still within the drop zone
  const target = e.currentTarget as HTMLElement;
  const relatedTarget = e.relatedTarget as HTMLElement;

  if (!target.contains(relatedTarget)) {
    dragOverDropZone = -1;
    dragInsertIndex = -1; // Clear the insert index to stop widget shifting
  }
}

function handleDropZoneDrop(index: number, e: DragEvent) {
  e.preventDefault();
  e.stopPropagation(); // Prevent event from bubbling to widget wrapper
  if (draggedWidget) {
    handleDropAtIndex(index);
  }
}

function handleDrop(targetWidget: WidgetConfig) {
  if (draggedWidget && draggedWidget.id !== targetWidget.id) {
    const draggedIndex = enabledWidgets.findIndex((w) => w.id === draggedWidget!.id);
    const targetIndex = enabledWidgets.findIndex((w) => w.id === targetWidget.id);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      justReordered = true;
      const newOrder = [...enabledWidgets];
      const [draggedItem] = newOrder.splice(draggedIndex, 1);
      if (!draggedItem) return;
      newOrder.splice(targetIndex, 0, draggedItem);
      widgetStore.reorderWidgets(newOrder.map((w) => w.id));

      // Clear the flag after DOM updates
      setTimeout(() => {
        justReordered = false;
      }, 50);
    }
  }
}

function handleDropAtIndex(insertIndex: number) {
  if (draggedWidget) {
    const draggedIndex = enabledWidgets.findIndex((w) => w.id === draggedWidget!.id);

    if (draggedIndex !== -1) {
      // Calculate the target position based on movement direction
      let targetIndex: number;

      if (draggedIndex < insertIndex) {
        // Moving forward: drop zone means "insert after this position"
        // But we need to account for the array shift when removing the dragged item
        targetIndex = insertIndex; // insertIndex + 1 - 1
      } else {
        // Moving backward: drop zone means "insert at this position"
        // The existing widget will shift right to make room
        targetIndex = insertIndex;
      }

      // Only reorder if we're moving to a different position
      if (draggedIndex !== targetIndex) {
        justReordered = true;
        const newOrder = [...enabledWidgets];
        const [draggedItem] = newOrder.splice(draggedIndex, 1);
        if (!draggedItem) return;
        newOrder.splice(targetIndex, 0, draggedItem);

        widgetStore.reorderWidgets(newOrder.map((w) => w.id));

        // Clear the flag after DOM updates
        setTimeout(() => {
          justReordered = false;
        }, 50);
      }
    }
  }
}

// Grid configuration
const GRID_COLS = 5;
const GRID_GAP = 16; // 1rem in pixels

// Calculate grid position based on mouse position
function getGridPosition(x: number, y: number, gridContainer: HTMLElement) {
  const rect = gridContainer.getBoundingClientRect();
  const relativeX = x - rect.left;
  const relativeY = y - rect.top;

  // Calculate cell dimensions
  const cellWidth = (rect.width - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = 120; // Fixed widget height

  const col = Math.max(0, Math.min(GRID_COLS - 1, Math.floor(relativeX / (cellWidth + GRID_GAP))));
  const row = Math.max(0, Math.floor(relativeY / (cellHeight + GRID_GAP)));

  // Convert 2D grid position to 1D index, but clamp to available widgets
  const position = row * GRID_COLS + col;
  return Math.min(position, enabledWidgets.length - 1);
}

// Calculate absolute position for a grid slot
function _getSlotPosition(index: number, gridContainer: HTMLElement) {
  if (!gridContainer) return {x: 0, y: 0};

  const rect = gridContainer.getBoundingClientRect();
  const cellWidth = (rect.width - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
  const cellHeight = 120;

  const row = Math.floor(index / GRID_COLS);
  const col = index % GRID_COLS;

  return {
    x: col * (cellWidth + GRID_GAP),
    y: row * (cellHeight + GRID_GAP),
  };
}

// Handle drag over grid container
function handleGridDragOver(e: DragEvent) {
  e.preventDefault();
  if (!draggedWidget) return;

  const gridContainer = e.currentTarget as HTMLElement;
  const _targetPosition = getGridPosition(e.clientX, e.clientY, gridContainer);

  // Visual feedback - could add hover effects here
}

// Handle drop on grid container
function handleGridDrop(e: DragEvent) {
  e.preventDefault();
  if (!draggedWidget) return;

  const gridContainer = e.currentTarget as HTMLElement;
  const targetPosition = getGridPosition(e.clientX, e.clientY, gridContainer);

  const draggedIndex = enabledWidgets.findIndex((w) => w.id === draggedWidget!.id);

  if (draggedIndex !== -1 && targetPosition !== draggedIndex) {
    justReordered = true;
    const newOrder = [...enabledWidgets];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    if (!draggedItem) return;
    newOrder.splice(Math.min(targetPosition, newOrder.length), 0, draggedItem);
    widgetStore.reorderWidgets(newOrder.map((w) => w.id));

    // Clear the flag after DOM updates
    setTimeout(() => {
      justReordered = false;
    }, 50);
  }
}
</script>

{#if browser}
  <div class="space-y-4">
    <!-- Dashboard Controls -->
    <div class="flex items-center justify-end">
      <div class="flex items-center gap-2">
        <!-- Add Widget Dropdown -->
        {#if isEditMode && availableWidgets.length > 0}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger>
              <Button variant="outline" size="sm">
                <Plus class="mr-1 size-4" />
                Add Widget
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Available Widgets</DropdownMenu.Label>
              <DropdownMenu.Separator />
              {#each availableWidgets as widget}
                <DropdownMenu.Item onclick={() => handleAddWidget(widget.type)}>
                  {@const IconComponent = widget.icon}
                  <IconComponent class="mr-2 size-4" />
                  <div>
                    <div class="font-medium">{widget.name}</div>
                    <div class="text-muted-foreground text-xs">{widget.description}</div>
                  </div>
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        {/if}

        <!-- Customize Button -->
        <Button
          variant={isEditMode ? 'default' : 'outline'}
          size="sm"
          onclick={() => widgetStore.toggleEditMode()}>
          <Settings class="mr-1 size-4" />
          {isEditMode ? 'Done' : 'Customize'}
        </Button>

        {#if isEditMode}
          <Button variant="ghost" size="sm" onclick={() => widgetStore.resetToDefaults()}>
            Reset
          </Button>
        {/if}
      </div>
    </div>

    <!-- Widget Grid -->
    <div
      class="widget-grid {isDragging && isEditMode ? 'drag-active' : ''}"
      ondragover={handleGridDragOver}
      ondrop={handleGridDrop}
      role="grid"
      tabindex="0">
      {#each enabledWidgets as widget, index (widget.id)}
        {@const WidgetComponent = getWidgetComponent(widget.type)}
        {@const widgetShift = getWidgetShift(widget, index)}

        <div
          role="listitem"
          draggable={isEditMode}
          class="widget-wrapper
               {isEditMode ? 'draggable' : ''}
               {draggedWidget?.id === widget.id ? 'being-dragged' : ''}
               {dragOverWidget?.id === widget.id ? 'drag-over' : ''}
               {isDragging && draggedWidget?.id !== widget.id ? 'hidden-during-drag' : ''}
               {justReordered ? 'no-transition' : ''}"
          style={widgetShift ? `transform: ${widgetShift}` : ''}
          ondragstart={(e) => {
            if (isEditMode) {
              handleDragStart(widget);
              e.dataTransfer?.setData('text/plain', widget.id);

              // Create a better custom drag image
              if (e.dataTransfer && e.currentTarget) {
                const originalElement = e.currentTarget as HTMLElement;
                const dragImage = originalElement.cloneNode(true) as HTMLElement;

                // Style the drag image
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
                dragImage.style.border = '2px dashed rgba(59, 130, 246, 0.6)';
                dragImage.style.borderRadius = '8px';
                dragImage.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.3)';

                // Add to document temporarily
                document.body.appendChild(dragImage);

                // Set the custom drag image
                e.dataTransfer.setDragImage(
                  dragImage,
                  originalElement.offsetWidth / 2,
                  originalElement.offsetHeight / 2
                );

                // Clean up after a brief delay
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
          ondragover={(e) => handleDragOver(widget, e)}
          ondragleave={(e) => handleDragLeave(e)}
          ondrop={(e) => {
            if (isEditMode && draggedWidget && draggedWidget.id !== widget.id) {
              e.preventDefault();
              handleDrop(widget);
            }
          }}>
          <!-- Drop zone overlay that appears on top of widget during drag -->
          {#if isDragging && isEditMode && draggedWidget?.id !== widget.id}
            <div
              class="drop-zone-overlay {dragOverDropZone === index ? 'drag-over' : ''}"
              ondragover={(e) => handleDropZoneDragOver(index, e)}
              ondragleave={(e) => handleDropZoneDragLeave(e)}
              ondrop={(e) => handleDropZoneDrop(index, e)}
              role="presentation"
              data-drop-index={index}>
              {#if dragOverDropZone === index}
                <div class="drop-zone-text">Drop here</div>
              {/if}
            </div>
          {/if}

          <WidgetComponent
            config={widget}
            data={widgetData}
            editMode={isEditMode}
            onUpdate={(updates: Partial<WidgetConfig>) => handleWidgetUpdate(widget.id, updates)}
            onRemove={() => handleWidgetRemove(widget.id)} />
        </div>
      {/each}

      <!-- Drop zone at the end for inserting after all widgets -->
      {#if isDragging && isEditMode}
        <div
          class="widget-wrapper drop-zone-end {dragOverDropZone === enabledWidgets.length
            ? 'drag-over'
            : ''}"
          ondragover={(e) => handleDropZoneDragOver(enabledWidgets.length, e)}
          ondragleave={(e) => handleDropZoneDragLeave(e)}
          ondrop={(e) => handleDropZoneDrop(enabledWidgets.length, e)}
          role="listitem">
          <div class="drop-zone-placeholder">
            {#if dragOverDropZone === enabledWidgets.length}
              <div class="drop-zone-end-text">Add widget here</div>
            {:else}
              <div class="drop-zone-line"></div>
            {/if}
          </div>
        </div>
      {/if}

      <!-- Add Widget Placeholder in Edit Mode -->
      {#if isEditMode && availableWidgets.length > 0}
        <div
          class="text-muted-foreground flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-4 transition-colors hover:border-gray-400 hover:bg-gray-50">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger class="flex h-full w-full flex-col items-center justify-center">
              <Plus class="mb-2 size-6" />
              <span class="text-sm">Add Widget</span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Available Widgets</DropdownMenu.Label>
              <DropdownMenu.Separator />
              {#each availableWidgets as widget}
                <DropdownMenu.Item onclick={() => handleAddWidget(widget.type)}>
                  {@const IconComponent = widget.icon}
                  <IconComponent class="mr-2 size-4" />
                  <div>
                    <div class="font-medium">{widget.name}</div>
                    <div class="text-muted-foreground text-xs">{widget.description}</div>
                  </div>
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/if}
    </div>

    <!-- Edit Mode Help -->
    {#if isEditMode}
      <div class="text-muted-foreground rounded-lg bg-blue-50 p-3 text-sm">
        <strong>Edit Mode:</strong> Drag widgets to reorder them. Click the menu (⋮) on each widget to
        resize or remove it. Use "Add Widget" to add new widgets to your dashboard.
      </div>
    {/if}
  </div>
{:else}
  <!-- Server-side placeholder -->
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">Dashboard</h2>
      <div class="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Settings class="mr-1 size-4" />
          Customize
        </Button>
      </div>
    </div>

    <!-- Loading placeholder grid -->
    <div class="widget-grid">
      <div class="min-h-[100px] animate-pulse rounded-lg bg-gray-100 p-4"></div>
      <div class="min-h-[100px] animate-pulse rounded-lg bg-gray-100 p-4"></div>
      <div class="min-h-[100px] animate-pulse rounded-lg bg-gray-100 p-4"></div>
      <div class="min-h-[100px] animate-pulse rounded-lg bg-gray-100 p-4"></div>
      <div class="min-h-[100px] animate-pulse rounded-lg bg-gray-100 p-4"></div>
    </div>
  </div>
{/if}

<style>
.widget-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1rem;
  position: relative;
  align-items: start;
}

/* Add visual feedback during drag operations */
.widget-grid.drag-active {
  background: rgba(59, 130, 246, 0.05);
  border: 2px dashed rgba(59, 130, 246, 0.3);
  border-radius: 8px;
}

/* Widget size classes - flexible dimensions */
:global(.widget-size-small) {
  min-height: 120px;
  max-height: 120px;
}

:global(.widget-size-medium) {
  min-height: 200px;
  max-height: 400px; /* Allow expansion for content-rich widgets */
}

:global(.widget-size-large) {
  min-height: 300px;
  max-height: 500px; /* Allow expansion for content-rich widgets */
}

/* Override small widgets on mobile to prevent too tiny cards */
@media (max-width: 767px) {
  .widget-grid {
    grid-template-columns: 1fr;
  }

  :global(.widget-size-small) {
    min-height: 140px;
    max-height: 140px;
  }
}

/* On larger screens, allow more columns but maintain minimum sizes */
@media (min-width: 768px) {
  .widget-grid {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (min-width: 1200px) {
  .widget-grid {
    grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  }
}

/* Widget positioning and animations */
.widget-wrapper {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Smooth repositioning animation during drag */
.widget-wrapper:not(.being-dragged) {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Disable transitions when reordering to prevent unwanted slide effects */
.widget-wrapper.no-transition {
  transition: none !important;
}

/* HTML5 drag and drop styling */
.widget-wrapper.draggable {
  cursor: grab;
  transition: all 0.2s ease;
}

/* Override shadcn card shadows in edit mode */
.widget-grid .widget-wrapper.draggable :global(.card) {
  box-shadow: none;
  border: 2px dashed rgba(156, 163, 175, 0.3);
}

.widget-wrapper.draggable:hover {
  transform: translateY(-2px);
}

.widget-grid .widget-wrapper.draggable:hover :global(.card) {
  box-shadow: none;
  border: 2px dashed rgba(59, 130, 246, 0.6);
  background: rgba(59, 130, 246, 0.02);
}

/* Widget being dragged */
.widget-wrapper.being-dragged {
  opacity: 0.7;
  transform: scale(0.98) rotate(1deg);
  z-index: 1000;
  background: rgba(0, 0, 0, 0.02);
  border: 2px dashed rgba(59, 130, 246, 0.5);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Drop target visual feedback */
.widget-wrapper.drag-over {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.6);
  border-radius: 8px;
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
}

/* Enhanced drag hover effect - only transform, no shadow conflicts */
.widget-wrapper.draggable:hover:not(.being-dragged):not(.drag-over) {
  transform: translateY(-2px) scale(1.01);
}

/* Grid drag active state */
.widget-grid.drag-active {
  background: rgba(59, 130, 246, 0.03);
  border: 2px dashed rgba(59, 130, 246, 0.4);
  border-radius: 12px;
  padding: 8px;
}

/* Enhanced drag over visual feedback */
.widget-wrapper.drag-over {
  background: rgba(59, 130, 246, 0.1);
  border: 2px solid rgba(59, 130, 246, 0.8);
  border-radius: 8px;
  transform: scale(1.02);
  box-shadow: 0 8px 25px rgba(59, 130, 246, 0.3);
  position: relative;
}

/* Add visual drop indicator */
.widget-wrapper.drag-over::before {
  content: '';
  position: absolute;
  top: -4px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 4px;
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent);
  border-radius: 2px;
  animation: drop-indicator-pulse 1.5s ease-in-out infinite;
}

.widget-wrapper.drag-over::after {
  content: 'Drop here';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(59, 130, 246, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
  z-index: 10;
  animation: drop-text-pulse 1.5s ease-in-out infinite;
}

@keyframes drop-indicator-pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: translateX(-50%) scaleX(1);
  }
  50% {
    opacity: 1;
    transform: translateX(-50%) scaleX(1.1);
  }
}

@keyframes drop-text-pulse {
  0%,
  100% {
    opacity: 0.8;
    transform: translate(-50%, -50%) scale(1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1.05);
  }
}

/* Drop zone overlays */
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
  background: hsl(var(--widget-active) / 0.25);
  border-color: hsl(var(--widget-active) / 0.8);
  box-shadow:
    0 0 0 4px hsl(var(--widget-active) / 0.6),
    0 0 30px hsl(var(--widget-active) / 0.7);
  outline: 4px solid hsl(var(--widget-active) / 1);
  outline-offset: 2px;
  animation: overlay-pulse 1s ease-in-out infinite;
  z-index: 1001;
}

/* End drop zone */
.drop-zone-end {
  min-height: 80px;
  border: 2px dashed rgba(156, 163, 175, 0.3);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.drop-zone-end.drag-over {
  background: hsl(var(--widget-active) / 0.25);
  border-color: hsl(var(--widget-active) / 0.8);
  box-shadow:
    0 0 0 4px hsl(var(--widget-active) / 0.6),
    0 0 30px hsl(var(--widget-active) / 0.7);
  outline: 4px solid hsl(var(--widget-active) / 1);
  outline-offset: 2px;
}

.drop-zone-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.drop-zone-line {
  width: 60%;
  height: 3px;
  background: linear-gradient(90deg, transparent, rgba(156, 163, 175, 0.5), transparent);
  border-radius: 2px;
  transition: all 0.2s ease;
}

.drop-zone-end.drag-over .drop-zone-line {
  background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.8), transparent);
  animation: drop-zone-pulse 1s ease-in-out infinite;
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

.drop-zone-end-text {
  background: hsl(var(--secondary));
  color: hsl(var(--secondary-foreground));
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  animation: drop-text-appear 0.2s ease-out;
  pointer-events: none;
  z-index: 10;
  box-shadow: 0 2px 8px hsl(var(--foreground) / 0.1);
  border: 1px solid hsl(var(--border));
}

@keyframes drop-zone-pulse {
  0%,
  100% {
    opacity: 0.6;
    transform: scaleX(1);
  }
  50% {
    opacity: 1;
    transform: scaleX(1.1);
  }
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

@keyframes overlay-pulse {
  0%,
  100% {
    box-shadow:
      inset 0 0 20px hsl(var(--primary) / 0.1),
      0 4px 12px hsl(var(--primary) / 0.08);
  }
  50% {
    box-shadow:
      inset 0 0 30px hsl(var(--primary) / 0.2),
      0 6px 18px hsl(var(--primary) / 0.15);
  }
}

/* Hide non-dragged widgets during drag for clarity */
.widget-wrapper.hidden-during-drag {
  opacity: 0.5;
  transform: scale(0.98);
  pointer-events: none;
  filter: grayscale(0.3);
  transition: all 0.3s ease;
}

/* Widgets that are shifting should be more visible than fully hidden widgets */
.widget-wrapper.hidden-during-drag[style*='translateX'] {
  opacity: 0.8;
  filter: grayscale(0.1);
}
</style>
