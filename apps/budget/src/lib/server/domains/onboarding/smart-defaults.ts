/**
 * Smart Defaults Generator
 *
 * Generates intelligent default accounts, categories, and budgets
 * based on user financial profile collected during onboarding.
 */

import type { AccountType, NewAccount } from "$lib/schema/accounts";
import type { NewCategory } from "$lib/schema";
import { defaultCategories } from "$lib/server/domains/categories/default-categories";
import { BUDGET_TEMPLATES, type BudgetTemplate } from "$lib/constants/budget-templates";
import type {
  AccountToTrack,
  DebtType,
  EmploymentStatus,
  FinancialGoal,
  HouseholdType,
  OnboardingFormData,
  SpendingArea,
} from "$lib/types/onboarding";

/**
 * Account configuration for creation
 */
export interface AccountConfig {
  name: string;
  slug: string;
  accountType: AccountType;
  institution?: string;
  accountIcon?: string;
  accountColor?: string;
  onBudget: boolean;
  notes?: string;
  initialBalance?: number;
}

/**
 * Budget configuration for creation
 */
export interface BudgetConfig {
  templateId: string;
  suggestedAmount: number;
  name: string;
  description?: string;
}

/**
 * Result of smart defaults generation
 */
export interface SmartDefaultsResult {
  accounts: AccountConfig[];
  categoryFilters: {
    includeSlugs: string[];
    excludeSlugs: string[];
  };
  budgets: BudgetConfig[];
  preferences: {
    currency: string;
    locale: string;
    dateFormat: string;
  };
}

/**
 * Map from onboarding account types to database account types
 */
const ACCOUNT_TYPE_MAP: Record<AccountToTrack, AccountType> = {
  checking: "checking",
  savings: "savings",
  "credit-card": "credit_card",
  investment: "investment",
  hsa: "hsa",
  loan: "loan",
  mortgage: "loan",
  utility: "utility",
};

/**
 * Color pools for each account type (to add variety)
 */
const ACCOUNT_COLOR_POOLS: Record<AccountToTrack, string[]> = {
  checking: ["#3b82f6", "#2563eb", "#1d4ed8", "#0ea5e9", "#0284c7"],
  savings: ["#10b981", "#059669", "#047857", "#22c55e", "#16a34a"],
  "credit-card": ["#f59e0b", "#d97706", "#b45309", "#eab308", "#ca8a04"],
  investment: ["#8b5cf6", "#7c3aed", "#6d28d9", "#a855f7", "#9333ea"],
  hsa: ["#ec4899", "#db2777", "#be185d", "#f472b6", "#e879f9"],
  loan: ["#ef4444", "#dc2626", "#b91c1c", "#f87171", "#fb7185"],
  mortgage: ["#6366f1", "#4f46e5", "#4338ca", "#818cf8", "#a78bfa"],
  utility: ["#f59e0b", "#d97706", "#f97316", "#ea580c", "#eab308"],
};

/**
 * Icon pools for each account type
 */
const ACCOUNT_ICON_POOLS: Record<AccountToTrack, string[]> = {
  checking: ["landmark", "building-2", "wallet", "banknote", "receipt"],
  savings: ["piggy-bank", "coins", "vault", "safe", "hand-coins"],
  "credit-card": ["credit-card", "wallet-cards", "contact-round", "badge-dollar-sign"],
  investment: ["trending-up", "chart-line", "chart-candlestick", "arrow-up-right", "sprout"],
  hsa: ["heart-pulse", "stethoscope", "pill", "activity", "cross"],
  loan: ["file-text", "scroll-text", "file-signature", "clipboard-list", "receipt-text"],
  mortgage: ["home", "house", "building", "key-round", "door-open"],
  utility: ["zap", "droplets", "flame", "wifi", "plug"],
};

/**
 * Description templates for each account type
 */
