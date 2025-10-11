import type { BudgetType, BudgetScope } from "$lib/schema/budgets";

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  type: BudgetType;
  scope: BudgetScope;
  icon: string; // Lucide icon name
  suggestedAmount?: number;
  enforcementLevel: "none" | "warning" | "strict";
  metadata?: Record<string, unknown>;
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  {
    id: "monthly-groceries",
    name: "Monthly Groceries",
    description: "Track monthly grocery spending with a set budget limit",
    type: "account-monthly",
    scope: "account",
    icon: "shopping-cart",
    suggestedAmount: 500,
    enforcementLevel: "warning",
  },
  {
    id: "emergency-fund",
    name: "Emergency Fund",
    description: "Build up savings for unexpected expenses",
    type: "goal-based",
    scope: "account",
    icon: "alert-triangle",
    suggestedAmount: 5000,
    enforcementLevel: "none",
  },
  {
    id: "vacation-savings",
    name: "Vacation Savings",
    description: "Save for your next vacation or travel adventure",
    type: "goal-based",
    scope: "account",
    icon: "plane",
    suggestedAmount: 2000,
    enforcementLevel: "none",
  },
  {
    id: "dining-out",
    name: "Dining & Restaurants",
    description: "Manage spending on dining out and restaurants",
    type: "category-envelope",
    scope: "category",
    icon: "utensils",
    suggestedAmount: 300,
    enforcementLevel: "warning",
  },
  {
    id: "entertainment",
    name: "Entertainment",
    description: "Budget for movies, concerts, games, and other entertainment",
    type: "category-envelope",
    scope: "category",
    icon: "film",
    suggestedAmount: 150,
    enforcementLevel: "warning",
  },
  {
    id: "utilities",
    name: "Monthly Utilities",
    description: "Track recurring utility bills and expenses",
    type: "scheduled-expense",
    scope: "category",
    icon: "zap",
    suggestedAmount: 200,
    enforcementLevel: "strict",
  },
  {
    id: "rent-mortgage",
    name: "Rent/Mortgage",
    description: "Track monthly housing payments",
    type: "scheduled-expense",
    scope: "account",
    icon: "home",
    suggestedAmount: 1500,
    enforcementLevel: "strict",
  },
  {
    id: "transportation",
    name: "Transportation",
    description: "Budget for gas, public transit, and vehicle expenses",
    type: "category-envelope",
    scope: "category",
    icon: "car",
    suggestedAmount: 250,
    enforcementLevel: "warning",
  },
  {
    id: "healthcare",
    name: "Healthcare & Medical",
    description: "Budget for medical expenses, prescriptions, and insurance",
    type: "category-envelope",
    scope: "category",
    icon: "heart-pulse",
    suggestedAmount: 200,
    enforcementLevel: "warning",
  },
  {
    id: "debt-payoff",
    name: "Debt Payoff",
    description: "Track progress paying down loans or credit card debt",
    type: "goal-based",
    scope: "account",
    icon: "credit-card",
    suggestedAmount: 10000,
    enforcementLevel: "none",
  },
  {
    id: "home-improvement",
    name: "Home Improvement",
    description: "Save for home repairs, renovations, or improvements",
    type: "goal-based",
    scope: "account",
    icon: "hammer",
    suggestedAmount: 3000,
    enforcementLevel: "none",
  },
  {
    id: "education",
    name: "Education & Learning",
    description: "Budget for courses, books, and educational materials",
    type: "category-envelope",
    scope: "category",
    icon: "book-open",
    suggestedAmount: 100,
    enforcementLevel: "warning",
  },
];

export function getBudgetTemplateById(id: string): BudgetTemplate | undefined {
  return BUDGET_TEMPLATES.find((template) => template.id === id);
}

export function getBudgetTemplatesByType(type: BudgetType): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.type === type);
}

export function getBudgetTemplatesByScope(scope: BudgetScope): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.scope === scope);
}
