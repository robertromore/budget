/**
 * Browser-based auto-scheduler for creating scheduled transactions
 * Runs automatically when users load the app - no external dependencies required
 *
 * Note: This runs outside of Svelte component context, so we use trpc() directly
 * instead of the query layer (which requires component context for TanStack Query).
 */

import { trpc } from "$lib/trpc/client";

class AutoScheduler {
  private static readonly STORAGE_KEY = "budget-app-last-auto-add-run";
  private static readonly RETRY_DELAY = 5000; // 5 seconds
  private static readonly MAX_RETRIES = 3;

  /**
   * Check if auto-add should run today and execute if needed
   */
  async checkAndRunDailyAutoAdd(): Promise<void> {
    try {
      const today = this.getTodayString();
      const lastRun = this.getLastRunDate();

      // Only run once per day
      if (lastRun === today) {
        console.log("📅 Auto-add already ran today");
        return;
      }

      console.log("🔄 Running daily auto-add for scheduled transactions...");

      // Execute auto-add for all eligible schedules
      // Using trpc() directly since this runs outside component context
      const result = await trpc().scheduleRoutes.executeAutoAddAll.mutate();

      // Log results
      if (result.totalTransactionsCreated > 0) {
        console.log(
          `✅ Auto-add completed: Created ${result.totalTransactionsCreated} transactions from ${result.totalSchedulesProcessed} schedules`
        );
      } else {
        console.log(
          `✅ Auto-add completed: No new transactions needed (checked ${result.totalSchedulesProcessed} schedules)`
        );
      }

      // Mark as completed for today
      this.setLastRunDate(today);
    } catch (error) {
      console.error("❌ Auto-add failed:", error);
      // Don't mark as completed on failure - will retry next time app is opened
    }
  }

  /**
   * Run auto-add with retry logic for reliability
   */
  async runWithRetries(retryCount = 0): Promise<void> {
    try {
      await this.checkAndRunDailyAutoAdd();
    } catch (error) {
      if (retryCount < AutoScheduler.MAX_RETRIES) {
        console.log(
          `🔄 Auto-add failed, retrying in ${AutoScheduler.RETRY_DELAY / 1000}s... (attempt ${retryCount + 1}/${AutoScheduler.MAX_RETRIES})`
        );
        setTimeout(() => {
          this.runWithRetries(retryCount + 1);
        }, AutoScheduler.RETRY_DELAY);
      } else {
        console.error("❌ Auto-add failed after maximum retries");
      }
    }
  }

  /**
   * Get today's date as YYYY-MM-DD string
   */
  private getTodayString(): string {
    return new Date().toISOString().split("T")[0];
  }

  /**
   * Get the last run date from localStorage
   */
  private getLastRunDate(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(AutoScheduler.STORAGE_KEY);
  }

  /**
   * Set the last run date in localStorage
   */
  private setLastRunDate(date: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(AutoScheduler.STORAGE_KEY, date);
  }

  /**
   * Manually trigger auto-add (for testing or user-initiated runs)
   */
  async forceRun(): Promise<void> {
    console.log("🔄 Manually triggering auto-add...");
    try {
      // Using trpc() directly since this may run outside component context
      const result = await trpc().scheduleRoutes.executeAutoAddAll.mutate();

      if (result.totalTransactionsCreated > 0) {
        console.log(
          `✅ Manual auto-add completed: Created ${result.totalTransactionsCreated} transactions`
        );
      } else {
        console.log(`✅ Manual auto-add completed: No new transactions needed`);
      }

      // Mark as completed for today
      this.setLastRunDate(this.getTodayString());
    } catch (error) {
      console.error("❌ Manual auto-add failed:", error);
      throw error;
    }
  }

  /**
   * Reset the last run date (for testing)
   */
  reset(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(AutoScheduler.STORAGE_KEY);
    console.log("🔄 Auto-add scheduler reset");
  }

  /**
   * Get status information
   */
  getStatus(): { lastRun: string | null; shouldRunToday: boolean } {
    const lastRun = this.getLastRunDate();
    const today = this.getTodayString();
    return {
      lastRun,
      shouldRunToday: lastRun !== today,
    };
  }
}

// Export singleton instance
export const autoScheduler = new AutoScheduler();
