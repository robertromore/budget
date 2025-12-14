import type { Category, Payee, Transaction } from "$lib/schema";
import type { Account } from "$lib/schema/accounts";
import { rpc } from "$lib/query";
import type { TransactionsFormat } from "$lib/types";
import { without } from "$lib/utils";
import { currencyFormatter, transactionFormatter } from "$lib/utils/formatters";
import { getContext, setContext } from "svelte";

const KEY = Symbol("current_account");

export class CurrentAccountState {
  account: Account = $state() as Account;
  balance = $derived(() => {
    const balance = this.account?.balance ?? 0;
    return currencyFormatter.format(isNaN(balance) ? 0 : balance);
  });
  transactions: Transaction[] = $derived(this.account?.transactions) as Transaction[];
  formatted: TransactionsFormat[] = $derived(transactionFormatter.format(this.transactions) ?? []);
  categories?: Category[] = $derived.by(() => {
    return (
      (this.formatted?.filter(Boolean) as TransactionsFormat[])
        .map((transaction: TransactionsFormat) => transaction.category)
        .filter((category) => category !== null) || []
    );
  });
  payees?: Payee[] = $derived.by(() => {
    return (
      (this.formatted?.filter(Boolean) as TransactionsFormat[])
        .map((transaction: TransactionsFormat) => transaction.payee)
        .filter((payee) => payee !== null) || []
    );
  });

  constructor(account?: Account) {
    if (account) {
      this.account = account;
    }
    setContext(KEY, this);
    return this;
  }

  static get() {
    return getContext<CurrentAccountState>(KEY);
  }

  get id() {
    return this.account.id;
  }

  get name() {
    return this.account.name;
  }

  get notes() {
    return this.account.notes;
  }

  addTransaction(transaction: Transaction) {
    this.account.balance += transaction.amount;
    // Set the running balance for the new transaction
    transaction.balance = this.account.balance;
    this.transactions?.push(transaction);
  }

  getTransaction(id: number) {
    return this.formatted?.find((transaction) => transaction.id === id);
  }

  getRawTransaction(id: number): [number, Transaction] {
    const idx = this.transactions?.findIndex((transaction) => transaction.id === id);
    return [idx, this.transactions[idx]!];
  }

  updateTransaction = async (id: number, columnId: string, newValue?: unknown) => {
    const new_data = {
      [columnId as keyof Transaction]: newValue,
    };

    let [idx, original] = this.getRawTransaction(id);
    if (columnId === "amount") {
      const amountDifference = (newValue as number) - (original?.amount as number);
      this.account.balance += amountDifference;

      // Update running balance for this transaction and all subsequent transactions
      this.account.transactions
        .filter((_, index) => index >= idx)
        .forEach((transaction) => {
          transaction.balance = (transaction.balance ?? 0) + amountDifference;
        });
    }
    const updatedData = Object.assign({}, original, new_data) as Transaction;
    await rpc.transactions.saveTransaction.execute(updatedData);
    this.transactions[idx] = updatedData;
  };

  async deleteTransactions(transactions: number[], cb?: (id: Transaction[]) => void) {
    await rpc.transactions.bulkDeleteTransactions.execute(transactions);
    const [kept, removed] = without(this.transactions ?? [], (transaction: Transaction) =>
      transactions.includes(transaction.id)
    );
    this.account.transactions = kept;
    this.account.balance =
      kept.length > 0
        ? kept
            .map((transaction: Transaction) => transaction.amount)
            .reduce((prev, curr) => prev + curr)
        : 0;
    if (cb) {
      cb(removed);
    }
  }

  async deleteTransaction(transaction: number) {
    return this.deleteTransactions([transaction]);
  }
}
