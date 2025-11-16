import { db } from "$lib/server/db";
import { users } from "$lib/schema/users";
import { accounts } from "$lib/schema/accounts";
import { categories } from "$lib/schema/categories";
import { categoryGroups } from "$lib/schema/category-groups";
import { payees } from "$lib/schema/payees";
import { schedules } from "$lib/schema/schedules";
import { views } from "$lib/schema/views";
import { budgetAutomationSettings } from "$lib/schema/budget-automation-settings";
import { budgetRecommendations } from "$lib/schema/recommendations";
import { detectedPatterns } from "$lib/schema/detected-patterns";
import { payeeCategoryCorrections } from "$lib/schema/payee-category-corrections";
import { eq, isNull } from "drizzle-orm";

/**
 * Migration: Add multi-user support
 *
 * This migration:
 * 1. Creates a default "Personal" user if none exists
 * 2. Assigns all existing data to this default user
 */
export async function migrateToMultiUser() {
  console.log("Starting multi-user migration...");

  // Step 1: Check if default user exists
  const [existingUser] = await db.select().from(users).limit(1);

  let defaultUserId: number;

  if (existingUser) {
    console.log(`Using existing user: ${existingUser.displayName} (ID: ${existingUser.id})`);
    defaultUserId = existingUser.id;
  } else {
    // Create default user
    const [newUser] = await db
      .insert(users)
      .values({
        displayName: "Personal",
        slug: "personal",
        email: null,
        preferences: JSON.stringify({
          locale: "en-US",
          currency: "USD",
          dateFormat: "MM/DD/YYYY",
          theme: "system",
        }),
      })
      .returning();

    console.log(`Created default user: ${newUser.displayName} (ID: ${newUser.id})`);
    defaultUserId = newUser.id;
  }

  // Step 2: Update all existing data to belong to default user
  // Only update rows where userId is NULL
  console.log("Assigning existing data to default user...");

  const accountsUpdated = await db
    .update(accounts)
    .set({ userId: defaultUserId })
    .where(isNull(accounts.userId));
  console.log(`  ✓ Accounts updated: ${accountsUpdated.changes} rows`);

  const categoriesUpdated = await db
    .update(categories)
    .set({ userId: defaultUserId })
    .where(isNull(categories.userId));
  console.log(`  ✓ Categories updated: ${categoriesUpdated.changes} rows`);

  const categoryGroupsUpdated = await db
    .update(categoryGroups)
    .set({ userId: defaultUserId })
    .where(isNull(categoryGroups.userId));
  console.log(`  ✓ Category groups updated: ${categoryGroupsUpdated.changes} rows`);

  const payeesUpdated = await db
    .update(payees)
    .set({ userId: defaultUserId })
    .where(isNull(payees.userId));
  console.log(`  ✓ Payees updated: ${payeesUpdated.changes} rows`);

  const schedulesUpdated = await db
    .update(schedules)
    .set({ userId: defaultUserId })
    .where(isNull(schedules.userId));
  console.log(`  ✓ Schedules updated: ${schedulesUpdated.changes} rows`);

  const viewsUpdated = await db
    .update(views)
    .set({ userId: defaultUserId })
    .where(isNull(views.userId));
  console.log(`  ✓ Views updated: ${viewsUpdated.changes} rows`);

  // These tables might not have any data yet
  try {
    const automationUpdated = await db
      .update(budgetAutomationSettings)
      .set({ userId: defaultUserId })
      .where(isNull(budgetAutomationSettings.userId));
    console.log(`  ✓ Budget automation settings updated: ${automationUpdated.changes} rows`);
  } catch (e) {
    console.log("  ⚠ Budget automation settings table has no data or error:", e);
  }

  try {
    const patternsUpdated = await db
      .update(detectedPatterns)
      .set({ userId: defaultUserId })
      .where(isNull(detectedPatterns.userId));
    console.log(`  ✓ Detected patterns updated: ${patternsUpdated.changes} rows`);
  } catch (e) {
    console.log("  ⚠ Detected patterns table has no data or error:", e);
  }

  try {
    const correctionsUpdated = await db
      .update(payeeCategoryCorrections)
      .set({ userId: defaultUserId })
      .where(isNull(payeeCategoryCorrections.userId));
    console.log(`  ✓ Payee category corrections updated: ${correctionsUpdated.changes} rows`);
  } catch (e) {
    console.log("  ⚠ Payee category corrections table has no data or error:", e);
  }

  console.log("Migration complete!");

  return {
    success: true,
    defaultUserId,
  };
}

// Run migration if this file is executed directly
if (import.meta.main) {
  migrateToMultiUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
