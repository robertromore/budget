import { Config, defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: ["./src/lib/schema/*.ts", "./src/lib/schema/**/*.ts"],
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: "./drizzle/db/sqlite.db",
  },
  verbose: true,
  strict: true,
}) satisfies Config;
