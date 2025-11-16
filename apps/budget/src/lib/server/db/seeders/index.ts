/**
 * Seeders are used to generate default data with dependency ordering.
 *
 * Tables are seeded in the correct order based on foreign key dependencies:
 * 1. workspaces (no dependencies)
 * 2. workspace-dependent tables (accounts, categories, etc.)
 * 3. relationship/junction tables (budgetAccounts, etc.)
 *
 * Run with: bun run ./src/lib/server/db/seeders
 */

import type { TableConfig } from "drizzle-orm/mysql-core";
import { db } from "..";
import * as schema from "$lib/schema";

import { Glob } from "bun";
import * as path from "node:path";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";

// Define seeding order based on dependencies
const SEEDING_ORDER = [
  // Phase 1: No dependencies
  "workspaces",

  // Phase 2: Depends only on workspaces
  "budgetTemplates",

  // Phase 3: Complex dependencies (will be handled if files exist)
  "budgets",
  "budgetPeriodTemplates",
  "budgetPeriodInstances",
  "budgetAccounts",
  "budgetCategories",
];

const glob = new Glob("*.json");
const seeders_path = "./src/lib/server/db/seeders/";

// Collect all available seed files
const available_files = new Set<string>();
for await (const file of glob.scan(seeders_path)) {
  available_files.add(path.basename(file, ".json"));
}

console.log("🌱 Starting seeding process...\n");
console.log(`Found ${available_files.size} seed file(s)\n`);

let seeded_count = 0;
let total_records = 0;

// Seed in dependency order
for (const table_name of SEEDING_ORDER) {
  if (!available_files.has(table_name)) {
    continue; // Skip if seed file doesn't exist
  }

  const typed_table_name = table_name as keyof typeof schema;

  if (!Object.prototype.hasOwnProperty.call(schema, typed_table_name)) {
    console.warn(`⚠️  Skipping ${table_name}: Table doesn't exist in schema.`);
    continue;
  }

  const table = schema[typed_table_name] as unknown as SQLiteTable<TableConfig>;
  const file_path = seeders_path + table_name + ".json";

  try {
    const data = await Bun.file(file_path).json();

    if (!Array.isArray(data)) {
      console.warn(`⚠️  Skipping ${table_name}: Data must be an array.`);
      continue;
    }

    if (data.length === 0) {
      console.log(`⏭️  Skipped ${table_name}: No records to seed.`);
      continue;
    }

    // Insert all records
    for (const record of data) {
      await db.insert(table).values(record);
    }

    console.log(`✓ Seeded ${table_name} with ${data.length} record(s).`);
    seeded_count++;
    total_records += data.length;

    available_files.delete(table_name);
  } catch (error) {
    console.error(`✗ Failed to seed ${table_name}:`, error);
  }
}

// Seed any remaining files (not in explicit order)
if (available_files.size > 0) {
  console.log(`\n📦 Seeding remaining tables (no explicit order)...`);

  for (const table_name of available_files) {
    const typed_table_name = table_name as keyof typeof schema;

    if (!Object.prototype.hasOwnProperty.call(schema, typed_table_name)) {
      console.warn(`⚠️  Skipping ${table_name}: Table doesn't exist in schema.`);
      continue;
    }

    const table = schema[typed_table_name] as unknown as SQLiteTable<TableConfig>;
    const file_path = seeders_path + table_name + ".json";

    try {
      const data = await Bun.file(file_path).json();

      if (!Array.isArray(data)) {
        console.warn(`⚠️  Skipping ${table_name}: Data must be an array.`);
        continue;
      }

      if (data.length === 0) {
        continue;
      }

      for (const record of data) {
        await db.insert(table).values(record);
      }

      console.log(`✓ Seeded ${table_name} with ${data.length} record(s).`);
      seeded_count++;
      total_records += data.length;
    } catch (error) {
      console.error(`✗ Failed to seed ${table_name}:`, error);
    }
  }
}

console.log("\n✅ Seeding complete!");
console.log(`   Tables seeded: ${seeded_count}`);
console.log(`   Total records: ${total_records}`);
