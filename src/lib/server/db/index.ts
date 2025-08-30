import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";
import * as schema from "../../schema/index";
import { env } from "../../env";

const sqlite = new Database(env.DATABASE_URL);
export const db = drizzle(sqlite, {
  schema,
  logger: env.DATABASE_LOG_QUERIES,
});
