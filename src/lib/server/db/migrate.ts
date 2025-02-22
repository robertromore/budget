import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import { db } from ".";

await migrate(db, { migrationsFolder: "drizzle" });
