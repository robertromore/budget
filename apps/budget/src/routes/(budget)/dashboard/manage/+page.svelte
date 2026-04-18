<script lang="ts">
import { rpc } from '$lib/query';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import * as Card from '$lib/components/ui/card';
import { Switch } from '$lib/components/ui/switch';
import type { DashboardWithWidgets } from '$core/schema/dashboards';
import ConfirmDialog from '$lib/components/dashboard/confirm-dialog.svelte';
import {
  DndContext,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit-svelte/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit-svelte/sortable';
import SortableItem from './sortable-dashboard-card.svelte';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import Copy from '@lucide/svelte/icons/copy';
import GripVertical from '@lucide/svelte/icons/grip-vertical';
import LayoutDashboard from '@lucide/svelte/icons/layout-dashboard';
import LayoutGrid from '@lucide/svelte/icons/layout-grid';
import Plus from '@lucide/svelte/icons/plus';
import Star from '@lucide/svelte/icons/star';
import Trash2 from '@lucide/svelte/icons/trash-2';

const dashboardsQuery = rpc.dashboards.listAllDashboards().options();
const dashboards = $derived((dashboardsQuery.data ?? []) as DashboardWithWidgets[]);
const dashboardIds = $derived(dashboards.map((d) => d.id));

const templatesQuery = rpc.dashboards.getTemplates().options();
const templates = $derived(templatesQuery.data ?? []);

let showTemplates = $state(false);
let deleteDialogOpen = $state(false);
let pendingDeleteId = $state<number | null>(null);

const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
);

async function handleDragEnd(event: DragEndEvent) {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = dashboards.findIndex((d) => d.id === active.id);
  const newIndex = dashboards.findIndex((d) => d.id === over.id);
  if (oldIndex === -1 || newIndex === -1) return;

  const newOrder = arrayMove(dashboardIds, oldIndex, newIndex);
  await rpc.dashboards.reorderDashboards.execute({ dashboardIds: newOrder });
}

async function handleToggleEnabled(id: number) {
  await rpc.dashboards.toggleDashboardEnabled.execute({ id });
}

async function handleSetDefault(id: number) {
  await rpc.dashboards.setDefaultDashboard.execute({ id });
}

function handleRemove(id: number) {
  pendingDeleteId = id;
  deleteDialogOpen = true;
}

async function confirmRemove() {
  if (pendingDeleteId === null) return;
  await rpc.dashboards.removeDashboard.execute({ id: pendingDeleteId });
  pendingDeleteId = null;
}

async function handleClone(id: number) {
  await rpc.dashboards.cloneDashboard.execute({ id });
}

async function handleCreateFromTemplate(templateId: string) {
  await rpc.dashboards.createFromTemplate.execute({ templateId });
  showTemplates = false;
}

async function handleCreateBlank() {
  await rpc.dashboards.saveDashboard.execute({
    name: 'New Dashboard',
    slug: 'new-dashboard',
    layout: { columns: 4, gap: 'normal' },
  });
  showTemplates = false;
}
</script>

