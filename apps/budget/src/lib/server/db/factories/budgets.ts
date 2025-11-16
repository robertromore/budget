import slugify from "@sindresorhus/slugify";
import {db} from "..";
import {
  budgets,
  budgetPeriodTemplates,
  budgetPeriodInstances,
  budgetAccounts,
  budgetCategories,
  type Budget,
  type BudgetType,
  type BudgetScope,
  type PeriodTemplateType,
} from "$lib/schema/budgets";
import {faker} from "@faker-js/faker";
import {sequence} from "./utils/sequence";

export interface BudgetFactoryOptions {
  accountIds?: number[];
  categoryIds?: number[];
  withPeriod?: boolean;
  periodType?: PeriodTemplateType;
  scope?: BudgetScope;
}

/**
 * Creates budget(s) for a specific workspace with optional period templates
 *
 * Supports all 4 budget types:
 * - account-monthly: Monthly spending limit for accounts
 * - category-envelope: Envelope budgeting for categories
 * - goal-based: Savings goals
 * - scheduled-expense: Recurring bill tracking
 *
 * @param workspaceId - The workspace ID this budget belongs to (REQUIRED)
 * @param type - Budget type (default: random)
 * @param options - Configuration options
 * @returns Promise<Budget> - Created budget
 *
 * @example
 * ```typescript
 * // Create envelope budget with monthly periods
 * const budget = await budgetFactory(workspaceId, 'category-envelope', {
 *   categoryIds: [1, 2, 3],
 *   withPeriod: true,
 *   periodType: 'monthly'
 * });
 *
 * // Create simple account budget
 * const budget = await budgetFactory(workspaceId, 'account-monthly', {
 *   accountIds: [1]
 * });
 * ```
 */
export const budgetFactory = async (
  workspaceId: number,
  type?: BudgetType,
  options: BudgetFactoryOptions = {}
): Promise<Budget> => {
  const budgetType =
    type ??
    faker.helpers.arrayElement([
      "account-monthly",
      "category-envelope",
      "goal-based",
      "scheduled-expense",
    ] as const);

  // Generate realistic name based on type
  const names = {
    "account-monthly": [
      "Monthly Spending Limit",
      "Overall Budget",
      "Account Budget",
      "Spending Cap",
    ],
    "category-envelope": [
      "Envelope Budget",
      "Monthly Envelopes",
      "Category Allocations",
      "Zero-Based Budget",
    ],
    "goal-based": ["Emergency Fund", "Vacation Savings", "Down Payment Goal", "Investment Fund"],
    "scheduled-expense": [
      "Recurring Bills",
      "Monthly Subscriptions",
      "Fixed Expenses",
      "Scheduled Payments",
    ],
  };

  const name = faker.helpers.arrayElement(names[budgetType]);
  const slug = `${slugify(name)}-${sequence("budget")}`;

  // Determine scope
  const scope: BudgetScope =
    options.scope ??
    (budgetType === "account-monthly"
      ? "account"
      : budgetType === "category-envelope"
        ? "category"
        : budgetType === "goal-based"
          ? "global"
          : "mixed");

  // Generate metadata based on type
  const metadata = generateBudgetMetadata(budgetType, options.periodType);

  // Create the budget
  const [budget] = await db
    .insert(budgets)
    .values({
      workspaceId,
      name,
      slug,
      description: faker.lorem.sentence(),
      type: budgetType,
      scope,
      status: "active",
      enforcementLevel: faker.helpers.arrayElement(["none", "warning", "strict"]),
      metadata,
    })
    .returning();

  if (!budget) {
    throw new Error(`Failed to create budget: ${name}`);
  }

  // Link accounts if provided
  if (options.accountIds && options.accountIds.length > 0) {
    for (const accountId of options.accountIds) {
      await db.insert(budgetAccounts).values({
        budgetId: budget.id,
        accountId,
      });
    }
  }

  // Link categories if provided
  if (options.categoryIds && options.categoryIds.length > 0) {
    for (const categoryId of options.categoryIds) {
      await db.insert(budgetCategories).values({
        budgetId: budget.id,
        categoryId,
      });
    }
  }

  // Create period template if requested
  if (options.withPeriod) {
    const periodType = options.periodType ?? "monthly";

    const [template] = await db
      .insert(budgetPeriodTemplates)
      .values({
        budgetId: budget.id,
        type: periodType,
        intervalCount: 1,
        startDayOfMonth: periodType === "monthly" ? 1 : undefined,
        startDayOfWeek: periodType === "weekly" ? 1 : undefined,
        startMonth: periodType === "yearly" ? 1 : undefined,
        timezone: "America/New_York",
      })
      .returning();

    if (!template) {
      throw new Error(`Failed to create period template for budget ${budget.id}`);
    }

    // Create 2 period instances (current + next)
    const now = new Date();
    const periods = generatePeriodDates(periodType, now, 2);

    for (const period of periods) {
      await db.insert(budgetPeriodInstances).values({
        templateId: template.id,
        startDate: period.startDate,
        endDate: period.endDate,
        allocatedAmount: faker.number.float({min: 500, max: 5000, fractionDigits: 2}),
        rolloverAmount: 0,
        actualAmount: 0,
      });
    }
  }

  return budget;
};

