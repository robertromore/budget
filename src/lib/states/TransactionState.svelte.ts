import type { TransactionsFormat } from '$lib/components/types';
import { transactionFormatter } from '$lib/helpers/formatters';
import type {
  InsertTransactionSchema,
  RemoveTransactionSchema,
  Transaction,
  insertTransactionSchema,
  removeTransactionsSchema,
} from '$lib/schema';
import { getContext, setContext } from 'svelte';
import { writable, type Writable } from 'svelte/store';
import type { Infer, SuperValidated } from 'sveltekit-superforms';

type SetTransactionState = {
  transactions: Transaction[];
  formatted?: TransactionsFormat[];
  writableStore?: Writable<TransactionsFormat[]>;
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>>;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>>;
};

export class TransactionState {
  transactions: Transaction[] = $state() as Transaction[];
  formatted: TransactionsFormat[] = $state() as TransactionsFormat[];
  writableStore: Writable<TransactionsFormat[]> = $state() as Writable<TransactionsFormat[]>;
  manageTransactionForm: SuperValidated<Infer<InsertTransactionSchema>> = $state() as SuperValidated<
    Infer<typeof insertTransactionSchema>
  >;
  deleteTransactionForm: SuperValidated<Infer<RemoveTransactionSchema>> =
    $state() as SuperValidated<Infer<typeof removeTransactionsSchema>>;

  constructor(init: SetTransactionState) {
    this.transactions = init.transactions;
    this.formatted = transactionFormatter(this.transactions);
    this.writableStore = writable(this.formatted);
    this.manageTransactionForm = init.manageTransactionForm;
    this.deleteTransactionForm = init.deleteTransactionForm;
  }
}

const Transaction_CTX = Symbol("Transaction_ctx");

export function setTransactionState(init: SetTransactionState) {
  const transactionState = new TransactionState(init);
  setContext<TransactionState>(Transaction_CTX, transactionState);
  return transactionState;
}

export function getTransactionState() {
  return getContext<TransactionState>(Transaction_CTX);
}
