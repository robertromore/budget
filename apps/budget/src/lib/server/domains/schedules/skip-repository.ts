import { scheduleSkips } from "$lib/schema";
import type { NewScheduleSkip, ScheduleSkip } from "$lib/schema/schedule-skips";
import { db } from "$lib/server/db";
import { and, eq } from "drizzle-orm";

export class ScheduleSkipRepository {
  /**
   * Get all skips for a schedule, ordered by creation date (newest first)
   */
  async getSkipsForSchedule(scheduleId: number): Promise<ScheduleSkip[]> {
    return await db.query.scheduleSkips.findMany({
      where: eq(scheduleSkips.scheduleId, scheduleId),
      orderBy: (skips, { desc }) => [desc(skips.createdAt)],
    });
  }

  /**
   * Get skipped dates as a Set for efficient lookup during date calculation
   * Only returns dates with skipType === 'single' (push_forward affects offset, not filtering)
   */
  async getSingleSkippedDatesSet(scheduleId: number): Promise<Set<string>> {
    const skips = await db.query.scheduleSkips.findMany({
      where: and(
        eq(scheduleSkips.scheduleId, scheduleId),
        eq(scheduleSkips.skipType, "single")
      ),
    });
    return new Set(skips.map((skip) => skip.skippedDate));
  }

  /**
   * Count push_forward skips for a schedule (determines total offset)
   */
  async countPushForwardSkips(scheduleId: number): Promise<number> {
    const skips = await db.query.scheduleSkips.findMany({
      where: and(
        eq(scheduleSkips.scheduleId, scheduleId),
        eq(scheduleSkips.skipType, "push_forward")
      ),
    });
    return skips.length;
  }

  /**
   * Check if a specific date is already skipped for a schedule
   */
  async isDateSkipped(scheduleId: number, date: string): Promise<boolean> {
    const existing = await db.query.scheduleSkips.findFirst({
      where: and(
        eq(scheduleSkips.scheduleId, scheduleId),
        eq(scheduleSkips.skippedDate, date)
      ),
    });
    return !!existing;
  }

  /**
   * Create a new skip record
   */
  async createSkip(data: NewScheduleSkip): Promise<ScheduleSkip> {
    const [skip] = await db.insert(scheduleSkips).values(data).returning();
    return skip!;
  }

  /**
   * Remove a skip record (un-skip / restore)
   */
  async removeSkip(id: number): Promise<void> {
    await db.delete(scheduleSkips).where(eq(scheduleSkips.id, id));
  }

  /**
   * Get a skip by ID
   */
  async getSkipById(id: number): Promise<ScheduleSkip | undefined> {
    return await db.query.scheduleSkips.findFirst({
      where: eq(scheduleSkips.id, id),
    });
  }
}
