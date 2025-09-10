import {Database} from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "../../../src/lib/schema";
import {sql} from "drizzle-orm";
import path from "path";
import fs from "fs";

// Create a unique test database for each test run
export function createTestDb() {
  const sqlite = new Database(":memory:"); // Use in-memory database for tests
  return drizzle(sqlite, {schema});
}

// Setup test database with migrations
export async function setupTestDb() {
  const db = createTestDb();

  // Run migrations
  await migrate(db, {migrationsFolder: path.join(process.cwd(), "drizzle")});

  return db;
}

// Clean up all tables
export async function clearTestDb(db: ReturnType<typeof createTestDb>) {
  // Get all table names from schema
  const tables = [
    "account",
    "transaction",
    "payee",
    "categories",
    "schedules",
    "schedule_dates",
    "views",
  ];

  // Delete all data from tables (in reverse order to handle foreign keys)
  for (const table of tables.reverse()) {
    db.run(sql`delete from ${sql.identifier(table)}`);
  }

  // Reset auto-increment counters
  for (const table of tables) {
    db.run(sql`delete from sqlite_sequence where name=${table}`);
  }
}

// Helper to create test context
export async function createTestContext() {
  const db = await setupTestDb();
  return {
    db,
    // Add a test flag to bypass rate limiting
    isTest: true,
  };
}

// Seed minimal test data
export async function seedTestData(db: ReturnType<typeof createTestDb>) {
  // Insert test categories
  await db.insert(schema.categories).values([{name: "Groceries"}, {name: "Entertainment"}]);

  // Insert test payees
  await db.insert(schema.payees).values([{name: "Test Store"}, {name: "Gas Station"}]);

  // Insert test accounts
  const testAccounts = await db
    .insert(schema.accounts)
    .values([
      {name: "Test Checking", slug: "test-checking", notes: "Test checking account"},
      {name: "Test Savings", slug: "test-savings", notes: "Test savings account"},
    ])
    .returning();

  // Insert some test transactions
  await db.insert(schema.transactions).values([
    {
      accountId: testAccounts[0].id,
      amount: -50.0,
      date: "2024-01-15",
      notes: "Test transaction 1",
    },
    {
      accountId: testAccounts[0].id,
      amount: 100.0,
      date: "2024-01-20",
      notes: "Test transaction 2",
    },
  ]);

  return {
    accounts: testAccounts,
  };
}
