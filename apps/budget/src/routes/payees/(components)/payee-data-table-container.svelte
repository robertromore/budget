<script lang="ts">
import { browser } from '$app/environment';
import { Skeleton } from '$lib/components/ui/skeleton';
import type { Payee } from '$lib/schema';
import { columns } from '../(data)/columns.svelte';
import PayeeDataTable from './payee-data-table.svelte';

interface Props {
  isLoading: boolean;
  payees: Payee[];
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
  onBulkDelete: (payees: Payee[]) => void;
  table?: any;
}

let {
  isLoading = false,
  payees = [],
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  onBulkDelete,
  table = $bindable(),
}: Props = $props();

// Create columns with action handlers
const tableColumns = $derived(columns({ onView, onEdit, onDelete, onViewAnalytics }));
</script>

{#if isLoading}
  <!-- Loading state: Show skeleton while fetching data -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{:else if browser}
  <!-- Show the data table -->
  <PayeeDataTable
    columns={tableColumns}
    {payees}
    {onBulkDelete}
    bind:table />
{:else}
  <!-- Fallback loading state -->
  <div class="space-y-4">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-[500px] w-full" />
  </div>
{/if}
