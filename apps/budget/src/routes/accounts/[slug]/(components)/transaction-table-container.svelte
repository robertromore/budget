<script lang="ts">
import {browser} from '$app/environment';
import {Input} from '$lib/components/ui/input';
import TransactionSkeleton from './transaction-skeleton.svelte';
import {DataTable} from '.';

let {
  isLoading = false,
  transactions = [],
  table = $bindable(),
  categoriesState = null,
  payeesState = null,
  views = [],
  columns,
  formattedTransactions,
  updateTransactionData,
  searchTransactions,
  onScheduleClick,
  budgetCount = 0,
  onBulkDelete,
}: {
  isLoading: boolean;
  transactions: any[];
  table: any;
  categoriesState: any;
  payeesState: any;
  views: any[];
  columns: any;
  formattedTransactions: any[];
  updateTransactionData?: (
    transactionId: number,
    columnId: string,
    newValue?: unknown
  ) => Promise<void>;
  searchTransactions?: (query: string) => void;
  onScheduleClick?: (transaction: any) => void;
  budgetCount?: number;
  onBulkDelete?: (transactions: any[]) => void;
} = $props();
</script>

{#if isLoading}
  <!-- Loading state: Show skeleton while fetching data -->
  <TransactionSkeleton rows={10} />
{:else if browser && categoriesState && payeesState}
  <!-- Show the data table (with filtering controls) regardless of data presence -->
  <DataTable
    columns={columns(
      categoriesState,
      payeesState,
      updateTransactionData,
      onScheduleClick,
      budgetCount
    )}
    transactions={formattedTransactions}
    {views}
    {budgetCount}
    {onBulkDelete}
    bind:table />
{:else}
  <!-- Fallback loading state: Show skeleton if states aren't ready -->
  <TransactionSkeleton rows={10} />
{/if}
