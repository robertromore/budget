import type { Category, Payee, ScheduleSkip } from "$lib/schema";
import { logger } from "$lib/server/shared/logging";
import { NotFoundError, ValidationError } from "$lib/server/shared/types/errors";
import { nowISOString } from "$lib/utils/dates";
import { CategoryService } from "../categories/services";
import { PayeeService } from "../payees/services";
import { TransactionService, type CreateTransactionData } from "../transactions/services";
import { ScheduleRepository, type ScheduleWithDetails } from "./repository";
import { ScheduleSkipRepository } from "./skip-repository";

export interface AutoAddResult {
  scheduleId: number;
  scheduleName: string;
  transactionsCreated: number;
  nextDueDate: string | null;
  errors: string[];
}

export interface AutoAddSummary {
  totalSchedulesProcessed: number;
  totalTransactionsCreated: number;
  results: AutoAddResult[];
  errors: string[];
}

export interface UpcomingScheduledTransaction {
  id: string; // Unique identifier combining schedule ID and date
  scheduleId: number;
  scheduleName: string;
  scheduleSlug: string;
  accountId: number;
  amount: number;
  date: string;
  payeeId: number | null;
  categoryId: number | null;
  payee: Payee | null;
  category: Category | null;
  notes: string;
  status: "scheduled";
  createdAt: string;
  updatedAt: string;
  deletedAt: null;
  balance: null;
  // Schedule metadata for preview
  scheduleFrequency?: string | undefined;
  scheduleInterval?: number | undefined;
  scheduleNextOccurrence?: string | undefined;
}

interface FrequencyLimits {
  maxOccurrences: number;
  maxDaysAhead: number;
}

const FREQUENCY_DISPLAY_LIMITS: Record<string, FrequencyLimits> = {
  daily: { maxOccurrences: 7, maxDaysAhead: 14 },
  weekly: { maxOccurrences: 6, maxDaysAhead: 45 },
  monthly: { maxOccurrences: 6, maxDaysAhead: 180 },
  yearly: { maxOccurrences: 3, maxDaysAhead: 1095 },
};

/**
 * Schedule service containing business logic
 *
 * Dependencies are injected via constructor for testability.
 * Use ServiceFactory to instantiate in production code.
 */
export class ScheduleService {
  constructor(
    private repository: ScheduleRepository,
    private skipRepository: ScheduleSkipRepository,
    private transactionService: TransactionService,
    private payeeService: PayeeService,
    private categoryService: CategoryService
  ) {}

  /**
   * Execute auto-add for all active schedules
   */
  async executeAutoAddForAllSchedules(): Promise<AutoAddSummary> {
    const schedules = await this.repository.getActiveAutoAddSchedules();
    const results: AutoAddResult[] = [];
    const globalErrors: string[] = [];
    let totalTransactionsCreated = 0;

    for (const schedule of schedules) {
      try {
        const result = await this.executeAutoAddForSchedule(schedule.id);
        results.push(result);
        totalTransactionsCreated += result.transactionsCreated;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        globalErrors.push(`Schedule "${schedule.name}": ${errorMessage}`);
        results.push({
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          transactionsCreated: 0,
          nextDueDate: null,
          errors: [errorMessage],
        });
      }
    }

    return {
      totalSchedulesProcessed: schedules.length,
      totalTransactionsCreated,
      results,
      errors: globalErrors,
    };
  }

  /**
   * Execute auto-add for a specific schedule
   */
  async executeAutoAddForSchedule(scheduleId: number): Promise<AutoAddResult> {
    const schedule = await this.repository.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    if (schedule.status !== "active" || !schedule.auto_add) {
      throw new ValidationError("Schedule is not active or auto-add is disabled");
    }

    if (!schedule.scheduleDate) {
      throw new ValidationError("Schedule has no date configuration");
    }

    const result: AutoAddResult = {
      scheduleId: schedule.id,
      scheduleName: schedule.name,
      transactionsCreated: 0,
      nextDueDate: null,
      errors: [],
    };

    try {
      // Calculate due dates that need transactions
      const dueDates = await this.calculateDueDates(schedule);

      for (const dueDate of dueDates) {
        // Check if transaction already exists for this date
        const hasTransaction = await this.repository.hasTransactionForDate(schedule.id, dueDate);

        if (!hasTransaction) {
          // Create transaction
          await this.createTransactionFromSchedule(schedule, dueDate);
          result.transactionsCreated++;
        }
      }

      // Calculate next due date
      result.nextDueDate = this.calculateNextDueDate(schedule);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      result.errors.push(errorMessage);
    }

    return result;
  }

