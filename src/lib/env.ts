import { z } from "zod/v4";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().default("drizzle/db/sqlite.db"),
  DATABASE_TYPE: z.enum(["sqlite", "postgres", "mysql"]).default("sqlite"),
  DATABASE_LOG_QUERIES: z.boolean().default(false),
  APP_PORT: z.coerce.number().default(3000),
  APP_HOST: z.string().default("localhost"),
});

function getEnv() {
  const env = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    DATABASE_TYPE: process.env.DATABASE_TYPE,
    DATABASE_LOG_QUERIES: process.env.DATABASE_LOG_QUERIES === "true",
    APP_PORT: process.env.PORT || process.env.APP_PORT,
    APP_HOST: process.env.HOST || process.env.APP_HOST,
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    console.error("Invalid environment configuration:", parsed.error.flatten());
    throw new Error("Invalid environment configuration");
  }

  return parsed.data;
}

export const env = getEnv();

export type Environment = typeof env;