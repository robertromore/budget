<script lang="ts">
import type { Schedule } from '$lib/schema/schedules';
import { SchedulesState } from '$lib/states/entities/schedules.svelte';
import { columns } from '../(data)/schedule-columns.svelte';
import ScheduleDataTable from '../../../schedules/(components)/schedule-data-table.svelte';
import AccountSchedulesEmptyState from './account-schedules-empty-state.svelte';

interface Props {
  schedules: Schedule[];
  accountId: number;
  accountSlug: string;
  onView: (schedule: Schedule) => void;
  onEdit: (schedule: Schedule) => void;
  onDelete: (schedule: Schedule) => void;
  onBulkDelete: (schedules: Schedule[]) => void;
}

let { schedules, accountId, accountSlug, onView, onEdit, onDelete, onBulkDelete }: Props = $props();

const schedulesState = SchedulesState.get();
const columnDefs = $derived(columns(schedulesState!, onView, onEdit, onDelete));
</script>

{#if schedules.length === 0}
  <AccountSchedulesEmptyState {accountId} {accountSlug} />
{:else}
  <div class="space-y-4">
    <ScheduleDataTable
      columns={columnDefs}
      {schedules}
      {onBulkDelete} />
  </div>
{/if}
