import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import * as schema from '../../schema/index';

const sqlite = new Database('drizzle/db/sqlite.db');
export const db = drizzle(sqlite, { schema });
