#!/usr/bin/env bun

/**
 * Migration script to merge subscriptions into schedules
 *
 * This script:
 * 1. Migrates existing subscription data to schedules with new subscription fields
 * 2. Copies subscription price history to schedule price history
 * 3. Preserves original subscription IDs for reference during transition
 *
 * Run with: bun run apps/budget/scripts/migrate-subscriptions-to-schedules.ts
 */

import { db } from "../src/lib/server/db";
import { schedules, schedulePriceHistory } from "../src/lib/schema";
import {
  subscriptions,
  subscriptionPriceHistory,
} from "../src/lib/schema/subscriptions-table";
import { scheduleDates } from "../src/lib/schema/schedule-dates";
import { eq, and, sql } from "drizzle-orm";
import type { ScheduleSubscriptionType, ScheduleSubscriptionStatus } from "../src/lib/schema/schedules";
import type { BillingCycle, SubscriptionType, SubscriptionStatus } from "../src/lib/schema/subscriptions";

console.log("🔄 Starting subscription to schedule migration...\n");

// Type mappings
function mapSubscriptionTypeToSchedule(type: SubscriptionType): ScheduleSubscriptionType {
  const mapping: Record<SubscriptionType, ScheduleSubscriptionType> = {
    entertainment: "entertainment",
    utilities: "utilities",
    software: "software",
    membership: "membership",
    communication: "communication",
    finance: "finance",
    shopping: "shopping",
    health: "health",
    education: "education",
    other: "other",
  };
  return mapping[type] ?? "other";
}

function mapSubscriptionStatusToSchedule(status: SubscriptionStatus): ScheduleSubscriptionStatus {
  const mapping: Record<SubscriptionStatus, ScheduleSubscriptionStatus> = {
    active: "active",
    paused: "paused",
    cancelled: "cancelled",
    trial: "trial",
    pending_cancellation: "pending_cancellation",
  };
  return mapping[status] ?? "active";
}

function mapBillingCycleToFrequency(cycle: BillingCycle): string {
  const mapping: Record<BillingCycle, string> = {
    daily: "daily",
    weekly: "weekly",
    biweekly: "biweekly",
    monthly: "monthly",
    quarterly: "quarterly",
    semi_annual: "semi_annual",
    annual: "yearly",
    irregular: "monthly", // Default irregular to monthly
  };
  return mapping[cycle] ?? "monthly";
}

interface MigrationStats {
  subscriptionsProcessed: number;
  schedulesCreated: number;
  schedulesUpdated: number;
  priceHistoryMigrated: number;
  errors: Array<{ subscriptionId: number; error: string }>;
}

