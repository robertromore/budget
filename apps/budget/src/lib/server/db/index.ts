import * as schema from "$core/schema/index";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { AsyncLocalStorage } from "node:async_hooks";
import { getEnv } from "$lib/server/env";

type DbInstance = ReturnType<typeof drizzle<typeof schema>>;
type DbTransaction = Parameters<Parameters<DbInstance["transaction"]>[0]>[0];

let dbInstance: DbInstance | null = null;
const testDbStorage = new AsyncLocalStorage<DbInstance>();
const txStorage = new AsyncLocalStorage<DbTransaction>();
let testDbOverride: DbInstance | null = null;

function createDb() {
  const DATABASE_URL = getEnv("DATABASE_URL") || "";
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

  const client = createClient({ url: DATABASE_URL });
  return drizzle(client, { schema });
}

function getDb() {
  if (testDbOverride) {
    return testDbOverride;
  }

  // Check for active transaction context (populated by runInTransaction)
  const scopedTx = txStorage.getStore();
  if (scopedTx) {
    return scopedTx as unknown as DbInstance;
  }

  const scopedDb = testDbStorage.getStore();
  if (scopedDb) {
    return scopedDb;
  }

  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

/**
 * Run work with a test-scoped database instance.
 * This ensures singleton repositories resolve to the in-memory test DB.
 */
export function runWithDbForTesting<T>(
  testDb: ReturnType<typeof drizzle<typeof schema>>,
  fn: () => T
): T {
  return testDbStorage.run(testDb, fn);
}

/**
 * Global test DB override for runners where async context propagation is unreliable.
 */
export function setDbForTesting(testDb: ReturnType<typeof drizzle<typeof schema>> | null): void {
  testDbOverride = testDb;
}

/**
 * Run work inside a database transaction.
 * All code within the callback that accesses the module-level `db` proxy
 * will automatically participate in the transaction via AsyncLocalStorage.
 * If the callback throws, the transaction is rolled back.
 *
 * If code within the callback calls `db.transaction()` directly, Drizzle
 * creates a SAVEPOINT (not a nested transaction) which is correct behavior.
 *
 * Re-entrant: if already inside a transaction context, runs `fn()` directly.
 */
export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
  // Re-entrant safety: if already inside a transaction, just run directly
  if (txStorage.getStore()) {
    return fn();
  }
  const currentDb = getDb();
  return (currentDb as DbInstance).transaction(async (tx) => {
    return txStorage.run(tx, fn);
  });
}

// Lazily initialize the DB to avoid module-evaluation order issues during build workers.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function" ? value.bind(instance) : value;
  },
});
