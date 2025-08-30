import type { Account } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import { trpc } from "$lib/trpc/client";
import { getContext, setContext } from "svelte";

const KEY = Symbol("accounts");

export class AccountsState {
  accounts: SvelteMap<number, Account> = $state() as SvelteMap<number, Account>;

  constructor(accounts: Account[]) {
    this.accounts = new SvelteMap(accounts.map((account) => [account.id, account]));
  }

  static get() {
    return getContext<AccountsState>(KEY);
  }

  static set(accounts: Account[]) {
    return setContext(KEY, new AccountsState(accounts));
  }

  getById(id: number): Account {
    return this.accounts.values().find((account: Account) => {
      return account.id == id;
    })!;
  }

  addAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  async deleteAccount(id: number) {
    this.accounts.delete(id);
    await trpc().accountRoutes.remove.mutate({ id: id });
  }
}