const ACCOUNT_DESCRIPTIONS: Record<AccountToTrack, string[]> = {
  checking: [
    "Primary account for everyday transactions and bill payments",
    "Main checking account for daily spending",
    "Daily banking account for regular expenses",
    "Primary transactional account",
  ],
  savings: [
    "Building your financial safety net, one deposit at a time",
    "Your emergency fund and savings goals live here",
    "Separate from spending - watch your savings grow",
    "Reserved funds for future goals and emergencies",
  ],
  "credit-card": [
    "Track spending and earn rewards responsibly",
    "Monitor balances and payment due dates",
    "Keep credit utilization in check",
    "Manage credit card spending and payments",
  ],
  investment: [
    "Building long-term wealth through investments",
    "Growing your portfolio for the future",
    "Off-budget investment tracking",
    "Watch your investments grow over time",
  ],
  hsa: [
    "Tax-advantaged savings for medical expenses",
    "Pre-tax healthcare savings with investment potential",
    "Save for healthcare costs, now and in retirement",
    "Triple tax advantage for health expenses",
  ],
  loan: [
    "Tracking progress toward becoming debt-free",
    "Monitor loan balance and payment progress",
    "Watch your debt shrink with each payment",
    "Debt tracking to celebrate milestones",
  ],
  mortgage: [
    "Building equity in your home with every payment",
    "Track your journey to owning your home outright",
    "Your biggest investment, tracked carefully",
    "Mortgage balance and payment tracking",
  ],
  utility: [
    "Track utility usage and billing patterns over time",
    "Monitor electric, gas, water, or internet usage",
    "Compare usage year-over-year to identify savings",
    "Import statements to analyze consumption trends",
  ],
};

/**
 * Default account configurations (base values)
 */
const ACCOUNT_DEFAULTS: Record<AccountToTrack, Partial<AccountConfig>> = {
  checking: {
    name: "Main Checking",
    slug: "main-checking",
    onBudget: true,
  },
  savings: {
    name: "Savings",
    slug: "savings",
    onBudget: true,
  },
  "credit-card": {
    name: "Credit Card",
    slug: "credit-card",
    onBudget: true,
  },
  investment: {
    name: "Investment Account",
    slug: "investment",
    onBudget: false,
  },
  hsa: {
    name: "HSA",
    slug: "hsa",
    onBudget: true,
  },
  loan: {
    name: "Loan",
    slug: "loan",
    onBudget: false,
  },
  mortgage: {
    name: "Mortgage",
    slug: "mortgage",
    onBudget: false,
  },
  utility: {
    name: "Utility Account",
    slug: "utility",
    onBudget: false,
  },
};

/**
 * Map spending areas to category slugs
 */
const SPENDING_AREA_CATEGORIES: Record<SpendingArea, string[]> = {
  housing: ["housing", "rent-mortgage", "utilities", "internet-phone", "home-insurance"],
  transportation: ["transportation", "gas-fuel", "car-payment", "car-insurance", "car-maintenance", "public-transit"],
  "food-groceries": ["groceries"],
  "food-dining": ["food-dining", "restaurants", "fast-food", "coffee-shops"],
  entertainment: ["entertainment", "streaming-services", "movies-shows", "hobbies", "sports-recreation"],
  healthcare: ["healthcare", "health-insurance", "medical-expenses", "prescriptions", "dental"],
  education: ["education", "tuition", "books-supplies", "online-courses"],
  "personal-care": ["personal-care", "haircuts-salon", "gym-fitness"],
  pets: ["pets", "pet-food", "veterinary"],
  shopping: ["shopping", "clothing", "electronics", "home-goods"],
  travel: ["vacation-fund"],
  giving: ["giving", "charity", "gifts"],
  business: ["business-expenses", "office-supplies", "software-subscriptions"],
};

/**
 * Map financial goals to relevant category slugs
 */
const GOAL_CATEGORIES: Record<FinancialGoal, string[]> = {
  "emergency-fund": ["emergency-fund"],
  "pay-debt": ["debt-loans", "credit-card-payment", "student-loans", "personal-loan"],
  "budget-better": [], // No specific categories
  "save-for-goal": ["vacation-fund", "home-down-payment"],
  invest: ["investments-income", "retirement"],
  "reduce-spending": [], // No specific categories
};

