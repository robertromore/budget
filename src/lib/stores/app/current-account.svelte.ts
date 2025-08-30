import type { TransactionsFormat } from "$lib/types";
import { currencyFormatter, transactionFormatter } from "$lib/utils/formatters";
import type { Category, Payee, Transaction } from "$lib/schema";
import type { Account } from "$lib/schema/accounts";
import { orpc } from "$lib/rpc/client";
import { without } from "$lib/utils";
import { getContext, setContext } from "svelte";

const KEY = Symbol("current_account");

export class CurrentAccountState {
  account: Account = $state() as Account;
  balance = $derived(currencyFormatter.format(this.account?.balance));
  transactions: Transaction[] = $derived(this.account?.transactions) as Transaction[];
  formatted: TransactionsFormat[] = $derived(transactionFormatter.format(this.transactions, 0) ?? []);
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
    this.transactions?.push(transaction);
    this.account.balance += transaction.amount;
  }

  getTransaction(id: number) {
    return this.formatted?.find((transaction) => transaction.id === id);
  }

  getRawTransaction(id: number): [number, Transaction] {
    const idx = this.transactions?.findIndex((transaction) => transaction.id === id);
    return [idx, this.transactions[idx]];
  }

  updateTransaction = async (id: number, columnId: string, newValue?: unknown) => {
    const new_data = {
      [columnId as keyof Transaction]: newValue,
    };

    let [idx, original] = this.getRawTransaction(id);
    if (columnId === "amount") {
      this.account.balance += (newValue as number) - (original?.amount as number);
      this.account.transactions
        .filter((transaction) => transaction.id >= id)
        .forEach((transaction) => {
          transaction.balance += (newValue as number) - (original?.amount as number);
        });
    }
    const updatedData = Object.assign({}, original, new_data) as Transaction;
    await orpc().transactions.save(updatedData);
    this.transactions[idx] = updatedData;
  };

  async deleteTransactions(transactions: number[], cb?: (id: Transaction[]) => void) {
    await orpc().transactions.removeMany({
      entities: transactions,
      accountId: this.id,
    });
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
