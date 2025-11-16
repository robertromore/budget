import type {
  Budget,
  BudgetAccount,
  BudgetCategory,
  BudgetGroup,
  BudgetGroupMembership,
  BudgetPeriodInstance,
  BudgetPeriodTemplate,
  BudgetTransaction,
} from "$lib/schema/budgets";
import type {BudgetWithRelations} from "$lib/server/domains/budgets";
import {getContext, setContext} from "svelte";
import {SvelteMap} from "svelte/reactivity";

const KEY = Symbol("budget_state");

type TemplateWithPeriods = BudgetPeriodTemplate & {
  periods: BudgetPeriodInstance[];
};

/**
 * Centralized client state for budgets, groups, and period data.
 */
export class BudgetState {
  budgets = $state(new SvelteMap<number, BudgetWithRelations>());
  groups = $state(new SvelteMap<number, BudgetGroup>());
  templates = $state(new SvelteMap<number, TemplateWithPeriods>());

  constructor(initialBudgets: BudgetWithRelations[] = []) {
    this.replaceBudgets(initialBudgets);
  }

  static get(): BudgetState {
    return getContext<BudgetState>(KEY);
  }

  static safeGet(): BudgetState | null {
    try {
      return BudgetState.get();
    } catch (error) {
      return null;
    }
  }

  static set(initialBudgets: BudgetWithRelations[] = []): BudgetState {
    const state = new BudgetState(initialBudgets);
    setContext(KEY, state);
    return state;
  }

  replaceBudgets(budgets: BudgetWithRelations[]): void {
    this.budgets = new SvelteMap();
    this.groups = new SvelteMap();
    this.templates = new SvelteMap();

    budgets.forEach((budget) => this.upsertBudget(budget));
  }

  upsertBudget(budget: BudgetWithRelations): void {
    this.budgets.set(budget.id, budget);

    budget.groupMemberships?.forEach((membership) => {
      if (membership.group) {
        this.groups.set(membership.group.id, membership.group);
      }
    });

    budget.periodTemplates?.forEach((template) => {
      this.templates.set(template.id, this.normalizedTemplate(template));
    });
  }

  removeBudget(id: number): void {
    const existing = this.budgets.get(id);
    if (!existing) return;

    this.budgets.delete(id);

    existing.periodTemplates?.forEach((template) => {
      this.templates.delete(template.id);
    });

    existing.groupMemberships?.forEach((membership) => {
      if (!membership.groupId) return;
      const stillReferenced = Array.from(this.budgets.values()).some((budget) =>
        budget.groupMemberships?.some((entry) => entry.groupId === membership.groupId)
      );
      if (!stillReferenced) {
        this.groups.delete(membership.groupId);
      }
    });
  }

  get all(): BudgetWithRelations[] {
    return Array.from(this.budgets.values());
  }

  get activeBudgets(): BudgetWithRelations[] {
    return this.all.filter((budget) => budget.status === "active");
  }

  getBudgetById(id: number): BudgetWithRelations | undefined {
    return this.budgets.get(id);
  }

  getBySlug(slug: string): BudgetWithRelations | null {
    return Array.from(this.budgets.values()).find((budget) => budget.slug === slug) ?? null;
  }

  getTemplatesForBudget(budgetId: number): TemplateWithPeriods[] {
    const budget = this.budgets.get(budgetId);
    if (!budget?.periodTemplates) return [];

    return budget.periodTemplates.map(
      (template) => this.templates.get(template.id) ?? this.normalizedTemplate(template)
    );
  }

  getPeriodInstances(templateId: number): BudgetPeriodInstance[] {
    return this.templates.get(templateId)?.periods ?? [];
  }

  recordPeriodInstance(instance: BudgetPeriodInstance): void {
    const template = this.templates.get(instance.templateId);
    if (!template) return;

    const periods = [...template.periods];
    const index = periods.findIndex((period) => period.id === instance.id);
    if (index >= 0) {
      periods[index] = instance;
    } else {
      periods.push(instance);
    }

    periods.sort((a, b) => a.startDate.localeCompare(b.startDate));

    const updatedTemplate: TemplateWithPeriods = {
      ...template,
      periods,
    };

    this.templates.set(instance.templateId, updatedTemplate);
    this.updateBudgetTemplate(updatedTemplate);
  }

  syncPeriodInstances(templateId: number, periods: BudgetPeriodInstance[]): void {
    const template = this.templates.get(templateId);
    if (!template) return;

    const ordered = [...periods].sort((a, b) => a.startDate.localeCompare(b.startDate));
    const updatedTemplate: TemplateWithPeriods = {
      ...template,
      periods: ordered,
    };

    this.templates.set(templateId, updatedTemplate);
    this.updateBudgetTemplate(updatedTemplate);
  }

  private normalizedTemplate(
    template: BudgetPeriodTemplate | TemplateWithPeriods
  ): TemplateWithPeriods {
    return {
      ...template,
      periods: [...((template as TemplateWithPeriods).periods ?? [])].sort((a, b) =>
        a.startDate.localeCompare(b.startDate)
      ),
    };
  }

  private updateBudgetTemplate(template: TemplateWithPeriods): void {
    for (const [budgetId, budget] of this.budgets.entries()) {
      const templates = budget.periodTemplates ?? [];
      const index = templates.findIndex((item) => item.id === template.id);
      if (index === -1) continue;

      const updatedBudget: BudgetWithRelations = {
        ...budget,
        periodTemplates: [...templates.slice(0, index), template, ...templates.slice(index + 1)],
      };

      this.budgets.set(budgetId, updatedBudget);
      break;
    }
  }
}

export type BudgetStateBudget = Budget;
export type BudgetStateAccountLink = BudgetAccount;
export type BudgetStateCategoryLink = BudgetCategory;
export type BudgetStateMembership = BudgetGroupMembership;
export type BudgetStateTemplate = TemplateWithPeriods;
export type BudgetStateInstance = BudgetPeriodInstance;
export type BudgetStateTransaction = BudgetTransaction;
