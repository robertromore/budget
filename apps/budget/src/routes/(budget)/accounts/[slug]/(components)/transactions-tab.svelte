<!--
  Transactions Tab — wraps the data table + add-transaction dialog so
  the parent doesn't have to render this pair twice (once in the desktop
  Tabs.Content, once in the header-tabs fallback).
-->
<script lang="ts">
import { TransactionTableContainer, AddTransactionDialog } from '.';
import type { Account, Category, Payee, Transaction } from '$core/schema';
import type { CategoriesState } from '$lib/states/entities/categories.svelte';
import type { PayeesState } from '$lib/states/entities/payees.svelte';
import type { TransactionsFormat } from '$lib/types';
import type { Table as TanStackTable } from '@tanstack/table-core';

interface TransferAccount {
  id: number;
  name: string;
  accountType?: string | null;
}

interface AddDialogAccount {
  id: number;
  name: string;
}

let {
  isLoading,
  transactions,
  accountData,
  account,
  accountId,
  categoriesState,
  payeesState,
  payees,
  categories,
  views,
  columns,
  budgetCount,
  transferAccounts,
  table = $bindable<TanStackTable<TransactionsFormat> | undefined>(undefined),
  addDialogOpen = $bindable(false),
  updateTransactionData,
  searchTransactions,
  onScheduleClick,
  onBulkDelete,
  onTransferSelect,
  onSubmitTransaction,
}: {
  isLoading: boolean;
  transactions: Transaction[];
  accountData: Account | null | undefined;
  account: AddDialogAccount | null | undefined;
  accountId: number | undefined;
  categoriesState: CategoriesState | null;
  payeesState: PayeesState | null;
  payees: Payee[];
  categories: Category[];
  views: unknown[];
  columns: unknown;
  budgetCount: number;
  transferAccounts: TransferAccount[];
  table?: TanStackTable<TransactionsFormat> | undefined;
  addDialogOpen?: boolean;
  updateTransactionData?: (
    transactionId: number,
    columnId: string,
    newValue?: unknown
  ) => Promise<void>;
  searchTransactions?: (query: string) => void;
  onScheduleClick?: (transaction: TransactionsFormat) => void;
  onBulkDelete?: (transactions: TransactionsFormat[]) => void;
  onTransferSelect?: (transactionId: number, targetAccountId: number) => void;
  onSubmitTransaction: (formData: unknown) => Promise<void>;
} = $props();
</script>

<TransactionTableContainer
  {isLoading}
  transactions={Array.isArray(transactions) ? transactions : []}
  account={accountData}
  {categoriesState}
  {payeesState}
  {views}
  {columns}
  {updateTransactionData}
  {searchTransactions}
  {budgetCount}
  accountId={accountId ?? 0}
  {onScheduleClick}
  {onBulkDelete}
  {transferAccounts}
  {onTransferSelect}
  bind:table />

<AddTransactionDialog
  bind:open={addDialogOpen}
  account={account || null}
  payees={payees.map((p) => ({ id: p.id, name: p.name || 'Unknown Payee' }))}
  categories={categories.map((c) => ({ id: c.id, name: c.name || 'Unknown Category' }))}
  onSubmit={onSubmitTransaction} />
