import type { Account } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import { Context } from "runed";
import { trpc } from "$lib/trpc/client";
import { page } from "$app/state";

export class AccountsState {
  accounts: SvelteMap<number, Account> = $state() as SvelteMap<number, Account>;

  constructor(accounts: Account[]) {
    this.accounts = new SvelteMap(accounts.map((account) => [account.id, account]));
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
    await trpc(page).accountRoutes.remove.mutate({ id: id });
  }
}

export const accountsContext = new Context<AccountsState>("accounts");
