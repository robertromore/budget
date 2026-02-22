import Database from "better-sqlite3";
import {drizzle} from "drizzle-orm/better-sqlite3";
import {migrate} from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "../../../src/lib/schema";
import {sql} from "drizzle-orm";
import path from "path";
import type {Context} from "../../../src/lib/trpc/context";

// Create a unique test database for each test run (Node.js compatible)
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
  const testUserId = "test-user";

  await db.insert(schema.users).values({
    id: testUserId,
    name: "Test User",
    displayName: "Test User",
    email: "test@example.com",
  });

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Test Workspace",
      slug: `test-workspace-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      ownerId: testUserId,
    })
    .returning();

  await db.insert(schema.workspaceMembers).values({
    workspaceId: workspace.id,
    userId: testUserId,
    role: "owner",
    isDefault: true,
  });

  return {
    db: db as unknown as Context["db"],
    userId: testUserId,
    sessionId: "test-session",
    workspaceId: workspace.id,
    event: {} as Context["event"],
    // Add a test flag to bypass rate limiting
    isTest: true,
  } as Context;
}

// Seed minimal test data
export async function seedTestData(db: ReturnType<typeof createTestDb>) {
  const [workspace] = await db
    .insert(schema.workspaces)
    .values({
      displayName: "Seed Workspace",
      slug: `seed-workspace-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    })
    .returning();

  // Insert test categories
  await db.insert(schema.categories).values([
    {workspaceId: workspace.id, name: "Groceries", slug: "groceries"},
    {workspaceId: workspace.id, name: "Entertainment", slug: "entertainment"},
  ]);

  // Insert test payees
  await db.insert(schema.payees).values([
    {workspaceId: workspace.id, name: "Test Store", slug: "test-store"},
    {workspaceId: workspace.id, name: "Gas Station", slug: "gas-station"},
  ]);

  // Insert test accounts
  const testAccounts = await db
    .insert(schema.accounts)
    .values([
      {
        workspaceId: workspace.id,
        name: "Test Checking",
        slug: "test-checking",
        notes: "Test checking account",
      },
      {
        workspaceId: workspace.id,
        name: "Test Savings",
        slug: "test-savings",
        notes: "Test savings account",
      },
    ])
    .returning();

  // Insert some test transactions
  await db.insert(schema.transactions).values([
    {
      accountId: testAccounts[0].id,
      workspaceId: workspace.id,
      amount: -50.0,
      date: "2024-01-15",
      notes: "Test transaction 1",
    },
    {
      accountId: testAccounts[0].id,
      workspaceId: workspace.id,
      amount: 100.0,
      date: "2024-01-20",
      notes: "Test transaction 2",
    },
  ]);

  return {
    workspace,
    accounts: testAccounts,
  };
}
