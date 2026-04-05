import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import * as schema from "$core/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Context } from "../../../src/lib/trpc/context";

const DEFAULT_TEST_USER_ID = "system-test-user";
const DEFAULT_TEST_EMAIL = "system-test@example.invalid";
const DEFAULT_TEST_WORKSPACE_SLUG = "__system-test-workspace__";
const CURRENT_FILE_DIR = path.dirname(fileURLToPath(import.meta.url));

export function resolveMigrationsFolder() {
  const candidates = [
    path.join(process.cwd(), "drizzle"),
    path.join(process.cwd(), "apps", "budget", "drizzle"),
    path.resolve(CURRENT_FILE_DIR, "../../../drizzle"),
  ];

  for (const candidate of candidates) {
    const journalPath = path.join(candidate, "meta", "_journal.json");
    if (fs.existsSync(journalPath)) {
      return candidate;
    }
  }

  throw new Error(`Could not locate drizzle migrations folder. Tried: ${candidates.join(", ")}`);
}

// Create a unique test database for each test run (Node.js compatible)
export function createTestDb() {
  const sqlite = new Database(":memory:"); // Use in-memory database for tests
  return drizzle(sqlite, { schema });
}

// Setup test database with migrations
export async function setupTestDb() {
  const db = createTestDb();

  // Run migrations
  await migrate(db, { migrationsFolder: resolveMigrationsFolder() });

  await db
    .insert(schema.users)
    .values({
      id: DEFAULT_TEST_USER_ID,
      name: "System Test User",
      displayName: "System Test User",
      email: DEFAULT_TEST_EMAIL,
    })
    .onConflictDoNothing();

  let [workspace] = await db
    .select({ id: schema.workspaces.id })
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, DEFAULT_TEST_WORKSPACE_SLUG))
    .limit(1);

  if (!workspace) {
    [workspace] = await db
      .insert(schema.workspaces)
      .values({
        displayName: "System Test Workspace",
        slug: DEFAULT_TEST_WORKSPACE_SLUG,
        ownerId: DEFAULT_TEST_USER_ID,
      })
      .returning({ id: schema.workspaces.id });
  }

  if (workspace) {
    await db
      .insert(schema.workspaceMembers)
      .values({
        workspaceId: workspace.id,
        userId: DEFAULT_TEST_USER_ID,
        role: "owner",
        isDefault: true,
      })
      .onConflictDoNothing();
  }

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

  await db
    .insert(schema.users)
    .values({
      id: testUserId,
      name: "Test User",
      displayName: "Test User",
      email: "test@example.com",
    })
    .onConflictDoNothing();

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
    request: { headers: new Headers(), getCookie: () => undefined, setCookie: () => {} } as Context["request"],
    // Add a test flag to bypass rate limiting
    isTest: true,
  } as Context;
}

// Seed minimal test data
export async function seedTestData(db: ReturnType<typeof createTestDb>) {
  let [workspace] = await db
    .select()
    .from(schema.workspaces)
    .where(eq(schema.workspaces.slug, DEFAULT_TEST_WORKSPACE_SLUG))
    .limit(1);

  if (!workspace) {
    [workspace] = await db
      .insert(schema.workspaces)
      .values({
        displayName: "System Test Workspace",
        slug: DEFAULT_TEST_WORKSPACE_SLUG,
        ownerId: DEFAULT_TEST_USER_ID,
      })
      .returning();
  }

  // Insert test categories
  await db.insert(schema.categories).values([
    { workspaceId: workspace.id, name: "Groceries", slug: "groceries" },
    { workspaceId: workspace.id, name: "Entertainment", slug: "entertainment" },
  ]);

  // Insert test payees
  await db.insert(schema.payees).values([
    { workspaceId: workspace.id, name: "Test Store", slug: "test-store" },
    { workspaceId: workspace.id, name: "Gas Station", slug: "gas-station" },
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
