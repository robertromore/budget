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
  formatted?: TransactionsFormat[];
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>>;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>>;
};

export class TransactionState {
  transactions: Transaction[] = $state() as Transaction[];
  formatted: TransactionsFormat[] = $state() as TransactionsFormat[];
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>> =
    $state() as SuperValidated<Infer<typeof insertTransactionSchema>>;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>> =
    $state() as SuperValidated<Infer<typeof removeTransactionsSchema>>;

  addTransaction(transaction: Transaction) {
    this.transactions.push(transaction);
  }

  async deleteTransactions(accountId: number, transactions: number[], cb?: (id: Payee[]) => void) {
    // eslint-disable-next-line drizzle/enforce-delete-with-where
    await trpc().transactionRoutes.delete.mutate({
      entities: transactions,
      accountId
    });
    const removed = without(this.transactions, (transaction: Transaction) =>
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
    this.formatted = transactionFormatter(this.transactions);
    this.manageTransactionForm = init.manageTransactionForm;
    this.deleteTransactionForm = init.deleteTransactionForm;
    $effect(() => {
      this.formatted = transactionFormatter(this.transactions);
    });
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
