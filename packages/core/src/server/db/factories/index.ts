/**
 * Factories are used to generate test data.
 *
 * This entry point creates a complete test workspace with:
 * - 1 workspace
 * - Random accounts (1-10) with transactions
 * - Budgets with periods and envelopes
 * - Schedules for recurring transactions
 * - Category groups with members
 * - Saved views
 *
 * Run with: bun run ./src/server/db/factories
 */

import { workspaceFactory } from "./workspaces";
import { accountFactory } from "./accounts";
import { budgetFactory } from "./budgets";
import { scheduleFactory } from "./schedules";
import { viewFactory } from "./views";
import { categoryGroupFactory } from "./category-groups";

console.log("🏭 Starting comprehensive factory data generation...\n");

// Create workspace first
console.log("📦 Creating workspace...");
const workspace = (await workspaceFactory(1))[0]!;
console.log(`✓ Workspace created: "${workspace.displayName}" (ID: ${workspace.id})\n`);

// Create accounts with transactions
console.log("🏦 Creating accounts with transactions...");
const accounts = await accountFactory(undefined, workspace.id);
console.log(`✓ Created ${accounts.length} accounts with transactions\n`);

// Create budgets with periods
console.log("💰 Creating budgets...");
const budget = await budgetFactory(workspace.id, "category-envelope", {
  accountIds: accounts.map((a) => a.id),
  withPeriod: true,
  periodType: "monthly",
});
console.log(`✓ Created envelope budget with monthly periods\n`);

// Create schedules
console.log("📅 Creating schedules...");
const schedules = await scheduleFactory(workspace.id, accounts[0]!.id, 3, {
  frequency: "monthly",
  recurring: true,
});
console.log(`✓ Created ${schedules.length} recurring schedules\n`);

// Create category groups
console.log("📁 Creating category groups...");
const categoryGroups = await categoryGroupFactory(workspace.id, 5, {
  categoriesPerGroup: 3,
});
console.log(`✓ Created ${categoryGroups.length} category groups\n`);

// Create views
console.log("👁️  Creating saved views...");
const views = await viewFactory(workspace.id, 3, {
  withFilters: true,
  presetType: "date-range",
});
console.log(`✓ Created ${views.length} saved views\n`);

console.log("✅ Factory data generation complete!");
console.log(`   Workspace: ${workspace.displayName}`);
console.log(`   Accounts: ${accounts.length}`);
console.log(`   Budgets: 1 (with periods)`);
console.log(`   Schedules: ${schedules.length}`);
console.log(`   Category Groups: ${categoryGroups.length}`);
console.log(`   Views: ${views.length}`);
