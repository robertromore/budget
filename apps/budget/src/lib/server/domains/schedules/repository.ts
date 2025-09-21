import { db } from "$lib/server/db";
import { schedules, transactions } from "$lib/schema";
import { eq, and } from "drizzle-orm";
import type { Schedule } from "$lib/schema/schedules";
import type { NewTransaction } from "$lib/schema/transactions";

export interface ScheduleWithDetails extends Schedule {
  account: { id: number; name: string | null };
  payee: { id: number; name: string | null };
  category: { id: number; name: string | null } | null;
  scheduleDate: {
    id: number;
    start: string;
    end: string | null;
    frequency: "daily" | "weekly" | "monthly" | "yearly" | null;
    interval: number | null;
    limit: number | null;
    move_weekends: "none" | "next_weekday" | "previous_weekday" | null;
    move_holidays: "none" | "next_weekday" | "previous_weekday" | null;
    specific_dates: any;
    scheduleId: number;
  } | null;
}

export class ScheduleRepository {
  /**
   * Get all active schedules with auto_add enabled
   */
  async getActiveAutoAddSchedules(): Promise<ScheduleWithDetails[]> {
    return await db.query.schedules.findMany({
      where: and(
        eq(schedules.status, "active"),
        eq(schedules.auto_add, true)
      ),
      with: {
        account: true,
        payee: true,
        category: true,
        scheduleDate: true,
      },
    });
  }

  /**
   * Get a specific schedule by ID with all relations
   */
  async getScheduleById(id: number): Promise<ScheduleWithDetails | undefined> {
    return await db.query.schedules.findFirst({
      where: eq(schedules.id, id),
      with: {
        account: true,
        payee: true,
        category: true,
        scheduleDate: true,
      },
    });
  }

  /**
   * Check if a transaction already exists for a schedule on a specific date
   */
  async hasTransactionForDate(scheduleId: number, date: string): Promise<boolean> {
    const existingTransaction = await db.query.transactions.findFirst({
      where: and(
        eq(transactions.scheduleId, scheduleId),
        eq(transactions.date, date)
      ),
    });
    return !!existingTransaction;
  }

  /**
   * Create a new transaction from a schedule
   */
  async createTransactionFromSchedule(transactionData: NewTransaction): Promise<number> {
    const result = await db.insert(transactions).values(transactionData).returning({
      id: transactions.id,
    });
    return result[0]!.id;
  }

  /**
   * Get recent transactions for a schedule (for determining last execution)
   */
  async getRecentTransactionsForSchedule(scheduleId: number, limit: number = 5) {
    return await db.query.transactions.findMany({
      where: eq(transactions.scheduleId, scheduleId),
      orderBy: (transactions, { desc }) => [desc(transactions.date)],
      limit,
    });
  }
}