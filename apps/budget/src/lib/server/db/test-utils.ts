/**
 * Test database utilities for creating isolated test environments
 *
 * Provides snapshot/restore functionality and efficient cleanup for tests.
 * All utilities ensure tests remain isolated and don't pollute the main database.
 */

import {Database} from "bun:sqlite";
import {drizzle} from "drizzle-orm/bun-sqlite";
import {migrate} from "drizzle-orm/bun-sqlite/migrator";
import {sql} from "drizzle-orm";
import * as schema from "$lib/schema";

export class TestDatabase {
  private snapshots = new Map<string, Uint8Array>();
  private testDb: Database | null = null;

  /**
   * Creates an isolated in-memory test database with all migrations applied
   *
   * @returns Database instance ready for testing
   *
   * @example
   * ```typescript
   * let testDb: ReturnType<typeof drizzle>;
   *
   * beforeAll(async () => {
   *   const dbUtil = new TestDatabase();
   *   testDb = await dbUtil.setup();
   * });
   * ```
   */
  async setup() {
    // Create in-memory database
    this.testDb = new Database(":memory:");

    const db = drizzle(this.testDb, {schema});

    // Apply all migrations
    await migrate(db, {migrationsFolder: "drizzle"});

    return db;
  }

  /**
   * Closes the test database connection
   *
   * @example
   * ```typescript
   * afterAll(async () => {
   *   await dbUtil.teardown();
   * });
   * ```
   */
  async teardown() {
    if (this.testDb) {
      this.testDb.close();
      this.testDb = null;
    }
    this.snapshots.clear();
  }

  /**
   * Creates a snapshot of the current database state
   *
   * Useful for saving a "clean" state that can be restored between tests
   *
   * @param name - Identifier for this snapshot
   *
   * @example
   * ```typescript
   * // Save state after seeding
   * await dbUtil.snapshot('with-seed-data');
   *
   * // Later, restore to this point
   * await dbUtil.restore('with-seed-data');
   * ```
   */
  async snapshot(name: string) {
    if (!this.testDb) {
      throw new Error("Database not initialized. Call setup() first.");
    }

    // Serialize the entire database to a buffer
    const data = this.testDb.serialize();
    this.snapshots.set(name, data);
  }

  /**
   * Restores database to a previous snapshot
   *
   * @param name - Identifier of the snapshot to restore
   * @throws Error if snapshot doesn't exist
   *
   * @example
   * ```typescript
   * beforeEach(async () => {
   *   await dbUtil.restore('clean-state');
   * });
   * ```
   */
  async restore(name: string) {
    const data = this.snapshots.get(name);
    if (!data) {
      throw new Error(`Snapshot "${name}" not found`);
    }

    if (!this.testDb) {
      throw new Error("Database not initialized. Call setup() first.");
    }

    // Restore from snapshot
    this.testDb.close();
    this.testDb = Database.deserialize(data);
  }

  /**
   * Efficiently truncates all tables in the database
   *
   * Faster than restore() for simple cleanup between tests
   *
   * @param db - Drizzle database instance
   *
   * @example
   * ```typescript
   * beforeEach(async () => {
   *   await dbUtil.truncateAll(testDb);
   * });
   * ```
   */
  async truncateAll(db: ReturnType<typeof drizzle>) {
    // Get all table names
    const tables = await db.all<{name: string}>(sql`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '__drizzle%'
    `);

    // Disable foreign keys, delete all, re-enable
    await db.run(sql`PRAGMA foreign_keys = OFF`);

    for (const {name} of tables) {
      await db.run(sql.raw(`DELETE FROM "${name}"`));
    }

    await db.run(sql`DELETE FROM sqlite_sequence`);
    await db.run(sql`PRAGMA foreign_keys = ON`);
  }

  /**
   * Gets the current row count for a specific table
   *
   * @param db - Drizzle database instance
   * @param tableName - Name of the table
   * @returns Number of rows in the table
   *
   * @example
   * ```typescript
   * const count = await dbUtil.getRowCount(testDb, 'accounts');
   * expect(count).toBe(5);
   * ```
   */
  async getRowCount(db: ReturnType<typeof drizzle>, tableName: string): Promise<number> {
    const result = await db.get<{count: number}>(
      sql.raw(`SELECT COUNT(*) as count FROM "${tableName}"`)
    );
    return result?.count ?? 0;
  }

  /**
   * Verifies that all tables are empty
   *
   * @param db - Drizzle database instance
   * @returns true if all tables are empty, false otherwise
   *
   * @example
   * ```typescript
   * await dbUtil.truncateAll(testDb);
   * const isEmpty = await dbUtil.verifyEmpty(testDb);
   * expect(isEmpty).toBe(true);
   * ```
   */
  async verifyEmpty(db: ReturnType<typeof drizzle>): Promise<boolean> {
    const tables = await db.all<{name: string}>(sql`
      SELECT name FROM sqlite_master
      WHERE type='table'
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE '__drizzle%'
    `);

    for (const {name} of tables) {
      const count = await this.getRowCount(db, name);
      if (count > 0) {
        console.log(`Table ${name} has ${count} row(s)`);
        return false;
      }
    }

    return true;
  }
}

/**
 * Quick helper for one-off test database creation
 *
 * @example
 * ```typescript
 * test('my test', async () => {
 *   const db = await createTestDb();
 *   // ... run test
 * });
 * ```
 */
export async function createTestDb() {
  const testDb = new TestDatabase();
  return await testDb.setup();
}
