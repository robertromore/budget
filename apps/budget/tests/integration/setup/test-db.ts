import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "$core/schema";
import { sql } from "drizzle-orm";
import { eq } from "drizzle-orm";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Context } from "$core/trpc/context";

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

// Create a unique test database for each test run
export function createTestDb() {
  const sqlite = new Database(":memory:"); // Use in-memory database for tests
  return drizzle(sqlite, { schema });
}

// Setup test database with migrations
export async function setupTestDb() {
  const db = createTestDb();

  // Run migrations
  await migrate(db, { migrationsFolder: resolveMigrationsFolder() });

  // Bootstrap a default authenticated context for integration tests that only
  // provide `{ db, isTest: true }` to createCaller.
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
  // Order matters for foreign key constraints - children before parents
  const tables = [
    // Budget-related tables (child tables first)
    "budget_transaction",
    "budget_period_instance",
    "budget_period_template",
    "budget_account",
    "budget_category",
    "budget_group_membership",
    "budget_recommendation",
    "budget",
    "budget_group",
    "budget_template",
    "budget_automation_activity",
    "budget_automation_settings",
    "envelope_allocation",
    "envelope_rollover_history",
    "envelope_transfer",
    // Schedule tables
    "schedule_skips",
    "schedule_dates",
    "schedules",
    // Transfer mappings
    "transfer_mappings",
    // Workspace invitations and members
    "workspace_invitation",
    "workspace_member",
    // Workspace counters (sequences)
    "workspace_counter",
    // ML learning tables
    "payee_category_corrections",
    "payee_categories",
    "category_group_recommendations",
    "category_group_memberships",
    "category_groups",
    "category_group_settings",
    "import_profile",
    // Alias tables
    "payee_aliases",
    "category_aliases",
    // Payee AI enhancements
    "payee_ai_enhancements",
    // Medical/HSA tables (singular names match migrations)
    "expense_receipt",
    "hsa_claim",
    "medical_expense",
    // AI conversation tables
    "ai_conversation_message",
    "ai_conversation",
    // Security tables
    "encryption_keys",
    "user_trusted_contexts",
    "access_log",
    // Report tables
    "report_templates",
    // Automation rules
    "automation_rule_logs",
    "automation_rules",
    // Utility tables
    "utility_rate_tier",
    "utility_usage",
    "anomaly_alerts",
    // ML models
    "ml_models",
    // Detected patterns
    "detected_patterns",
    // Filter
    "filter",
    // Month annotations
    "month_annotations",
    // Core entity tables
    "transaction",
    "account",
    "payee",
    "categories",
    "views",
    // Auth tables
    "auth_account",
    "session",
    "verification",
    // Users (referenced by invitations/members)
    "user",
    // Workspace (parent of most entities)
    "workspace",
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