<svelte:head>
  <title>Manage Dashboards - Budget App</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-3">
      <Button variant="outline" size="icon" href="/">
        <ArrowLeft class="h-4 w-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Manage Dashboards</h1>
        <p class="text-muted-foreground text-sm">Create, configure, and organize your dashboards</p>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <Button variant="outline" href="/dashboard/groups">
        <LayoutGrid class="mr-1.5 h-4 w-4" />
        Widget Groups
      </Button>
      <Button onclick={() => (showTemplates = !showTemplates)}>
        <Plus class="mr-1.5 h-4 w-4" />
        New Dashboard
      </Button>
    </div>
  </div>

  {#if showTemplates}
    <Card.Root>
      <Card.Header>
        <Card.Title>Choose a Template</Card.Title>
        <Card.Description>Start from a pre-built layout or create a blank dashboard</Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <button
            class="hover:bg-accent rounded-lg border border-dashed p-4 text-left transition-colors"
            onclick={handleCreateBlank}>
            <div class="flex items-center gap-2">
              <Plus class="text-muted-foreground h-5 w-5" />
              <span class="font-medium">Blank</span>
            </div>
            <p class="text-muted-foreground mt-1 text-xs">Start with an empty dashboard</p>
            <Badge variant="outline" class="mt-2 text-xs">0 widgets</Badge>
          </button>
          {#each templates as template}
            <button
              class="hover:bg-accent rounded-lg border p-4 text-left transition-colors"
              onclick={() => handleCreateFromTemplate(template.id)}>
              <div class="flex items-center gap-2">
                <LayoutDashboard class="text-primary h-5 w-5" />
                <span class="font-medium">{template.name}</span>
              </div>
              <p class="text-muted-foreground mt-1 text-xs">{template.description}</p>
              <Badge variant="outline" class="mt-2 text-xs">{template.widgetCount} widgets</Badge>
            </button>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if dashboardsQuery.isLoading}
    <p class="text-muted-foreground">Loading dashboards...</p>
  {:else if dashboards.length === 0}
    <div class="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed py-16">
      <LayoutDashboard class="text-muted-foreground h-12 w-12" />
      <p class="text-muted-foreground">No dashboards yet</p>
      <Button onclick={() => (showTemplates = true)}>Create Your First Dashboard</Button>
    </div>
  {:else}
    <DndContext
      {sensors}
      collisionDetection={rectIntersection}
      onDragEnd={handleDragEnd}>
      <SortableContext items={dashboardIds} strategy={rectSortingStrategy}>
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {#each dashboards as dashboard (dashboard.id)}
            <SortableItem id={dashboard.id}>
              {#snippet children({ dragHandleProps })}
                <Card.Root class={!dashboard.isEnabled ? 'opacity-50' : ''}>
                  <Card.Header class="flex flex-row items-start justify-between space-y-0">
                    <div class="flex min-w-0 flex-1 items-start gap-2">
                      <button
                        class="text-muted-foreground hover:text-foreground mt-0.5 cursor-grab active:cursor-grabbing"
                        {...dragHandleProps}>
                        <GripVertical class="h-4 w-4" />
                      </button>
                      <div class="min-w-0 flex-1">
                        <Card.Title class="flex items-center gap-2">
                          <a href="/dashboard/{dashboard.slug}" class="hover:underline">
                            {dashboard.name}
                          </a>
                          {#if dashboard.isDefault}
                            <Star class="h-4 w-4 shrink-0 fill-yellow-400 text-yellow-400" />
                          {/if}
                        </Card.Title>
                        {#if dashboard.description}
                          <Card.Description class="mt-1">{dashboard.description}</Card.Description>
                        {/if}
                      </div>
                    </div>
                    <Switch
                      checked={dashboard.isEnabled}
                      onCheckedChange={() => handleToggleEnabled(dashboard.id)} />
                  </Card.Header>
                  <Card.Content>
                    <div class="flex items-center gap-2">
                      <Badge variant="secondary">{dashboard.widgets.length} widgets</Badge>
                      {#if dashboard.layout}
                        <Badge variant="outline">{dashboard.layout.columns} cols</Badge>
                      {/if}
                    </div>
                  </Card.Content>
                  <Card.Footer class="flex justify-between">
                    <div class="flex gap-1">
                      {#if !dashboard.isDefault}
                        <Button variant="ghost" size="sm" onclick={() => handleSetDefault(dashboard.id)}>
                          <Star class="mr-1 h-3.5 w-3.5" />
                          Default
                        </Button>
                      {/if}
                      <Button variant="ghost" size="sm" onclick={() => handleClone(dashboard.id)}>
                        <Copy class="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {#if !dashboard.isDefault}
                      <Button
                        variant="ghost"
                        size="icon"
                        class="text-destructive h-7 w-7"
                        onclick={() => handleRemove(dashboard.id)}>
                        <Trash2 class="h-3.5 w-3.5" />
                      </Button>
                    {/if}
                  </Card.Footer>
                </Card.Root>
              {/snippet}
            </SortableItem>
          {/each}
        </div>
      </SortableContext>
    </DndContext>
  {/if}
</div>

<ConfirmDialog
  bind:open={deleteDialogOpen}
  title="Delete Dashboard"
  description="This dashboard and all its widgets will be permanently removed."
  confirmLabel="Delete"
  onConfirm={confirmRemove} />
