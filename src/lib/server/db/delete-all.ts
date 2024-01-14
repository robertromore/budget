import type { SQLiteTable, TableConfig } from "drizzle-orm/sqlite-core";
import { db } from ".";
import * as schema from "../../schema";

await db.delete(schema.accounts);