async function migrateSubscriptionsToSchedules(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    subscriptionsProcessed: 0,
    schedulesCreated: 0,
    schedulesUpdated: 0,
    priceHistoryMigrated: 0,
    errors: [],
  };

  try {
    // 1. Get all subscriptions
    console.log("📋 Fetching subscriptions...");
    const allSubscriptions = await db.select().from(subscriptions);
    console.log(`   Found ${allSubscriptions.length} subscriptions to migrate\n`);

    if (allSubscriptions.length === 0) {
      console.log("✓ No subscriptions to migrate\n");
      return stats;
    }

    // 2. Process each subscription
    for (const sub of allSubscriptions) {
      stats.subscriptionsProcessed++;
      console.log(`\n📦 Processing subscription: ${sub.name} (ID: ${sub.id})`);

      try {
        // Check if schedule already exists for this payee + account
        let existingSchedule = null;
        if (sub.payeeId && sub.accountId) {
          existingSchedule = await db.query.schedules.findFirst({
            where: and(
              eq(schedules.payeeId, sub.payeeId),
              eq(schedules.accountId, sub.accountId)
            ),
          });
        }

        let scheduleId: number;

        if (existingSchedule) {
          // Update existing schedule with subscription data
          console.log(`   Updating existing schedule: ${existingSchedule.name} (ID: ${existingSchedule.id})`);

          await db
            .update(schedules)
            .set({
              isSubscription: true,
              subscriptionType: mapSubscriptionTypeToSchedule(sub.type),
              subscriptionStatus: mapSubscriptionStatusToSchedule(sub.status),
              lastKnownAmount: sub.amount,
              detectionConfidence: sub.detectionConfidence ?? undefined,
              isUserConfirmed: sub.isUserConfirmed ?? false,
              detectedAt: sub.createdAt,
              alertPreferences: sub.alertPreferences ? JSON.stringify(sub.alertPreferences) : undefined,
            })
            .where(eq(schedules.id, existingSchedule.id));

          scheduleId = existingSchedule.id;
          stats.schedulesUpdated++;
          console.log(`   ✓ Schedule updated`);
        } else {
          // Create new schedule from subscription
          if (!sub.payeeId || !sub.accountId) {
            console.log(`   ⚠ Skipping: Missing payeeId or accountId`);
            stats.errors.push({
              subscriptionId: sub.id,
              error: "Missing payeeId or accountId",
            });
            continue;
          }

          // Create a schedule date for the renewal
          let dateId: number | undefined;
          if (sub.renewalDate) {
            const renewalDate = new Date(sub.renewalDate);
            const [existingDate] = await db
              .insert(scheduleDates)
              .values({
                year: renewalDate.getFullYear(),
                month: renewalDate.getMonth() + 1,
                day: renewalDate.getDate(),
                frequency: mapBillingCycleToFrequency(sub.billingCycle),
                frequencyCount: 1,
                frequencySkip: 0,
              })
              .returning();
            dateId = existingDate?.id;
          }

          // Generate unique slug
          const baseSlug = sub.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30);
          const timestamp = Date.now().toString(36);
          const slug = `${baseSlug}-${timestamp}`;

          // Create the schedule
          const [newSchedule] = await db
            .insert(schedules)
            .values({
              workspaceId: sub.workspaceId,
              name: sub.name,
              slug,
              status: sub.status === "cancelled" || sub.status === "paused" ? "inactive" : "active",
              amount: sub.amount,
              amount_2: 0,
              amount_type: "exact",
              recurring: true,
              auto_add: false,
              dateId,
              payeeId: sub.payeeId,
              accountId: sub.accountId,
              // Subscription fields
              isSubscription: true,
              subscriptionType: mapSubscriptionTypeToSchedule(sub.type),
              subscriptionStatus: mapSubscriptionStatusToSchedule(sub.status),
              lastKnownAmount: sub.amount,
              detectionConfidence: sub.detectionConfidence ?? undefined,
              isUserConfirmed: sub.isUserConfirmed ?? false,
              detectedAt: sub.createdAt,
              alertPreferences: sub.alertPreferences ? JSON.stringify(sub.alertPreferences) : undefined,
            })
            .returning();

          scheduleId = newSchedule!.id;
          stats.schedulesCreated++;
          console.log(`   ✓ Created new schedule (ID: ${scheduleId})`);
        }

        // 3. Migrate price history
        const priceHistory = await db
          .select()
          .from(subscriptionPriceHistory)
          .where(eq(subscriptionPriceHistory.subscriptionId, sub.id));

        if (priceHistory.length > 0) {
          console.log(`   Migrating ${priceHistory.length} price history records...`);

          for (const ph of priceHistory) {
            await db.insert(schedulePriceHistory).values({
              scheduleId,
              amount: ph.amount,
              previousAmount: ph.previousAmount,
              effectiveDate: ph.effectiveDate,
              changeType: ph.changeType,
              changePercentage: ph.changePercentage,
              detectedFromTransactionId: ph.detectedFromTransactionId,
            });
            stats.priceHistoryMigrated++;
          }
          console.log(`   ✓ Price history migrated`);
        }

        // 4. Mark the original subscription as migrated (soft metadata)
        await db
          .update(subscriptions)
          .set({
            metadata: {
              ...(sub.metadata ?? {}),
              migratedToScheduleId: scheduleId,
              migratedAt: new Date().toISOString(),
            },
          })
          .where(eq(subscriptions.id, sub.id));

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.log(`   ❌ Error: ${errorMessage}`);
        stats.errors.push({
          subscriptionId: sub.id,
          error: errorMessage,
        });
      }
    }

    return stats;
  } catch (error) {
    console.error("Fatal error during migration:", error);
    throw error;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("Subscription to Schedule Migration");
  console.log("=".repeat(60));
  console.log("");

  const stats = await migrateSubscriptionsToSchedules();

  console.log("\n" + "=".repeat(60));
  console.log("Migration Complete!");
  console.log("=".repeat(60));
  console.log(`
📊 Summary:
   Subscriptions processed: ${stats.subscriptionsProcessed}
   Schedules created:       ${stats.schedulesCreated}
   Schedules updated:       ${stats.schedulesUpdated}
   Price history migrated:  ${stats.priceHistoryMigrated}
   Errors:                  ${stats.errors.length}
`);

  if (stats.errors.length > 0) {
    console.log("❌ Errors:");
    for (const err of stats.errors) {
      console.log(`   - Subscription ${err.subscriptionId}: ${err.error}`);
    }
  }

  console.log("\n✅ Migration completed successfully!");
  console.log("\nNext steps:");
  console.log("1. Verify migrated data in the schedules table");
  console.log("2. Update UI to use schedules for subscription features");
  console.log("3. After verification, subscription tables can be deprecated");
}

main().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
