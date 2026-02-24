import * as schema from "$lib/schema/index";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { AsyncLocalStorage } from "node:async_hooks";

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;
const testDbStorage = new AsyncLocalStorage<ReturnType<typeof drizzle<typeof schema>>>();
let testDbOverride: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const DATABASE_URL = process.env.DATABASE_URL || Bun.env?.DATABASE_URL || '';
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const client = createClient({ url: DATABASE_URL });
  return drizzle(client, { schema });
}

function getDb() {
  if (testDbOverride) {
    return testDbOverride;
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
export function setDbForTesting(
  testDb: ReturnType<typeof drizzle<typeof schema>> | null
): void {
  testDbOverride = testDb;
}

// Lazily initialize the DB to avoid module-evaluation order issues during build workers.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
