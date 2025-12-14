import type { Account } from "$lib/schema";
import { rpc, accountKeys, cachePatterns } from "$lib/query";
import { getContext, setContext } from "svelte";
import { SvelteMap } from "svelte/reactivity";

const KEY = Symbol("accounts");

export type AccountSortField = "name" | "balance" | "dateOpened" | "status" | "createdAt";
export type SortDirection = "asc" | "desc";

export class AccountsState {
  accounts = $state(new SvelteMap<number, Account>()) as SvelteMap<number, Account>;
  sortField = $state<AccountSortField>("name");
  sortDirection = $state<SortDirection>("asc");

  constructor(accounts?: Account[]) {
    // Load persisted sort preferences
    this.loadSortPreferences();

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
    return Array.from(this.accounts.values());
  }

  sorted = $derived(this.sortAccounts(this.all, this.sortField, this.sortDirection));

  get count(): number {
    return this.accounts.size;
  }

  // Find operations
  getById(id: number): Account | undefined {
    return this.accounts.get(id);
  }

  findBy(predicate: (account: Account) => boolean): Account | undefined {
    return Array.from(this.accounts.values()).find(predicate);
  }

  filterBy(predicate: (account: Account) => boolean): Account[] {
    return Array.from(this.accounts.values()).filter(predicate);
  }

  // Domain-specific methods
  getByName(name: string): Account | undefined {
    return this.findBy((account) => account.name === name);
  }

  getBySlug(slug: string): Account | null {
    return this.findBy((account) => account.slug === slug) ?? null;
  }

  getActiveAccounts(): Account[] {
    return this.filterBy((account) => !account.closed);
  }

  getClosedAccounts(): Account[] {
    return this.filterBy((account) => !!account.closed);
  }

  getOnBudgetAccounts(): Account[] {
    return this.filterBy((account) => account.onBudget === true);
  }

  getOffBudgetAccounts(): Account[] {
    return this.filterBy((account) => account.onBudget === false);
  }

  getTotalBalance(): number {
    return this.all.reduce((total, account) => total + (account.balance || 0), 0);
  }

  getOnBudgetBalance(): number {
    return this.getOnBudgetAccounts().reduce((total, account) => total + (account.balance || 0), 0);
  }

  getOffBudgetBalance(): number {
    return this.getOffBudgetAccounts().reduce(
      (total, account) => total + (account.balance || 0),
      0
    );
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
    // Convert null to undefined for the mutation
    const accountForMutation = {
      ...account,
      closed: account.closed ?? undefined,
      accountType: account.accountType ?? undefined,
      initialBalance: account.initialBalance ?? undefined,
    };
    const result = await rpc.accounts.saveAccount.execute(accountForMutation);
    // The API returns balance but TypeScript doesn't infer the extended type
    const accountWithDefaults: Account = {
      ...(result as any),
      transactions: (result as any).transactions ?? account.transactions ?? [],
      balance: (result as any).balance ?? 0,
    };
    this.updateAccount(accountWithDefaults);
    return accountWithDefaults;
  }

  async deleteAccount(id: number): Promise<void> {
    await rpc.accounts.deleteAccount.execute({ id });
    this.removeAccount(id);
    // Invalidate caches to update default accounts status
    cachePatterns.invalidatePrefix(accountKeys.all());
    cachePatterns.invalidatePrefix(accountKeys.defaultAccountsStatus());
  }

  async deleteAccounts(ids: number[]): Promise<void> {
    await Promise.all(ids.map((id) => this.deleteAccount(id)));
  }

  // Sorting methods
  setSorting(field: AccountSortField, direction: SortDirection) {
    this.sortField = field;
    this.sortDirection = direction;
    this.saveSortPreferences();
  }

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    this.saveSortPreferences();
  }

  // Sort preference persistence
  private loadSortPreferences() {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("accounts-sort-preferences");
        if (saved) {
          const { field, direction } = JSON.parse(saved);
          if (this.isValidSortField(field) && this.isValidSortDirection(direction)) {
            this.sortField = field;
            this.sortDirection = direction;
          }
        }
      } catch (error) {
        console.warn("Failed to load sort preferences:", error);
      }
    }
  }

  private saveSortPreferences() {
    if (typeof window !== "undefined") {
      try {
        const preferences = {
          field: this.sortField,
          direction: this.sortDirection,
        };
        localStorage.setItem("accounts-sort-preferences", JSON.stringify(preferences));
      } catch (error) {
        console.warn("Failed to save sort preferences:", error);
      }
    }
  }

  private isValidSortField(field: any): field is AccountSortField {
    return ["name", "balance", "dateOpened", "status", "createdAt"].includes(field);
  }

  private isValidSortDirection(direction: any): direction is SortDirection {
    return ["asc", "desc"].includes(direction);
  }

  private sortAccounts(
    accounts: Account[],
    field: AccountSortField,
    direction: SortDirection
  ): Account[] {
    return [...accounts].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (field) {
        case "name":
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
          break;
        case "balance":
          aValue = a.balance || 0;
          bValue = b.balance || 0;
          break;
        case "dateOpened":
          aValue = a.dateOpened ? new Date(a.dateOpened).getTime() : 0;
          bValue = b.dateOpened ? new Date(b.dateOpened).getTime() : 0;
          break;
        case "status":
          aValue = a.closed ? 1 : 0; // Active accounts first when asc
          bValue = b.closed ? 1 : 0;
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        default:
          aValue = a.name?.toLowerCase() || "";
          bValue = b.name?.toLowerCase() || "";
      }

      if (aValue < bValue) return direction === "asc" ? -1 : 1;
      if (aValue > bValue) return direction === "asc" ? 1 : -1;
      return 0;
    });
  }

  getSortedActiveAccounts(): Account[] {
    return this.sortAccounts(this.getActiveAccounts(), this.sortField, this.sortDirection);
  }

  getSortedClosedAccounts(): Account[] {
    return this.sortAccounts(this.getClosedAccounts(), this.sortField, this.sortDirection);
  }

  // Utility methods
  has(id: number): boolean {
    return this.accounts.has(id);
  }

  clear(): void {
    this.accounts.clear();
  }
}
