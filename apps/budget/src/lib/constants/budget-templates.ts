import type {BudgetType, BudgetScope} from "$lib/schema/budgets";

export type TemplateCategory =
  | "essentials" // Housing, utilities, groceries, healthcare
  | "lifestyle" // Dining, entertainment, education
  | "transportation" // Car, gas, transit
  | "savings-goals"; // Emergency fund, vacation, debt payoff, home improvement

export interface BudgetTemplate {
  id: string;
  name: string;
  description: string;
  type: BudgetType;
  scope: BudgetScope;
  category: TemplateCategory;
  icon: string; // Lucide icon name
  suggestedAmount?: number;
  enforcementLevel: "none" | "warning" | "strict";
  metadata?: Record<string, unknown>;
}

export const BUDGET_TEMPLATES: BudgetTemplate[] = [
  // Essentials
  {
    id: "monthly-groceries",
    name: "Monthly Groceries",
    description: "Track monthly grocery spending with a set budget limit",
    type: "account-monthly",
    scope: "account",
    category: "essentials",
    icon: "shopping-cart",
    suggestedAmount: 500,
    enforcementLevel: "warning",
  },
  {
    id: "utilities",
    name: "Monthly Utilities",
    description: "Track recurring utility bills and expenses",
    type: "scheduled-expense",
    scope: "category",
    category: "essentials",
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
    category: "essentials",
    icon: "home",
    suggestedAmount: 1500,
    enforcementLevel: "strict",
  },
  {
    id: "healthcare",
    name: "Healthcare & Medical",
    description: "Budget for medical expenses, prescriptions, and insurance",
    type: "category-envelope",
    scope: "category",
    category: "essentials",
    icon: "heart-pulse",
    suggestedAmount: 200,
    enforcementLevel: "warning",
  },

  // Lifestyle
  {
    id: "dining-out",
    name: "Dining & Restaurants",
    description: "Manage spending on dining out and restaurants",
    type: "category-envelope",
    scope: "category",
    category: "lifestyle",
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
    category: "lifestyle",
    icon: "film",
    suggestedAmount: 150,
    enforcementLevel: "warning",
  },
  {
    id: "education",
    name: "Education & Learning",
    description: "Budget for courses, books, and educational materials",
    type: "category-envelope",
    scope: "category",
    category: "lifestyle",
    icon: "book-open",
    suggestedAmount: 100,
    enforcementLevel: "warning",
  },

  // Transportation
  {
    id: "transportation",
    name: "Transportation",
    description: "Budget for gas, public transit, and vehicle expenses",
    type: "category-envelope",
    scope: "category",
    category: "transportation",
    icon: "car",
    suggestedAmount: 250,
    enforcementLevel: "warning",
  },

  // Savings & Goals
  {
    id: "emergency-fund",
    name: "Emergency Fund",
    description: "Build up savings for unexpected expenses",
    type: "goal-based",
    scope: "account",
    category: "savings-goals",
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
    category: "savings-goals",
    icon: "plane",
    suggestedAmount: 2000,
    enforcementLevel: "none",
  },
  {
    id: "debt-payoff",
    name: "Debt Payoff",
    description: "Track progress paying down loans or credit card debt",
    type: "goal-based",
    scope: "account",
    category: "savings-goals",
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
    category: "savings-goals",
    icon: "hammer",
    suggestedAmount: 3000,
    enforcementLevel: "none",
  },
];

export const TEMPLATE_CATEGORY_LABELS: Record<TemplateCategory, string> = {
  essentials: "Essentials",
  lifestyle: "Lifestyle",
  transportation: "Transportation",
  "savings-goals": "Savings & Goals",
};

export function getBudgetTemplateById(id: string): BudgetTemplate | undefined {
  return BUDGET_TEMPLATES.find((template) => template.id === id);
}

export function getBudgetTemplatesByType(type: BudgetType): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.type === type);
}

export function getBudgetTemplatesByScope(scope: BudgetScope): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.scope === scope);
}

export function getBudgetTemplatesByCategory(category: TemplateCategory): BudgetTemplate[] {
  return BUDGET_TEMPLATES.filter((template) => template.category === category);
}

export function getTemplateCategories(): TemplateCategory[] {
  return ["essentials", "lifestyle", "transportation", "savings-goals"];
}