  /**
   * Calculate dates that are due for transaction creation
   */
  private async calculateDueDates(schedule: ScheduleWithDetails): Promise<string[]> {
    if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) {
      return [];
    }

    const today = new Date();
    const todayString = today.toISOString().split("T")[0];
    const startDate = new Date(schedule.scheduleDate.start);
    const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;
    const frequency = schedule.scheduleDate.frequency;
    const interval = schedule.scheduleDate.interval || 1;

    // Additional type guard for frequency
    if (!frequency) {
      return [];
    }

    const dueDates: string[] = [];

    // Find the first date on or after today
    let currentDate = new Date(startDate);

    // Fast-forward to today if start date is in the past
    while (currentDate < today) {
      if (!frequency) break;
      this.addInterval(currentDate, frequency, interval);
    }

    // Only include today's date if it matches the schedule
    const currentDateString = currentDate.toISOString().split("T")[0];
    if (
      currentDateString &&
      currentDateString === todayString &&
      (!endDate || currentDate <= endDate)
    ) {
      dueDates.push(currentDateString);
    }

    return dueDates;
  }

  /**
   * Calculate the next due date for a schedule
   */
  private calculateNextDueDate(schedule: ScheduleWithDetails): string | null {
    if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) {
      return null;
    }

    const today = new Date();
    const startDate = new Date(schedule.scheduleDate.start);
    const endDate = schedule.scheduleDate.end ? new Date(schedule.scheduleDate.end) : null;
    const frequency = schedule.scheduleDate.frequency;
    const interval = schedule.scheduleDate.interval || 1;

    // Additional type guard for frequency
    if (!frequency) {
      return null;
    }

    let nextDate = new Date(startDate);

    // Find the first future date
    while (nextDate <= today) {
      if (!frequency) break;
      this.addInterval(nextDate, frequency, interval);
    }

    // Check if it's within the end date
    if (endDate && nextDate > endDate) {
      return null;
    }

    return nextDate.toISOString().split("T")[0] || null;
  }

  /**
   * Add interval to a date based on frequency
   */
  private addInterval(date: Date, frequency: string, interval: number): void {
    switch (frequency) {
      case "daily":
        date.setDate(date.getDate() + interval);
        break;
      case "weekly":
        date.setDate(date.getDate() + 7 * interval);
        break;
      case "monthly":
        date.setMonth(date.getMonth() + interval);
        break;
      case "yearly":
        date.setFullYear(date.getFullYear() + interval);
        break;
      default:
        throw new ValidationError(`Unsupported frequency: ${frequency}`);
    }
  }

  /**
   * Create a transaction from a schedule
   */
  private async createTransactionFromSchedule(
    schedule: ScheduleWithDetails,
    date: string
  ): Promise<number> {
    // Determine amount based on amount_type
    let amount = schedule.amount;
    if (schedule.amount_type === "range") {
      // For range, use the average of min and max
      amount = (schedule.amount + schedule.amount_2) / 2;
    }
    // For "approximate" and "exact", use the base amount

    const transactionData: CreateTransactionData = {
      accountId: schedule.accountId,
      amount: amount,
      date: date,
      payeeId: schedule.payeeId,
      categoryId: schedule.categoryId,
      notes: `Auto-created from schedule: ${schedule.name}`,
      status: "cleared" as const,
      scheduleId: schedule.id,
    };

    const transaction = await this.transactionService.createTransaction(
      transactionData,
      schedule.workspaceId
    );
    return transaction.id;
  }

  /**
   * Get schedule by ID with details
   */
  async getScheduleById(scheduleId: number): Promise<ScheduleWithDetails> {
    const schedule = await this.repository.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }
    return schedule;
  }

  /**
   * Preview what transactions would be created for a schedule
   */
  async previewAutoAddForSchedule(scheduleId: number): Promise<{
    schedule: ScheduleWithDetails;
    dueDates: string[];
    nextDueDate: string | null;
    estimatedTransactions: number;
  }> {
    const schedule = await this.repository.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    const dueDates = await this.calculateDueDates(schedule);
    const nextDueDate = this.calculateNextDueDate(schedule);

    // Filter out dates that already have transactions
    let estimatedTransactions = 0;
    for (const date of dueDates) {
      const hasTransaction = await this.repository.hasTransactionForDate(schedule.id, date);
      if (!hasTransaction) {
        estimatedTransactions++;
      }
    }

    return {
      schedule,
      dueDates,
      nextDueDate,
      estimatedTransactions,
    };
  }

  /**
   * Get upcoming scheduled transactions for an account
   * Shows transactions that will be created in the near future with intelligent frequency-based limits
   * Only includes schedules with auto_add enabled
   */
  async getUpcomingScheduledTransactionsForAccount(
    accountId: number,
    useSmartLimits: boolean = true
  ): Promise<UpcomingScheduledTransaction[]> {
    // Get all active schedules with auto_add enabled for this account
    const schedules = await this.repository.getActiveAutoAddSchedules();
    const accountSchedules = schedules.filter((schedule) => schedule.accountId === accountId);

    const upcomingTransactions: UpcomingScheduledTransaction[] = [];

    for (const schedule of accountSchedules) {
      try {
        // Determine limits based on frequency if smart limits are enabled
        let daysAhead = 30; // Default fallback
        let maxOccurrences: number | undefined;

        if (useSmartLimits && schedule.scheduleDate?.frequency) {
          const limits = FREQUENCY_DISPLAY_LIMITS[schedule.scheduleDate.frequency];
          if (limits) {
            daysAhead = limits.maxDaysAhead;
            maxOccurrences = limits.maxOccurrences;
          }
        }

        // Get upcoming dates for this schedule within our calculated window
        let upcomingDates = await this.calculateUpcomingDates(
          schedule,
          daysAhead,
          maxOccurrences
        );

        // Apply skip logic: filter out single-skipped dates and apply push_forward offset
        const skippedDatesSet = await this.skipRepository.getSingleSkippedDatesSet(schedule.id);
        const pushForwardOffset = await this.skipRepository.countPushForwardSkips(schedule.id);

        // Filter out single-skipped dates
        upcomingDates = upcomingDates.filter((date) => !skippedDatesSet.has(date));

        // Apply push_forward offset: shift all dates forward by (offset × interval)
        if (pushForwardOffset > 0 && schedule.scheduleDate?.frequency) {
          upcomingDates = upcomingDates.map((dateStr) => {
            const date = new Date(dateStr);
            for (let i = 0; i < pushForwardOffset; i++) {
              this.addInterval(date, schedule.scheduleDate!.frequency!, schedule.scheduleDate!.interval || 1);
            }
            return date.toISOString().split("T")[0]!;
          });
        }

        for (const date of upcomingDates) {
          // Check if transaction already exists for this date
          const hasTransaction = await this.repository.hasTransactionForDate(schedule.id, date);

          if (!hasTransaction) {
            // Determine amount based on amount_type
            let amount = schedule.amount;
            if (schedule.amount_type === "range") {
              amount = (schedule.amount + schedule.amount_2) / 2;
            }

            // Load payee object if payeeId exists
            let payee: Payee | null = null;
            if (schedule.payeeId) {
              try {
                payee = await this.payeeService.getPayeeById(
                  schedule.payeeId,
                  schedule.workspaceId
                );
              } catch (error) {
                logger.warn("Failed to load payee for schedule", {
                  error,
                  payeeId: schedule.payeeId,
                  scheduleId: schedule.id,
                });
                payee = null;
              }
            }

            // Load category object if categoryId exists
            let category: Category | null = null;
            if (schedule.categoryId) {
              try {
                category = await this.categoryService.getCategoryById(
                  schedule.categoryId,
                  schedule.workspaceId
                );
              } catch (error) {
                logger.warn("Failed to load category for schedule", {
                  error,
                  categoryId: schedule.categoryId,
                  scheduleId: schedule.id,
                });
                category = null;
              }
            }

            // Calculate next occurrence for this schedule
            const nextOccurrence = this.calculateNextDueDate(schedule);

            // Create virtual upcoming transaction
            const upcomingTransaction: UpcomingScheduledTransaction = {
              id: `schedule-${schedule.id}-${date}`,
              scheduleId: schedule.id,
              scheduleName: schedule.name,
              scheduleSlug: schedule.slug,
              accountId: schedule.accountId,
              amount: amount,
              date: date,
              payeeId: schedule.payeeId,
              categoryId: schedule.categoryId,
              payee: payee,
              category: category,
              notes: `Scheduled: ${schedule.name}`,
              status: "scheduled",
              createdAt: nowISOString(),
              updatedAt: nowISOString(),
              deletedAt: null,
              balance: null,
              // Schedule metadata for preview
              scheduleFrequency: schedule.scheduleDate?.frequency || undefined,
              scheduleInterval: schedule.scheduleDate?.interval || 1,
              scheduleNextOccurrence: nextOccurrence || undefined,
            };

            upcomingTransactions.push(upcomingTransaction);
          }
        }
      } catch (error) {
        // Skip schedules with errors (e.g., invalid date configuration)
        logger.warn("Skipping schedule due to error", { error, scheduleId: schedule.id });
      }
    }

    // Sort by date (earliest first)
    return upcomingTransactions.sort((a, b) => a.date.localeCompare(b.date));
  }

  /**
   * Calculate upcoming dates for a schedule within a specified window
   */
  private async calculateUpcomingDates(
    schedule: ScheduleWithDetails,
    daysAhead: number,
    maxOccurrences?: number
  ): Promise<string[]> {
    if (!schedule.scheduleDate || !schedule.scheduleDate.frequency) {
      return [];
    }

    const frequency = schedule.scheduleDate.frequency;

    // Handle monthly schedules with specific days
    if (
      frequency === "monthly" &&
      schedule.scheduleDate.on &&
      schedule.scheduleDate.on_type === "day" &&
      schedule.scheduleDate.days &&
      Array.isArray(schedule.scheduleDate.days) &&
      schedule.scheduleDate.days.length > 0
    ) {
      return this.calculateMonthlyOnDayDates(schedule, daysAhead, maxOccurrences);
    }

    // Fall back to basic frequency-based calculation
    return this.calculateBasicFrequencyDates(schedule, daysAhead, maxOccurrences);
  }

  /**
   * Calculate dates for monthly schedules with specific days (e.g., 10th and 25th)
   */
  private calculateMonthlyOnDayDates(
    schedule: ScheduleWithDetails,
    daysAhead: number,
    maxOccurrences?: number
  ): string[] {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAhead);

    const startDate = new Date(schedule.scheduleDate!.start);
    const scheduleEndDate = schedule.scheduleDate!.end
      ? new Date(schedule.scheduleDate!.end)
      : null;
    const interval = schedule.scheduleDate!.interval || 1;
    const days = schedule.scheduleDate!.days as number[];

    const upcomingDates: string[] = [];

    // Start from the month of the start date or today, whichever is later
    let currentMonth = new Date(Math.max(startDate.getTime(), today.getTime()));
    currentMonth.setDate(1); // Set to first day of month

    let loopCount = 0;
    const safetyLimit = 50; // Safety limit to prevent infinite loops

    while (loopCount < safetyLimit) {
      loopCount++;

      // For each day in the days array
      for (const day of days) {
        // Create date for this day in the current month
        const candidateDate = new Date(currentMonth);
        candidateDate.setDate(day);

        // Skip if date is before start date, before today, or after end window
        if (candidateDate < startDate || candidateDate < today || candidateDate > endDate) {
          continue;
        }

        // Skip if date is after schedule end date
        if (scheduleEndDate && candidateDate > scheduleEndDate) {
          continue;
        }

        // Check if we've reached the maximum occurrences limit
        if (maxOccurrences && upcomingDates.length >= maxOccurrences) {
          return upcomingDates;
        }

        const dateString = candidateDate.toISOString().split("T")[0];
        if (dateString) {
          upcomingDates.push(dateString);
        }
      }

      // Move to next month (respecting interval)
      currentMonth.setMonth(currentMonth.getMonth() + interval);

      // Stop if we've moved past the end window
      if (currentMonth > endDate) {
        break;
      }
    }

    // Sort dates chronologically
    return upcomingDates.sort((a, b) => a.localeCompare(b));
  }

  /**
   * Calculate dates using basic frequency-based logic (daily, weekly, monthly without specific days, yearly)
   */
  private calculateBasicFrequencyDates(
    schedule: ScheduleWithDetails,
    daysAhead: number,
    maxOccurrences?: number
  ): string[] {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + daysAhead);

    const startDate = new Date(schedule.scheduleDate!.start);
    const scheduleEndDate = schedule.scheduleDate!.end
      ? new Date(schedule.scheduleDate!.end)
      : null;
    const frequency = schedule.scheduleDate!.frequency;
    const interval = schedule.scheduleDate!.interval || 1;

    // Early return if frequency is null
    if (!frequency) {
      return [];
    }

    const upcomingDates: string[] = [];

    // Start from today if start date is in the past, otherwise start from the start date
    let currentDate = new Date(Math.max(startDate.getTime(), today.getTime()));

    // If start date is in the future and within our window, include it
    if (startDate > today && startDate <= endDate) {
      currentDate = new Date(startDate);
    } else if (startDate < today) {
      // Fast-forward to the next occurrence after today
      currentDate = new Date(startDate);
      while (currentDate < today) {
        if (!frequency) break;
        this.addInterval(currentDate, frequency, interval);
      }
    }

    // Collect dates within our window
    let loopCount = 0;
    const safetyLimit = 50; // Safety limit to prevent infinite loops
    while (currentDate <= endDate && loopCount < safetyLimit) {
      loopCount++;

      // Check if it's within the schedule's end date
      if (scheduleEndDate && currentDate > scheduleEndDate) {
        break;
      }

      // Check if we've reached the maximum occurrences limit
      if (maxOccurrences && upcomingDates.length >= maxOccurrences) {
        break;
      }

      const dateString = currentDate.toISOString().split("T")[0];
      if (dateString) {
        upcomingDates.push(dateString);
      }

      // Move to next occurrence
      if (!frequency) break;
      this.addInterval(currentDate, frequency, interval);
    }

    return upcomingDates;
  }

  // ==========================================
  // Skip-related methods
  // ==========================================

  /**
   * Skip a single occurrence of a scheduled transaction
   */
  async skipSingleOccurrence(
    scheduleId: number,
    skippedDate: string,
    workspaceId: number,
    reason?: string
  ): Promise<ScheduleSkip> {
    const schedule = await this.repository.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    // Check if already skipped
    const isAlreadySkipped = await this.skipRepository.isDateSkipped(scheduleId, skippedDate);
    if (isAlreadySkipped) {
      throw new ValidationError("This date is already skipped");
    }

    return await this.skipRepository.createSkip({
      workspaceId,
      scheduleId,
      skippedDate,
      skipType: "single",
      reason: reason || null,
    });
  }

  /**
   * Push all future dates forward by one interval (reversible)
   * This records a skip with skipType "push_forward" which affects date calculation
   */
  async pushDatesForward(
    scheduleId: number,
    skippedDate: string,
    workspaceId: number,
    reason?: string
  ): Promise<ScheduleSkip> {
    const schedule = await this.repository.getScheduleById(scheduleId);
    if (!schedule) {
      throw new NotFoundError("Schedule not found");
    }

    if (!schedule.scheduleDate?.frequency) {
      throw new ValidationError("Schedule has no frequency configuration");
    }

    return await this.skipRepository.createSkip({
      workspaceId,
      scheduleId,
      skippedDate,
      skipType: "push_forward",
      reason: reason || null,
    });
  }

  /**
   * Remove a skip (un-skip / restore a date)
   */
  async removeSkip(skipId: number, workspaceId: number): Promise<void> {
    const skip = await this.skipRepository.getSkipById(skipId);
    if (!skip) {
      throw new NotFoundError("Skip record not found");
    }
    if (skip.workspaceId !== workspaceId) {
      throw new ValidationError("Unauthorized to remove this skip");
    }
    await this.skipRepository.removeSkip(skipId);
  }

  /**
   * Get skip history for a schedule
   */
  async getSkipHistory(scheduleId: number): Promise<ScheduleSkip[]> {
    return await this.skipRepository.getSkipsForSchedule(scheduleId);
  }

  /**
   * Get skipped dates set for a schedule (single skips only, for filtering)
   */
  async getSkippedDatesSet(scheduleId: number): Promise<Set<string>> {
    return await this.skipRepository.getSingleSkippedDatesSet(scheduleId);
  }

  /**
   * Count push_forward skips for offset calculation
   */
  async getPushForwardOffset(scheduleId: number): Promise<number> {
    return await this.skipRepository.countPushForwardSkips(scheduleId);
  }
}
