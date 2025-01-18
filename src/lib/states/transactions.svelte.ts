import type { TransactionsFormat } from '$lib/components/types';
import { transactionFormatter } from '$lib/helpers/formatters';
import type {
  InsertTransactionSchema,
  RemoveTransactionSchema,
  Transaction,
  insertTransactionSchema,
  removeTransactionsSchema
} from '$lib/schema';
import { trpc } from '$lib/trpc/client';
import { without } from '$lib/utils';
import { getContext, setContext } from 'svelte';
import type { Infer, SuperValidated } from 'sveltekit-superforms';

type SetTransactionState = {
  transactions: Transaction[];
  formatted: TransactionsFormat[];
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>>;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>>;
};

export class TransactionsState {
  transactions: Transaction[] = $state() as Transaction[];
  formatted?: TransactionsFormat[] = $derived(transactionFormatter.format(this.transactions));
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>> =
    $state() as SuperValidated<Infer<typeof insertTransactionSchema>>;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>> =
    $state() as SuperValidated<Infer<typeof removeTransactionsSchema>>;

  addTransaction(transaction: Transaction) {
    this.transactions?.push(transaction);
  }

  async deleteTransactions(
    accountId: number,
    transactions: number[],
    cb?: (id: Transaction[]) => void
  ) {
    await trpc().transactionRoutes.delete.mutate({
      entities: transactions,
      accountId
    });
    const removed = without(this.transactions ?? [], (transaction: Transaction) =>
      transactions.includes(transaction.id)
    );
    if (cb) {
      cb(removed);
    }
  }

  async deleteTransaction(accountId: number, transaction: number) {
    return this.deleteTransactions(accountId, [transaction]);
  }

  constructor(init: SetTransactionState) {
    this.transactions = init.transactions;
    // this.formatted = transactionFormatter(this.transactions);
    this.manageTransactionForm = init.manageTransactionForm;
    this.deleteTransactionForm = init.deleteTransactionForm;
    // $effect(() => {
    //   this.formatted = transactionFormatter(this.transactions);
    // });
  }

  sortedAmounts() {
    return (this.transactions ?? [])
      .map((transaction: Transaction) => transaction.amount)
      .sort((a, b) => (a || 0) - (b || 0));
  }

  minAmount() {
    return Math.floor(this.sortedAmounts()[0] || 0);
  }

  maxAmount() {
    const sorted = this.sortedAmounts();
    return Math.ceil(sorted[sorted.length - 1] || 0);
  }
}

const Transaction_CTX = Symbol('Transaction_ctx');

export function setTransactionState(init: SetTransactionState) {
  const transactionState = new TransactionState(init);
  setContext<TransactionState>(Transaction_CTX, transactionState);
  return transactionState;
}

export function getTransactionState() {
  return getContext<TransactionState>(Transaction_CTX);
}
