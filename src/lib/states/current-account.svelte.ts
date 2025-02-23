import type { TransactionsFormat } from "$lib/types";
import { currencyFormatter, transactionFormatter } from "$lib/helpers/formatters";
import type { Category, Payee, Transaction } from "$lib/schema";
import type { Account } from "$lib/schema/accounts";
import { trpc } from "$lib/trpc/client";
import { without } from "$lib/utils";
import { Context } from "runed";

export class CurrentAccountState {
  account: Account = $state() as Account;
  balance = $derived(currencyFormatter.format(this.account?.balance));
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
    return this;
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
    }
    const updatedData = Object.assign({}, original, new_data) as Transaction;
    await trpc().transactionRoutes.save.mutate(updatedData);
    this.transactions[idx] = updatedData;
  };

  async deleteTransactions(transactions: number[], cb?: (id: Transaction[]) => void) {
    await trpc().transactionRoutes.delete.mutate({
      entities: transactions,
      accountId: this.id,
    });
    const [kept, removed] = without(this.transactions ?? [], (transaction: Transaction) =>
      transactions.includes(transaction.id)
    );
    this.account.transactions = kept;
    this.account.balance = kept
      .map((transaction: Transaction) => transaction.amount)
      .reduce((prev, curr) => prev + curr);
    if (cb) {
      cb(removed);
    }
  }

  async deleteTransaction(transaction: number) {
    return this.deleteTransactions([transaction]);
  }
}

export const currentAccount = new Context<CurrentAccountState>("current_account");