/**
 * Map debt types to category slugs
 */
const DEBT_TYPE_CATEGORIES: Record<DebtType, string[]> = {
  "credit-card": ["credit-card-payment"],
  "student-loan": ["student-loans"],
  "car-loan": ["car-payment"],
  mortgage: ["rent-mortgage"],
  "personal-loan": ["personal-loan"],
  "medical-debt": ["medical-expenses"],
};

/**
 * Categories that are core and should always be included
 */
const CORE_CATEGORY_SLUGS = [
  "income",
  "salary",
  "transfer",
  "miscellaneous",
  "fees-charges",
];

/**
 * Categories added based on household type
 */
const HOUSEHOLD_CATEGORIES: Record<HouseholdType, string[]> = {
  single: [],
  couple: [],
  "family-small": ["education", "tuition"],
  "family-large": ["education", "tuition", "books-supplies"],
};

/**
 * Categories added based on employment status
 */
const EMPLOYMENT_CATEGORIES: Record<EmploymentStatus, string[]> = {
  employed: ["salary"],
  "self-employed": ["freelance", "business-expenses", "office-supplies", "software-subscriptions"],
  retired: ["retirement"],
  student: ["education", "tuition", "books-supplies", "student-loans"],
  unemployed: [],
  other: [],
};

/**
 * Map financial goals to budget templates
 */
const GOAL_BUDGET_TEMPLATES: Record<FinancialGoal, string[]> = {
  "emergency-fund": ["emergency-fund"],
  "pay-debt": ["debt-payoff"],
  "budget-better": ["monthly-groceries", "dining-out", "entertainment"],
  "save-for-goal": ["vacation-savings", "home-improvement"],
  invest: [],
  "reduce-spending": ["dining-out", "entertainment", "transportation"],
};

/**
 * Helper function to pick a random element from an array
 */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Get account styling for an account type with deterministic icon selection
 *
 * Icons are selected sequentially from the pool:
 * - First account of each type gets the primary (first) icon
 * - Subsequent accounts get the next icon in the pool
 *
 * Colors are randomized for variety.
 *
 * @param accountType - The type of account
 * @param accountIndex - Index of this account within its type (0 = first)
 */
function getAccountStyling(
  accountType: AccountToTrack,
  accountIndex: number = 0
): {
  accountColor: string;
  accountIcon: string;
  notes: string;
} {
  // Get icon sequentially (first account gets first/primary icon)
  const iconPool = ACCOUNT_ICON_POOLS[accountType];
  const iconIndex = accountIndex % iconPool.length;

  return {
    accountColor: pickRandom(ACCOUNT_COLOR_POOLS[accountType]),
    accountIcon: iconPool[iconIndex], // Deterministic: first icon for first account
    notes: pickRandom(ACCOUNT_DESCRIPTIONS[accountType]),
  };
}

/**
 * Smart Defaults Generator
 */
export class SmartDefaultsGenerator {
  /**
   * Generate all smart defaults based on onboarding data
   */
  generateDefaults(formData: OnboardingFormData): SmartDefaultsResult {
    const accounts = this.generateAccounts(formData);
    const categoryFilters = this.generateCategoryFilters(formData);
    const budgets = this.generateBudgets(formData);

    return {
      accounts,
      categoryFilters,
      budgets,
      preferences: {
        currency: formData.currency,
        locale: formData.locale,
        dateFormat: formData.dateFormat,
      },
    };
  }

