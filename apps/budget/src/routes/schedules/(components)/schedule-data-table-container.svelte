<script lang="ts">
import { browser } from '$app/environment';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { Schedule } from '$lib/schema/schedules';
import { columns } from '../(data)/columns.svelte';
import ScheduleDataTable from './schedule-data-table.svelte';

interface Props {
  isLoading: boolean;
  schedules: Schedule[];
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onBulkDelete: (schedules: Schedule[]) => void;
  table?: any;
}

let {
  isLoading = false,
  schedules = [],
  onView,
  onEdit,
  onDelete,
  onBulkDelete,
  table = $bindable(),
}: Props = $props();

// Create columns with action handlers
const tableColumns = $derived(columns({ onView, onEdit, onDelete }));
</script>

{#if isLoading}
  <!-- Loading state: Show skeleton while fetching data -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{:else if browser}
  <!-- Show the data table -->
  <ScheduleDataTable
    columns={tableColumns}
    {schedules}
    {onBulkDelete}
    bind:table />
{:else}
  <!-- Fallback loading state -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{/if}
