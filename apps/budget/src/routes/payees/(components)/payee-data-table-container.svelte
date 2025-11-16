<script lang="ts">
import type {Payee} from '$lib/schema';
import type {PayeesState} from '$lib/states/entities/payees.svelte';
import type {ColumnDef, Table} from '@tanstack/table-core';
import PayeeDataTable from './payee-data-table.svelte';
import {Skeleton} from '$lib/components/ui/skeleton';
import {browser} from '$app/environment';

interface Props {
  isLoading: boolean;
  payees: Payee[];
  columns: (
    payeesState: PayeesState,
    onView: (payee: Payee) => void,
    onEdit: (payee: Payee) => void,
    onDelete: (payee: Payee) => void,
    onViewAnalytics: (payee: Payee) => void
  ) => ColumnDef<Payee>[];
  payeesState: PayeesState;
  onView: (payee: Payee) => void;
  onEdit: (payee: Payee) => void;
  onDelete: (payee: Payee) => void;
  onViewAnalytics: (payee: Payee) => void;
  onBulkDelete: (payees: Payee[]) => void;
  table?: Table<Payee> | undefined;
}

let {
  isLoading,
  payees,
  columns,
  payeesState,
  onView,
  onEdit,
  onDelete,
  onViewAnalytics,
  onBulkDelete,
  table = $bindable(),
}: Props = $props();
</script>

{#if isLoading}
  <div class="space-y-3">
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-10 w-full" />
    <Skeleton class="h-10 w-full" />
  </div>
{:else if browser && payeesState}
  <PayeeDataTable
    {columns}
    {payees}
    {payeesState}
    {onView}
    {onEdit}
    {onDelete}
    {onViewAnalytics}
    {onBulkDelete}
    bind:table />
{/if}
