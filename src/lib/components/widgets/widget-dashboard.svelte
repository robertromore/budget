<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
  import { widgetStore } from '$lib/stores/widgets.svelte';
  import Plus from '@lucide/svelte/icons/plus';
  import Settings from '@lucide/svelte/icons/settings';
  import { SortableList, sortItems } from '@rodrigodagostino/svelte-sortable-list';
  import { getWidgetComponent } from './widget-registry';

  let {
    accountId,
    transactions,
    summary
  }: {
    accountId: number;
    transactions: any[];
    summary: any;
  } = $props();

  // Calculate widget data
  const widgetData = $derived(() => {
    return widgetStore.calculateWidgetData(accountId, transactions, summary);
  });

  const enabledWidgets = $derived(widgetStore.enabledWidgets);
  const availableWidgets = $derived(widgetStore.availableWidgets);
  const isEditMode = $derived(widgetStore.isEditMode);

  function handleWidgetUpdate(widgetId: string, updates: any) {
    widgetStore.updateWidget(widgetId, updates);
  }

  function handleWidgetRemove(widgetId: string) {
    widgetStore.removeWidget(widgetId);
  }

  function handleAddWidget(widgetType: string) {
    widgetStore.addWidget(widgetType);
  }

  function handleDragEnd(event: CustomEvent) {
    const { draggedItemIndex, targetItemIndex, isCanceled } = event;
    
    if (!isCanceled && typeof targetItemIndex === 'number' && draggedItemIndex !== targetItemIndex) {
      const newOrder = sortItems(enabledWidgets, draggedItemIndex, targetItemIndex);
      widgetStore.reorderWidgets(newOrder.map(w => w.id));
    }
  }

</script>

<div class="space-y-4">
  <!-- Dashboard Controls -->
  <div class="flex items-center justify-between">
    <h2 class="text-lg font-semibold">Dashboard</h2>
    <div class="flex items-center gap-2">
      <!-- Add Widget Dropdown -->
      {#if isEditMode && availableWidgets.length > 0}
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>
            <Button variant="outline" size="sm">
              <Plus class="size-4 mr-1" />
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
                  <div class="text-xs text-muted-foreground">{widget.description}</div>
                </div>
              </DropdownMenu.Item>
            {/each}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      {/if}

      <!-- Customize Button -->
      <Button
        variant={isEditMode ? "default" : "outline"}
        size="sm"
        onclick={() => widgetStore.toggleEditMode()}
      >
        <Settings class="size-4 mr-1" />
        {isEditMode ? 'Done' : 'Customize'}
      </Button>

      {#if isEditMode}
        <Button
          variant="ghost"
          size="sm"
          onclick={() => widgetStore.resetToDefaults()}
        >
          Reset
        </Button>
      {/if}
    </div>
  </div>

  <!-- Widget Grid -->
  <div class="widget-grid">
    {#if isEditMode}
      <SortableList.Root ondragend={handleDragEnd} class="contents">
        {#each enabledWidgets as widget, index (widget.id)}
          {@const WidgetComponent = getWidgetComponent(widget.type)}
          <SortableList.Item id={widget.id} {index} class="contents">
            <WidgetComponent
              config={widget}
              data={widgetData}
              editMode={isEditMode}
              onUpdate={(updates) => handleWidgetUpdate(widget.id, updates)}
              onRemove={() => handleWidgetRemove(widget.id)}
            />
          </SortableList.Item>
        {/each}
      </SortableList.Root>

      <!-- Add Widget Placeholder in Edit Mode -->
      {#if availableWidgets.length > 0}
        <div class="rounded-lg border-2 border-dashed border-gray-300 p-4 flex flex-col items-center justify-center min-h-[100px] text-muted-foreground hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <DropdownMenu.Root>
            <DropdownMenu.Trigger class="w-full h-full flex flex-col items-center justify-center">
              <Plus class="size-6 mb-2" />
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
                    <div class="text-xs text-muted-foreground">{widget.description}</div>
                  </div>
                </DropdownMenu.Item>
              {/each}
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      {/if}
    {:else}
      {#each enabledWidgets as widget (widget.id)}
        {@const WidgetComponent = getWidgetComponent(widget.type)}
        <WidgetComponent
          config={widget}
          data={widgetData}
          editMode={isEditMode}
          onUpdate={(updates) => handleWidgetUpdate(widget.id, updates)}
          onRemove={() => handleWidgetRemove(widget.id)}
        />
      {/each}
    {/if}
  </div>

  <!-- Edit Mode Help -->
  {#if isEditMode}
    <div class="text-sm text-muted-foreground bg-blue-50 p-3 rounded-lg">
      <strong>Edit Mode:</strong> Drag widgets to reorder them. Click the menu (⋮) on each widget to resize or remove it.
      Use "Add Widget" to add new widgets to your dashboard.
    </div>
  {/if}
</div>

<style>
  .widget-grid {
    display: grid;
    grid-template-columns: repeat(1, 1fr);
    gap: 1rem;
  }

  @media (min-width: 768px) {
    .widget-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  @media (min-width: 1024px) {
    .widget-grid {
      grid-template-columns: repeat(5, 1fr);
    }
  }

  /* Clean sortable styling */
  .widget-grid :global([data-sortable-list-item]) {
    cursor: grab;
    transition: all 0.2s ease;
    border-radius: 0.5rem;
  }

  .widget-grid :global([data-sortable-list-item]:hover) {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .widget-grid :global([data-sortable-list-item][data-sortable-list-dragging="true"]) {
    cursor: grabbing;
    opacity: 0.8;
    transform: rotate(2deg) scale(0.98);
    z-index: 1000;
  }
</style>
