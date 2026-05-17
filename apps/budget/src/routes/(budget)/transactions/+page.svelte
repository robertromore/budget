<script lang="ts">
import { TransactionTableContainer } from '$lib/components/transactions-table';
import { rpc } from '$lib/query';
import { updateTransaction, bulkDeleteTransactions } from '$core/query/transactions';
import { CategoriesState } from '$lib/states/entities/categories.svelte';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import type { Transaction } from '$core/schema';
import type { TransactionsFormat } from '$lib/types';
import type { Table as TTable } from '@tanstack/table-core';
import { columns as columnBuilder } from '../accounts/[slug]/(data)/columns.svelte';

// Pre-bind `includeAccountColumn=true` so the column-builder inserts
// an Account column (after Date) and hides Balance by default. The
// container calls this with its standard 7 args; we forward + append.
const accountColumns = (
  ...args: Parameters<typeof columnBuilder>
) => columnBuilder(args[0], args[1], args[2], args[3], args[4], args[5], args[6], true);

interface Props {
  data: import('./$types').PageData;
}

let { data }: Props = $props();

const categoriesState = $derived(CategoriesState.get());
const payeesState = $derived(PayeesState.get());

// Pagination state — server-paginated via getTransactionsList. The
// toolbar's faceted-filter chips (date, status, etc.) are applied
// client-side to the loaded page; the default "Last 90 Days" view
// pre-populates the date chip so users see/edit it.
let pageIndex = $state(0);
let pageSize = $state(100);

const listQuery = $derived(
  rpc.transactions
    .getTransactionsList(
      { sortBy: 'date', sortOrder: 'desc' },
      { page: pageIndex, pageSize }
    )
    .options()
);

const transactions = $derived((listQuery.data?.data ?? []) as Transaction[]);
const paginationInfo = $derived(listQuery.data?.pagination);
const isLoading = $derived(listQuery.isLoading);

// Inline-edit handler — calls the existing updateTransaction mutation
const updateMutation = updateTransaction.options();
// Fire-and-forget feedback hook for inline category edits. Feeds the
// smart-category drift signal so manual corrections count too.
const recordCorrectionMutation = rpc.payees.recordCategoryCorrection().options();
async function updateTransactionData(
  transactionId: number,
  columnId: string,
  newValue?: unknown
): Promise<void> {
  if (typeof transactionId !== 'number') return;
  const data: Record<string, unknown> = {};
  // Map column ids to update payload keys
  if (columnId === 'date') data.date = newValue as string;
  else if (columnId === 'amount') data.amount = newValue as number;
  else if (columnId === 'notes') data.notes = newValue as string;
  else if (columnId === 'payee') data.payeeId = (newValue as { id?: number } | null)?.id ?? null;
  else if (columnId === 'category')
    data.categoryId = (newValue as { id?: number } | null)?.id ?? null;
  else if (columnId === 'status') data.status = newValue as 'cleared' | 'pending' | 'scheduled';
  else return;

  // Capture the pre-edit state for feedback before the mutation fires.
  const preEdit =
    columnId === 'category'
      ? transactions.find((t) => t.id === transactionId)
      : undefined;

  await updateMutation.mutateAsync({ id: transactionId, data });

  if (columnId === 'category' && preEdit) {
    const newCategoryId = (newValue as { id?: number } | null)?.id;
    const payeeId = preEdit.payee?.id;
    if (typeof newCategoryId === 'number' && typeof payeeId === 'number') {
      const correction: {
        payeeId: number;
        transactionId: number;
        fromCategoryId?: number;
        toCategoryId: number;
        correctionTrigger: 'manual_user_correction';
        transactionAmount?: number;
        transactionDate?: string;
      } = {
        payeeId,
        transactionId,
        toCategoryId: newCategoryId,
        correctionTrigger: 'manual_user_correction',
      };
      if (preEdit.category?.id !== undefined) {
        correction.fromCategoryId = preEdit.category.id;
      }
      if (typeof preEdit.amount === 'number') {
        correction.transactionAmount = preEdit.amount;
      }
      if (typeof preEdit.date === 'string') {
        correction.transactionDate = preEdit.date;
      }
      recordCorrectionMutation.mutate(correction);
    }
  }
}

// Bulk delete via existing mutation
const bulkDeleteMutation = bulkDeleteTransactions.options();
async function handleBulkDelete(toDelete: TransactionsFormat[]): Promise<void> {
  const ids = toDelete
    .map((t) => t.id)
    .filter((id): id is number => typeof id === 'number');
  if (ids.length === 0) return;
  await bulkDeleteMutation.mutateAsync(ids);
}

// Bound table instance from the container
let table = $state<TTable<TransactionsFormat> | undefined>(undefined);

const serverPagination = $derived(
  paginationInfo
    ? {
        page: paginationInfo.page,
        pageSize: paginationInfo.pageSize,
        totalCount: paginationInfo.totalCount,
        totalPages: paginationInfo.totalPages,
      }
    : { page: 0, pageSize, totalCount: 0, totalPages: 0 }
);

function onPaginationChange(newPage: number, newPageSize: number) {
  pageIndex = newPage;
  pageSize = newPageSize;
}
</script>

<svelte:head>
  <title>Transactions - Budget App</title>
  <meta name="description" content="View and manage transactions across all accounts" />
</svelte:head>

<div class="space-y-6">
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div>
      <h1 class="text-2xl font-bold tracking-tight">Transactions</h1>
      <p class="text-muted-foreground text-sm">
        {(paginationInfo?.totalCount ?? 0).toLocaleString()} transaction{paginationInfo?.totalCount === 1
          ? ''
          : 's'} across all accounts
      </p>
    </div>
  </div>

  <TransactionTableContainer
    {isLoading}
    {transactions}
    balanceMode="null"
    views={data.views ?? []}
    columns={accountColumns}
    {categoriesState}
    {payeesState}
    {updateTransactionData}
    onBulkDelete={handleBulkDelete}
    {serverPagination}
    updatePagination={onPaginationChange}
    bind:table />
</div>
