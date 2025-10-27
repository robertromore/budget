<script lang="ts">
import {EntitySearchResults} from '$lib/components/shared/search';
import * as Card from '$lib/components/ui/card';
import {Button} from '$lib/components/ui/button';
import {Badge} from '$lib/components/ui/badge';
import {Separator} from '$lib/components/ui/separator';
import {currencyFormatter, recurringFormatter} from '$lib/utils/formatters';
import Calendar from '@lucide/svelte/icons/calendar';
import Clock from '@lucide/svelte/icons/clock';
import DollarSign from '@lucide/svelte/icons/dollar-sign';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash from '@lucide/svelte/icons/trash';
import RotateCw from '@lucide/svelte/icons/rotate-cw';
import Eye from '@lucide/svelte/icons/eye';
import type {Schedule} from '$lib/schema/schedules';
import type {SchedulesState} from '$lib/states/entities/schedules.svelte';
import type {ColumnDef} from '@tanstack/table-core';
import ScheduleDataTableContainer from '../schedule-data-table-container.svelte';

export type ViewMode = 'list' | 'grid';

interface Props {
  schedules: Schedule[];
  isLoading: boolean;
  searchQuery: string;
  viewMode?: ViewMode;
  schedulesState: SchedulesState;
  columns: (
    schedulesState: SchedulesState,
    onView: (schedule: Schedule) => void,
    onEdit: (schedule: Schedule) => void,
    onDelete: (schedule: Schedule) => void
  ) => ColumnDef<Schedule>[];
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onBulkDelete?: (schedules: Schedule[]) => void;
  table?: any;
}

let {
  schedules,
  isLoading,
  searchQuery,
  viewMode = 'grid',
  schedulesState,
  columns,
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  table = $bindable()
}: Props = $props();

// Helper function to format recurring pattern
function formatRecurringPattern(schedule: Schedule): string {
  if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) return 'One-time';

  return recurringFormatter.format(
    schedule.scheduleDate.frequency,
    schedule.scheduleDate.interval || 1
  );
}

// Helper function to format amount display
function formatAmount(schedule: Schedule): string {
  if (schedule.amount_type === 'range') {
    return `${currencyFormatter.format(schedule.amount)} - ${currencyFormatter.format(schedule.amount_2)}`;
  } else if (schedule.amount_type === 'approximate') {
    return `~${currencyFormatter.format(schedule.amount)}`;
  } else {
    return currencyFormatter.format(schedule.amount);
  }
}

// Helper function to get status color
function getStatusVariant(status: string | null) {
  return status === 'active' ? 'default' : 'secondary';
}
</script>

<EntitySearchResults
  entities={schedules}
  {isLoading}
  {searchQuery}
  {viewMode}
  emptyIcon={Calendar}
  emptyTitle="No schedules found"
  emptyDescription="Try adjusting your filters or search terms"
  {onView}
  {onEdit}
  {onDelete}
  onBulkDelete={onBulkDelete || (() => {})}
  gridColumns="grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {#snippet gridCard(schedule: Schedule)}
    <Card.Root class="hover:shadow-md transition-shadow relative">
      <div class="absolute top-3 right-3 z-10 flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          onclick={() => onView(schedule)}>
          <Eye class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8"
          onclick={() => onEdit(schedule)}>
          <SquarePen class="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="h-8 w-8 text-destructive"
          onclick={() => onDelete(schedule)}>
          <Trash class="h-4 w-4" />
        </Button>
      </div>

      <Card.Header class="pb-3 pr-24">
        <div class="flex-1">
          <Card.Title class="text-lg">{schedule.name}</Card.Title>
          <div class="flex items-center gap-2 mt-1 flex-wrap">
            <Badge variant={getStatusVariant(schedule.status)}>
              {schedule.status}
            </Badge>
            {#if schedule.scheduleDate}
              <Badge variant="outline" class="text-xs">
                <RotateCw class="h-3 w-3 mr-1" />
                Recurring
              </Badge>
            {/if}
            {#if schedule.auto_add}
              <Badge variant="outline" class="text-xs bg-blue-50 dark:bg-blue-950">
                Auto-Add
              </Badge>
            {/if}
          </div>
        </div>
      </Card.Header>

      <Card.Content class="pt-0">
        <div class="space-y-3">
          <!-- Amount Display -->
          <div class="flex items-center gap-2">
            <DollarSign class="h-4 w-4 text-muted-foreground" />
            <span class="font-semibold text-lg">{formatAmount(schedule)}</span>
            {#if schedule.amount_type !== 'exact'}
              <Badge variant="outline" class="text-xs">{schedule.amount_type}</Badge>
            {/if}
          </div>

          <Separator />

          <!-- Recurring Pattern -->
          <div class="flex items-center gap-2 text-sm">
            <Clock class="h-4 w-4 text-muted-foreground" />
            <span>{formatRecurringPattern(schedule)}</span>
          </div>

          <!-- Related Entities -->
          {#if schedule.payee}
            <div class="text-xs text-muted-foreground">
              Payee: <span class="font-medium">{schedule.payee.name}</span>
            </div>
          {/if}

          {#if schedule.account}
            <div class="text-xs text-muted-foreground">
              Account: <span class="font-medium">{schedule.account.name}</span>
            </div>
          {/if}

          {#if schedule.scheduleDate}
            <div class="text-xs text-muted-foreground">
              Started: {new Date(schedule.scheduleDate.start).toLocaleDateString()}
              {#if schedule.scheduleDate.end}
                • Ends: {new Date(schedule.scheduleDate.end).toLocaleDateString()}
              {/if}
            </div>
          {/if}
        </div>
      </Card.Content>
    </Card.Root>
  {/snippet}

  {#snippet listView()}
    <ScheduleDataTableContainer
      {isLoading}
      {schedules}
      {schedulesState}
      {columns}
      {onView}
      {onEdit}
      {onDelete}
      onBulkDelete={onBulkDelete || (() => {})}
      bind:table
    />
  {/snippet}
</EntitySearchResults>