  /**
   * Generate account configurations based on selected account types
   */
  private generateAccounts(formData: OnboardingFormData): AccountConfig[] {
    const accounts: AccountConfig[] = [];
    const usedSlugs = new Set<string>();
    const typeCounters = new Map<AccountToTrack, number>();

    for (const accountType of formData.accountsToTrack) {
      const defaults = ACCOUNT_DEFAULTS[accountType];
      const dbAccountType = ACCOUNT_TYPE_MAP[accountType];

      // Get current count for this type to select the right icon
      const accountIndex = typeCounters.get(accountType) || 0;
      typeCounters.set(accountType, accountIndex + 1);

      const styling = getAccountStyling(accountType, accountIndex);

      // Handle multiple accounts of same type
      let slug = defaults.slug || accountType;
      let name = defaults.name || this.formatAccountName(accountType);

      if (usedSlugs.has(slug)) {
        const count = [...usedSlugs].filter((s) => s.startsWith(slug)).length + 1;
        slug = `${slug}-${count}`;
        name = `${name} ${count}`;
      }

      usedSlugs.add(slug);

      accounts.push({
        name,
        slug,
        accountType: dbAccountType,
        accountIcon: styling.accountIcon,
        accountColor: styling.accountColor,
        onBudget: defaults.onBudget ?? true,
        notes: styling.notes,
        initialBalance: 0,
      });
    }

    // If user has debt, add debt accounts based on debt overview
    if (formData.hasDebt && formData.debtOverview.length > 0) {
      for (const debt of formData.debtOverview) {
        const accountType = this.mapDebtTypeToAccountType(debt.type);
        const slug = `${debt.type}-debt`;

        if (!usedSlugs.has(slug)) {
          // Use loan styling for most debt, credit-card styling for credit card debt
          const debtStylingType = debt.type === "credit-card" ? "credit-card" : "loan";
          // Debt accounts get the first icon in their pool (index 0)
          const debtStyling = getAccountStyling(debtStylingType, 0);

          accounts.push({
            name: this.formatDebtAccountName(debt.type),
            slug,
            accountType,
            accountIcon: debtStyling.accountIcon,
            accountColor: debtStyling.accountColor,
            onBudget: false,
            notes: debt.approximateAmount
              ? `Tracking ${this.formatDebtAccountName(debt.type).toLowerCase()}: $${debt.approximateAmount.toLocaleString()} remaining`
              : debtStyling.notes,
            initialBalance: debt.approximateAmount ? -debt.approximateAmount : 0,
          });
          usedSlugs.add(slug);
        }
      }
    }

    return accounts;
  }

  /**
   * Generate category filter configuration
   */
  private generateCategoryFilters(formData: OnboardingFormData): {
    includeSlugs: string[];
    excludeSlugs: string[];
  } {
    const includeSlugs = new Set<string>(CORE_CATEGORY_SLUGS);

    // Add categories based on spending areas
    for (const area of formData.spendingAreas) {
      const categories = SPENDING_AREA_CATEGORIES[area] || [];
      categories.forEach((slug) => includeSlugs.add(slug));
    }

    // Add categories based on financial goals
    for (const goal of formData.financialGoals) {
      const categories = GOAL_CATEGORIES[goal] || [];
      categories.forEach((slug) => includeSlugs.add(slug));
    }

    // Add categories based on debt
    if (formData.hasDebt) {
      for (const debt of formData.debtOverview) {
        const categories = DEBT_TYPE_CATEGORIES[debt.type] || [];
        categories.forEach((slug) => includeSlugs.add(slug));
      }
    }

    // Add categories based on household type
    const householdCategories = HOUSEHOLD_CATEGORIES[formData.householdType] || [];
    householdCategories.forEach((slug) => includeSlugs.add(slug));

    // Add categories based on employment
    const employmentCategories = EMPLOYMENT_CATEGORIES[formData.employmentStatus] || [];
    employmentCategories.forEach((slug) => includeSlugs.add(slug));

    // Add income categories based on income source
    if (formData.incomeSource === "freelance") {
      includeSlugs.add("freelance");
    } else if (formData.incomeSource === "investment") {
      includeSlugs.add("investments-income");
    } else if (formData.incomeSource === "retirement") {
      includeSlugs.add("retirement");
    }

    // Build exclusion list from default categories not in include list
    const allDefaultSlugs = defaultCategories.map((c) => c.slug);
    const excludeSlugs = allDefaultSlugs.filter((slug) => !includeSlugs.has(slug));

    return {
      includeSlugs: Array.from(includeSlugs),
      excludeSlugs,
    };
  }

