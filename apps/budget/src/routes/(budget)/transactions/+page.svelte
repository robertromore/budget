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
import { parseDate } from '@internationalized/date';

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

// Format raw transactions into TransactionsFormat for the data-table.
// Workspace-scope: no running balance, no reconciliation markers — those are
// per-account concepts.
const formattedTransactions = $derived.by<TransactionsFormat[]>(() => {
  return transactions.map((t) => {
    const formatted: TransactionsFormat = {
      id: t.id ?? '',
      seq: (t as { seq?: number | null }).seq ?? null,
      date: parseDate(t.date),
      amount: t.amount,
      notes: t.notes,
      status: t.status as 'cleared' | 'pending' | 'scheduled' | null,
      accountId: t.accountId,
      payeeId: t.payee?.id ?? null,
      payee: t.payee ?? null,
      categoryId: t.category?.id ?? null,
      category: t.category ?? null,
      parentId: t.parentId ?? null,
      balance: null,
      budgetAllocations: t.budgetAllocations ?? [],
    };
    if (t.scheduleId !== undefined) formatted.scheduleId = t.scheduleId;
    if (t.scheduleName) formatted.scheduleName = t.scheduleName;
    if ((t as { isTransfer?: boolean | null }).isTransfer) {
      formatted.isTransfer = (t as { isTransfer?: boolean | null }).isTransfer;
    }
    if ((t as { transferId?: string | null }).transferId) {
      formatted.transferId = (t as { transferId?: string | null }).transferId;
    }
    return formatted;
  });
});

// Inline-edit handler — calls the existing updateTransaction mutation
const updateMutation = updateTransaction.options();
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

  await updateMutation.mutateAsync({ id: transactionId, data });
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
    {formattedTransactions}
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
