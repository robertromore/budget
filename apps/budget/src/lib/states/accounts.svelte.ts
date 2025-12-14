import type { Account } from "$lib/schema";
import { rpc } from "$lib/query";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

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
    return Array.from(this.accounts.values()).find((account: Account) => {
      return account.id == id;
    })!;
  }

  addAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  async deleteAccount(id: number) {
    this.accounts.delete(id);
    await rpc.accounts.deleteAccount.execute({ id });
  }
}
