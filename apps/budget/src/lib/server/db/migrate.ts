import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";

// Get DATABASE_URL from environment (for standalone script execution)
const DATABASE_URL = process.env.DATABASE_URL || "file:./drizzle/db/sqlite.db";

const client = createClient({ url: DATABASE_URL });
const db = drizzle(client);

console.log(`Running migrations on ${DATABASE_URL}...`);
migrate(db, { migrationsFolder: "drizzle" });
console.log("Migrations complete!");
