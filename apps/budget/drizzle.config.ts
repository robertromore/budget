import { Config, defineConfig } from "drizzle-kit";

// Read DATABASE_URL from environment, fallback to default path
const databaseUrl = process.env.DATABASE_URL || "file:./drizzle/db/sqlite.db";

export default defineConfig({
  // Avoid duplicate schema registration from barrel exports.
  schema: ["./src/lib/schema/**/*.ts", "!./src/lib/schema/**/index.ts"],
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: databaseUrl,
  },
  verbose: true,
  strict: true,
}) satisfies Config;
