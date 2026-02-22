import * as schema from "$lib/schema/index";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

let dbInstance: ReturnType<typeof drizzle<typeof schema>> | null = null;

function createDb() {
  const DATABASE_URL = process.env.DATABASE_URL || Bun.env?.DATABASE_URL || '';
  if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

  const client = createClient({ url: DATABASE_URL });
  return drizzle(client, { schema });
}

function getDb() {
  if (!dbInstance) {
    dbInstance = createDb();
  }
  return dbInstance;
}

// Lazily initialize the DB to avoid module-evaluation order issues during build workers.
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop, receiver) {
    const instance = getDb();
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});
