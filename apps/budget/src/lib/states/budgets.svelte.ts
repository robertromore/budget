import type { Budget, BudgetGroup, BudgetWithRelations } from "$lib/schema/budgets";
import { SvelteMap } from "svelte/reactivity";
import { trpc } from "$lib/trpc/client";
import { page } from "$app/state";
import { getContext, setContext } from "svelte";
import type { Transaction } from "$lib/schema/transactions";

const KEY = Symbol("budgets");

export class BudgetsState {
  budgets: SvelteMap<number, Budget> = $state() as SvelteMap<number, Budget>;
  groups: SvelteMap<number, BudgetGroup> = $state() as SvelteMap<number, BudgetGroup>;

  // Reactive computed properties using $derived.by
  all = $derived.by(() => Array.from(this.budgets.values()));
  allGroups = $derived.by(() => Array.from(this.groups.values()));

  activeBudgets = $derived.by(() => {
    return this.all.filter(budget => budget.status === 'active');
  });

  inactiveBudgets = $derived.by(() => {
    return this.all.filter(budget => budget.status !== 'active');
  });

  budgetsByType = $derived.by(() => {
    const grouped = new Map<string, Budget[]>();
    for (const budget of this.all) {
      const type = budget.type;
      if (!grouped.has(type)) {
        grouped.set(type, []);
      }
      grouped.get(type)!.push(budget);
    }
    return grouped;
  });

  activeCount = $derived.by(() => {
    return this.activeBudgets.length;
  });

  constructor(budgets: Budget[], groups: BudgetGroup[] = []) {
    this.budgets = new SvelteMap(budgets.map((budget) => [budget.id, budget]));
    this.groups = new SvelteMap(groups.map((group) => [group.id, group]));
  }

  static get() {
    return getContext<BudgetsState>(KEY);
  }

  static set(budgets: Budget[], groups: BudgetGroup[] = []) {
    return setContext(KEY, new BudgetsState(budgets, groups));
  }

  // Find operations
  getById(id: number): Budget | undefined {
    return this.budgets.get(id);
  }

  getGroupById(id: number): BudgetGroup | undefined {
    return this.groups.get(id);
  }

  getBudgetsByScope(scope: 'account' | 'category' | 'global' | 'mixed'): Budget[] {
    return this.all.filter(budget => budget.scope === scope);
  }

  getBudgetsForTransaction(transaction: Transaction): Budget[] {
    // This would need to be implemented based on budget-account and budget-category associations
    // For now, return active budgets that could potentially apply
    return this.activeBudgets.filter(budget => {
      // Logic to determine which budgets apply to this transaction
      // This would involve checking account/category associations
      return budget.status === 'active';
    });
  }

  // State mutations
  addBudget(budget: Budget): void {
    this.budgets.set(budget.id, budget);
  }

  updateBudget(id: number, updates: Partial<Budget>): void {
    const existing = this.budgets.get(id);
    if (existing) {
      this.budgets.set(id, { ...existing, ...updates });
    }
  }

  removeBudget(id: number): void {
    this.budgets.delete(id);
  }

  addGroup(group: BudgetGroup): void {
    this.groups.set(group.id, group);
  }

  updateGroup(id: number, updates: Partial<BudgetGroup>): void {
    const existing = this.groups.get(id);
    if (existing) {
      this.groups.set(id, { ...existing, ...updates });
    }
  }

  removeGroup(id: number): void {
    this.groups.delete(id);
  }

  // API integration methods
  async deleteBudget(id: number) {
    this.budgets.delete(id);
    await trpc(page).budgetRoutes.delete.mutate({ id });
  }

  async deleteGroup(id: number) {
    this.groups.delete(id);
    await trpc(page).budgetRoutes.groups.delete.mutate({ id });
  }
}