/**
 * Generate realistic metadata based on budget type
 */
function generateBudgetMetadata(type: BudgetType, periodType?: PeriodTemplateType) {
  const metadata: any = {
    defaultPeriod: {
      type: periodType ?? "monthly",
      startDay: 1,
    },
  };

  switch (type) {
    case "account-monthly":
      metadata.allocatedAmount = faker.number.float({min: 1000, max: 5000, fractionDigits: 2});
      break;

    case "category-envelope":
      metadata.allocatedAmount = faker.number.float({min: 500, max: 3000, fractionDigits: 2});
      metadata.rolloverMode = faker.helpers.arrayElement(["unlimited", "reset", "limited"]);
      break;

    case "goal-based":
      const targetDate = faker.date.future({years: 2});
      metadata.goal = {
        targetAmount: faker.number.float({min: 5000, max: 50000, fractionDigits: 2}),
        targetDate: targetDate.toISOString().split("T")[0],
        startDate: new Date().toISOString().split("T")[0],
        contributionFrequency: "monthly",
        autoContribute: faker.datatype.boolean(),
      };
      break;

    case "scheduled-expense":
      metadata.scheduledExpense = {
        expectedAmount: faker.number.float({min: 50, max: 500, fractionDigits: 2}),
        frequency: faker.helpers.arrayElement(["weekly", "monthly", "quarterly", "yearly"]),
        autoTrack: true,
      };
      break;
  }

  return metadata;
}

/**
 * Generate period date ranges based on type
 */
function generatePeriodDates(
  type: PeriodTemplateType,
  startDate: Date,
  count: number
): Array<{startDate: string; endDate: string}> {
  const periods: Array<{startDate: string; endDate: string}> = [];

  for (let i = 0; i < count; i++) {
    let start: Date;
    let end: Date;

    switch (type) {
      case "weekly":
        start = new Date(startDate);
        start.setDate(start.getDate() + i * 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;

      case "monthly":
        start = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1);
        end = new Date(startDate.getFullYear(), startDate.getMonth() + i + 1, 0);
        break;

      case "quarterly":
        const quarterStart = Math.floor(startDate.getMonth() / 3) * 3;
        start = new Date(startDate.getFullYear(), quarterStart + i * 3, 1);
        end = new Date(startDate.getFullYear(), quarterStart + i * 3 + 3, 0);
        break;

      case "yearly":
        start = new Date(startDate.getFullYear() + i, 0, 1);
        end = new Date(startDate.getFullYear() + i, 11, 31);
        break;

      default:
        start = new Date(startDate);
        end = new Date(startDate);
        end.setMonth(end.getMonth() + 1);
        break;
    }

    periods.push({
      startDate: start!.toISOString().split("T")[0]!,
      endDate: end!.toISOString().split("T")[0]!,
    });
  }

  return periods;
}
