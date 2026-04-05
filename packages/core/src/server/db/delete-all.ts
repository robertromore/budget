/* eslint-disable drizzle/enforce-delete-with-where */
/**
 * Database cleanup utility - deletes all data from all tables
 *
 * Handles foreign key constraints by disabling them during deletion.
 * Always resets autoincrement sequences.
 *
 * Options:
 *   --confirm         Skip confirmation prompt (use in scripts)
 *   --tables=t1,t2    Only delete from specified tables
 *   --dry-run         Show what would be deleted without actually deleting
 *
 * Examples:
 *   bun run ./src/lib/server/db/delete-all.ts --confirm
 *   bun run ./src/lib/server/db/delete-all.ts --tables=accounts,transactions
 *   bun run ./src/lib/server/db/delete-all.ts --dry-run
 */

import { sql } from "drizzle-orm";
import { parseArgs } from "util";
import { db } from ".";

const { values } = parseArgs({
  args: Bun.argv,
  options: {
    confirm: { type: "boolean", default: false },
    tables: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
  strict: true,
  allowPositionals: true,
});

// Get all table names from sqlite_master
const allTables = await db.all<{ name: string }>(sql`
  SELECT name FROM sqlite_master
  WHERE type='table'
  AND name NOT LIKE 'sqlite_%'
  AND name NOT LIKE '__drizzle%'
  ORDER BY name
`);

const tableNames = allTables.map((t) => t.name);

// Filter to specific tables if requested
const tablesToDelete = values.tables
  ? values.tables
      .split(",")
      .map((t) => t.trim())
      .filter((t) => tableNames.includes(t))
  : tableNames;

if (tablesToDelete.length === 0) {
  console.log("No tables to delete.");
  process.exit(0);
}

// Show what will be deleted
console.log("\n📋 Tables to delete:");
tablesToDelete.forEach((t) => console.log(`   - ${t}`));
console.log();

if (values["dry-run"]) {
  console.log("🔍 DRY RUN - No data will be deleted");
  process.exit(0);
}

// Confirm before proceeding (unless --confirm flag)
if (!values.confirm) {
  console.log("⚠️  This will DELETE ALL DATA from the above tables!");
  console.log("   Run with --confirm to skip this prompt\n");

  const response = prompt("Are you sure? (yes/no): ");
  if (response?.toLowerCase() !== "yes") {
    console.log("Cancelled.");
    process.exit(0);
  }
}

console.log("\n🗑️  Deleting data...\n");

try {
  // Disable foreign keys temporarily
  await db.run(sql`PRAGMA foreign_keys = OFF`);

  // Delete from all tables
  for (const tableName of tablesToDelete) {
    await db.run(sql.raw(`DELETE FROM "${tableName}"`));
    console.log(`✓ Deleted from ${tableName}`);
  }

  // Reset autoincrement sequences
  await db.run(sql`DELETE FROM sqlite_sequence`);
  console.log("\n✓ Reset autoincrement sequences");

  // Re-enable foreign keys
  await db.run(sql`PRAGMA foreign_keys = ON`);

  console.log("\n✅ Cleanup complete!");
  console.log(`   Tables cleaned: ${tablesToDelete.length}`);
} catch (error) {
  console.error("\n❌ Error during cleanup:", error);
  // Ensure foreign keys are re-enabled even on error
  await db.run(sql`PRAGMA foreign_keys = ON`);
  process.exit(1);
}
