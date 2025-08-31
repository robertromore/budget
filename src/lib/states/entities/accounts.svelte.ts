import type { Account } from "$lib/schema";
import { SvelteMap } from "svelte/reactivity";
import { trpc } from "$lib/trpc/client";
import { getContext, setContext } from "svelte";

const KEY = Symbol("accounts");

export class AccountsState {
  accounts = $state(new SvelteMap<number, Account>()) as SvelteMap<number, Account>;

  constructor(accounts?: Account[]) {
    if (accounts) {
      this.init(accounts);
    }
  }

  // Initialize/reinitialize the store with new data
  init(accounts: Account[]) {
    this.accounts.clear();
    accounts.forEach((account) => this.accounts.set(account.id, account));
  }

  // Context management
  static get() {
    return getContext<AccountsState>(KEY);
  }

  static set(accounts: Account[]) {
    return setContext(KEY, new AccountsState(accounts));
  }

  // Getters
  get all(): Account[] {
    return this.accounts.values().toArray();
  }

  get count(): number {
    return this.accounts.size;
  }

  // Find operations
  getById(id: number): Account | undefined {
    return this.accounts.get(id);
  }

  findBy(predicate: (account: Account) => boolean): Account | undefined {
    return this.accounts.values().find(predicate);
  }

  filterBy(predicate: (account: Account) => boolean): Account[] {
    return this.accounts.values().filter(predicate).toArray();
  }

  // Domain-specific methods
  getByName(name: string): Account | undefined {
    return this.findBy(account => account.name === name);
  }

  getActiveAccounts(): Account[] {
    return this.filterBy(account => !account.closed);
  }

  getClosedAccounts(): Account[] {
    return this.filterBy(account => !!account.closed);
  }

  getTotalBalance(): number {
    return this.all.reduce((total, account) => total + (account.balance || 0), 0);
  }

  // CRUD operations
  addAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  updateAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  removeAccount(id: number): Account | undefined {
    const account = this.accounts.get(id);
    if (account) {
      this.accounts.delete(id);
      return account;
    }
    return undefined;
  }

  // API operations
  async saveAccount(account: Account): Promise<Account> {
    const result = await trpc().accountRoutes.save.mutate(account);
    this.addAccount(result);
    return result;
  }

  async deleteAccount(id: number): Promise<void> {
    await trpc().accountRoutes.remove.mutate({ id });
    this.removeAccount(id);
  }

  async deleteAccounts(ids: number[]): Promise<void> {
    await Promise.all(ids.map(id => this.deleteAccount(id)));
  }

  // Utility methods
  has(id: number): boolean {
    return this.accounts.has(id);
  }

  clear(): void {
    this.accounts.clear();
  }
}
