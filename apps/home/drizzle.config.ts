import { Config, defineConfig } from "drizzle-kit";

// Share the same database as the budget app
const databaseUrl = process.env.DATABASE_URL || "file:../budget/drizzle/db/sqlite.db";

export default defineConfig({
  schema: ["../../packages/core/src/schema/**/*.ts", "!../../packages/core/src/schema/**/index.ts"],
  out: "../budget/drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
}) satisfies Config;
