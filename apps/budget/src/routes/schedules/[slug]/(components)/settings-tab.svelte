<script lang="ts">
import * as Card from '$lib/components/ui/card';
import { Button } from '$lib/components/ui/button';
import { Badge } from '$lib/components/ui/badge';
import { Separator } from '$lib/components/ui/separator';
import type { PageData } from '../$types';

// Icons
import Settings from '@lucide/svelte/icons/settings';
import Activity from '@lucide/svelte/icons/activity';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Pause from '@lucide/svelte/icons/pause';
import Play from '@lucide/svelte/icons/play';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import Trash from '@lucide/svelte/icons/trash';
import Plus from '@lucide/svelte/icons/plus';

let {
  schedule,
  statistics,
  isExecutingAutoAdd,
  executeAutoAdd,
  editSchedule,
  toggleStatus,
  deleteSchedule,
  duplicateSchedule,
}: {
  schedule: PageData['schedule'];
  statistics: PageData['statistics'];
  isExecutingAutoAdd: boolean;
  executeAutoAdd: () => void;
  editSchedule: () => void;
  toggleStatus: () => void;
  deleteSchedule: () => void;
  duplicateSchedule: () => void;
} = $props();
</script>

{#if schedule}
  <div class="space-y-4">
    <div class="grid gap-3 md:grid-cols-2">
      <!-- Schedule Configuration -->
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-sm">
            <Settings class="h-4 w-4" />
            Schedule Configuration
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2 pt-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Name</span>
              <span class="text-sm font-medium">{schedule.name}</span>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Slug</span>
              <span class="font-mono text-xs">{schedule.slug}</span>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Auto Add</span>
              <Badge variant={schedule.auto_add ? 'default' : 'secondary'} class="text-xs">
                {schedule.auto_add ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Recurring</span>
              <Badge variant={schedule.recurring ? 'default' : 'secondary'} class="text-xs">
                {schedule.recurring ? 'Yes' : 'No'}
              </Badge>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- System Information -->
      <Card.Root>
        <Card.Header class="pb-2">
          <Card.Title class="flex items-center gap-2 text-sm">
            <Activity class="h-4 w-4" />
            System Information
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-2 pt-2">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Created</span>
              <span class="text-sm font-medium">
                {new Date(schedule.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Last Updated</span>
              <span class="text-sm font-medium">
                {new Date(schedule.updatedAt).toLocaleDateString()}
              </span>
            </div>
            <Separator />
            <div class="flex items-center justify-between">
              <span class="text-muted-foreground text-xs">Schedule ID</span>
              <span class="font-mono text-xs">{schedule.id}</span>
            </div>
            {#if statistics.lastExecuted}
              <Separator />
              <div class="flex items-center justify-between">
                <span class="text-muted-foreground text-xs">Last Executed</span>
                <span class="text-sm font-medium">{statistics.lastExecuted}</span>
              </div>
            {/if}
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Actions -->
    <Card.Root>
      <Card.Header class="pb-2">
        <Card.Title class="text-sm">Actions</Card.Title>
        <Card.Description class="text-xs">Manage this schedule</Card.Description>
      </Card.Header>
      <Card.Content class="pt-2">
        <div class="flex flex-wrap gap-2">
          {#if schedule.status === 'active' && schedule.auto_add && schedule.scheduleDate}
            <Button
              size="sm"
              variant="outline"
              onclick={executeAutoAdd}
              disabled={isExecutingAutoAdd}>
              <Plus class="mr-1 h-3 w-3" />
              {isExecutingAutoAdd ? 'Creating...' : 'Auto-Add'}
            </Button>
          {/if}
          <Button size="sm" onclick={editSchedule}>
            <SquarePen class="mr-1 h-3 w-3" />
            Edit
          </Button>
          <Button size="sm" variant="outline" onclick={toggleStatus}>
            {#if schedule.status === 'active'}
              <Pause class="mr-1 h-3 w-3" />
              Pause
            {:else}
              <Play class="mr-1 h-3 w-3" />
              Activate
            {/if}
          </Button>
          <Button size="sm" variant="outline" onclick={duplicateSchedule}>
            <RotateCw class="mr-1 h-3 w-3" />
            Duplicate
          </Button>
          <Button size="sm" variant="outline">
            <TrendingUp class="mr-1 h-3 w-3" />
            Export
          </Button>
          <Button size="sm" variant="outline" class="text-destructive" onclick={deleteSchedule}>
            <Trash class="mr-1 h-3 w-3" />
            Delete
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  </div>
{/if}
