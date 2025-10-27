<script lang="ts">
import {browser} from '$app/environment';
import type {Schedule} from '$lib/schema/schedules';
import type {SchedulesState} from '$lib/states/entities/schedules.svelte';
import type {ColumnDef} from '@tanstack/table-core';
import ScheduleDataTable from './schedule-data-table.svelte';
import {Skeleton} from '$lib/components/ui/skeleton';

interface Props {
  isLoading: boolean;
  schedules: Schedule[];
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
  onBulkDelete: (schedules: Schedule[]) => void;
  table?: any;
}

let {
  isLoading = false,
  schedules = [],
  schedulesState,
  columns,
  onView,
  onEdit,
  onDelete,
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
{:else if browser && schedulesState}
  <!-- Show the data table -->
  <ScheduleDataTable
    {columns}
    {schedules}
    {onView}
    {onEdit}
    {onDelete}
    {onBulkDelete}
    {schedulesState}
    bind:table />
{:else}
  <!-- Fallback loading state -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{/if}
