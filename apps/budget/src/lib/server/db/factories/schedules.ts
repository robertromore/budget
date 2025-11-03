import slugify from "@sindresorhus/slugify";
import {db} from "..";
import {schedules, type Schedule} from "$lib/schema/schedules";
import {scheduleDates} from "$lib/schema/schedule-dates";
import {faker} from "@faker-js/faker";
import {sequence} from "./utils/sequence";
import {payeeFactory} from "./payees";
import {categoryFactory} from "./categories";

type ScheduleDate = typeof scheduleDates.$inferSelect;

export interface ScheduleFactoryOptions {
  frequency?: "daily" | "weekly" | "monthly" | "yearly";
  recurring?: boolean;
  payeeId?: number;
  categoryId?: number;
  budgetId?: number;
}

/**
 * Creates schedule(s) with linked scheduleDates for a specific workspace
 *
 * Each schedule represents a recurring or one-time transaction pattern
 * Automatically creates payee and category if not provided
 *
 * @param workspaceId - The workspace ID (REQUIRED)
 * @param accountId - The account ID for these schedules (REQUIRED)
 * @param count - Number of schedules to create (default: random 1-5)
 * @param options - Configuration options
 * @returns Promise<Schedule[]> - Array of created schedules
 *
 * @example
 * ```typescript
 * // Create monthly recurring bills
 * const schedules = await scheduleFactory(workspaceId, accountId, 3, {
 *   frequency: 'monthly',
 *   recurring: true
 * });
 *
 * // Create one-time schedules
 * const schedules = await scheduleFactory(workspaceId, accountId, 2, {
 *   recurring: false
 * });
 * ```
 */
export const scheduleFactory = async (
  workspaceId: number,
  accountId: number,
  count: number = faker.number.int({min: 1, max: 5}),
  options: ScheduleFactoryOptions = {}
): Promise<Schedule[]> => {
  const schedules_collection: Schedule[] = [];

  for (let i = 0; i < count; i++) {
    // Get or create payee
    const payeeId = options.payeeId ?? (await payeeFactory(workspaceId, 1))[0]?.id;
    if (!payeeId) {
      throw new Error("Failed to create payee for schedule");
    }

    // Get or create category
    const categoryId = options.categoryId ?? (await categoryFactory(workspaceId, 1))[0]?.id;
    if (!categoryId) {
      throw new Error("Failed to create category for schedule");
    }

    // Generate realistic schedule names
    const scheduleTypes = [
      "Rent/Mortgage",
      "Utilities",
      "Internet",
      "Phone Bill",
      "Insurance",
      "Subscription",
      "Loan Payment",
      "Gym Membership",
    ];

    const name = faker.helpers.arrayElement(scheduleTypes);
    const slug = `${slugify(name)}-${sequence("schedule")}`;

    const recurring = options.recurring ?? faker.datatype.boolean({probability: 0.7});
    const frequency = options.frequency ?? faker.helpers.arrayElement([
      "weekly",
      "monthly",
      "yearly",
    ] as const);

    // Generate realistic amounts
    const amountType = faker.helpers.arrayElement(["exact", "approximate", "range"]);
    const amount = faker.number.float({min: 20, max: 2000, fractionDigits: 2});
    const amount_2 = amountType === "range"
      ? faker.number.float({min: amount, max: amount * 1.5, fractionDigits: 2})
      : 0;

    // Create schedule
    const [schedule] = await db
      .insert(schedules)
      .values({
        workspaceId,
        name,
        slug,
        status: "active",
        amount,
        amount_2,
        amount_type: amountType,
        recurring,
        auto_add: recurring ? faker.datatype.boolean() : false,
        payeeId,
        categoryId,
        accountId,
        budgetId: options.budgetId,
      })
      .returning();

    if (!schedule) {
      throw new Error(`Failed to create schedule: ${name}`);
    }

    // Create scheduleDate for recurring schedules
    if (recurring) {
      const scheduleDate = await createScheduleDate(schedule.id, frequency);
      if (!scheduleDate) {
        throw new Error(`Failed to create schedule date for schedule ${schedule.id}`);
      }
    }

    schedules_collection.push(schedule);
  }

  return schedules_collection;
};

/**
 * Creates a scheduleDate configuration for a schedule
 */
async function createScheduleDate(
  scheduleId: number,
  frequency: "daily" | "weekly" | "monthly" | "yearly"
): Promise<ScheduleDate | null> {
  const now = new Date();
  const startDate = now.toISOString().split("T")[0];

  // Calculate end date (1 year in future)
  const endDate = new Date(now);
  endDate.setFullYear(endDate.getFullYear() + 1);
  const endDateStr = endDate.toISOString().split("T")[0];

  const [scheduleDateRecord] = await db
    .insert(scheduleDates)
    .values({
      scheduleId,
      start: startDate,
      end: endDateStr,
      frequency,
      interval: 1,
      limit: 0, // Unlimited occurrences
      move_weekends: "none",
      move_holidays: "none",
      specific_dates: [],
      on: false,
      on_type: "day",
      days: generateDaysForFrequency(frequency),
      weeks: [],
      weeks_days: [],
      week_days: frequency === "weekly" ? [faker.number.int({min: 0, max: 6})] : [],
    })
    .returning();

  return scheduleDateRecord ?? null;
}

/**
 * Generate appropriate days based on frequency
 */
function generateDaysForFrequency(frequency: string): number[] {
  switch (frequency) {
    case "monthly":
      // Random day of month (1-28 to avoid month-end issues)
      return [faker.number.int({min: 1, max: 28})];
    case "yearly":
      // Random day of year
      return [faker.number.int({min: 1, max: 365})];
    case "weekly":
    case "daily":
    default:
      return [];
  }
}