  /**
   * Generate budget configurations based on goals and spending areas
   */
  private generateBudgets(formData: OnboardingFormData): BudgetConfig[] {
    const budgets: BudgetConfig[] = [];
    const addedTemplates = new Set<string>();

    // Add budgets based on financial goals
    for (const goal of formData.financialGoals) {
      const templateIds = GOAL_BUDGET_TEMPLATES[goal] || [];
      for (const templateId of templateIds) {
        if (!addedTemplates.has(templateId)) {
          const template = BUDGET_TEMPLATES.find((t) => t.id === templateId);
          if (template) {
            budgets.push(this.createBudgetConfig(template, formData));
            addedTemplates.add(templateId);
          }
        }
      }
    }

    // Add essential budgets if spending areas include them
    if (formData.spendingAreas.includes("food-groceries") && !addedTemplates.has("monthly-groceries")) {
      const template = BUDGET_TEMPLATES.find((t) => t.id === "monthly-groceries");
      if (template) {
        budgets.push(this.createBudgetConfig(template, formData));
        addedTemplates.add("monthly-groceries");
      }
    }

    if (formData.spendingAreas.includes("housing") && !addedTemplates.has("utilities")) {
      const template = BUDGET_TEMPLATES.find((t) => t.id === "utilities");
      if (template) {
        budgets.push(this.createBudgetConfig(template, formData));
        addedTemplates.add("utilities");
      }
    }

    return budgets;
  }

  /**
   * Create a budget config from a template with adjusted amounts
   */
  private createBudgetConfig(template: BudgetTemplate, formData: OnboardingFormData): BudgetConfig {
    // Adjust suggested amount based on household type
    let multiplier = 1;
    switch (formData.householdType) {
      case "couple":
        multiplier = 1.5;
        break;
      case "family-small":
        multiplier = 2;
        break;
      case "family-large":
        multiplier = 2.5;
        break;
    }

    const suggestedAmount = Math.round((template.suggestedAmount || 0) * multiplier);

    return {
      templateId: template.id,
      suggestedAmount,
      name: template.name,
      description: template.description,
    };
  }

  /**
   * Format account type to readable name
   */
  private formatAccountName(accountType: AccountToTrack): string {
    const names: Record<AccountToTrack, string> = {
      checking: "Checking Account",
      savings: "Savings Account",
      "credit-card": "Credit Card",
      investment: "Investment Account",
      hsa: "HSA",
      loan: "Loan",
      mortgage: "Mortgage",
      utility: "Utility Account",
    };
    return names[accountType] || accountType;
  }

  /**
   * Format debt type to account name
   */
  private formatDebtAccountName(debtType: DebtType): string {
    const names: Record<DebtType, string> = {
      "credit-card": "Credit Card Debt",
      "student-loan": "Student Loan",
      "car-loan": "Auto Loan",
      mortgage: "Mortgage",
      "personal-loan": "Personal Loan",
      "medical-debt": "Medical Debt",
    };
    return names[debtType] || "Debt";
  }

  /**
   * Map debt type to account type
   */
  private mapDebtTypeToAccountType(debtType: DebtType): AccountType {
    switch (debtType) {
      case "credit-card":
        return "credit_card";
      case "mortgage":
      case "student-loan":
      case "car-loan":
      case "personal-loan":
      case "medical-debt":
        return "loan";
      default:
        return "loan";
    }
  }

  /**
   * Get filtered default categories based on generated filters
   */
  getFilteredCategories(filters: { includeSlugs: string[]; excludeSlugs: string[] }): typeof defaultCategories {
    return defaultCategories.filter((cat) => filters.includeSlugs.includes(cat.slug));
  }
}

/**
 * Create a new SmartDefaultsGenerator instance
 */
export function createSmartDefaultsGenerator(): SmartDefaultsGenerator {
  return new SmartDefaultsGenerator();
}
