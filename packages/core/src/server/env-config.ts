import { z } from "zod/v4";

/**
 * Validated environment configuration.
 *
 * Security-critical secrets (auth, encryption) are declared here as optional
 * strings at the schema level, then hardened via a `superRefine` that
 * requires them when `NODE_ENV === "production"`. Startup fails loudly if a
 * production deploy is missing a required secret, preventing silent
 * fallback to development-grade defaults (hardcoded scrypt keys, empty
 * trusted-origin allowlists, localhost baseURLs).
 *
 * Non-production environments (development, test) keep all secrets
 * optional to preserve the zero-config local dev experience.
 */
const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().default("drizzle/db/sqlite.db"),
    DATABASE_TYPE: z.enum(["sqlite", "postgres", "mysql"]).default("sqlite"),
    DATABASE_LOG_QUERIES: z.boolean().default(false),
    APP_PORT: z.coerce.number().default(3000),
    APP_HOST: z.string().default("localhost"),

    // Better Auth
    BETTER_AUTH_SECRET: z.string().optional(),
    BETTER_AUTH_URL: z.string().optional(),
    BETTER_AUTH_TRUSTED_ORIGINS: z.string().optional(),
    PUBLIC_APP_URL: z.string().optional(),

    // Credential encryption (SimpleFIN/Teller tokens stored at rest).
    // Either ENCRYPTION_SECRET or AUTH_SECRET satisfies the requirement —
    // the credential-encryption module reads them in that order.
    ENCRYPTION_SECRET: z.string().optional(),
    AUTH_SECRET: z.string().optional(),

    // LLM API-key encryption (per-user provider keys stored at rest).
    LLM_ENCRYPTION_KEY: z.string().optional(),
    LLM_ENCRYPTION_SALT: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV !== "production") return;

    // BETTER_AUTH_SECRET: Better Auth uses this to sign session cookies.
    // Missing → every session is trivially forgeable.
    if (!data.BETTER_AUTH_SECRET || data.BETTER_AUTH_SECRET.length < 32) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_SECRET"],
        message:
          "BETTER_AUTH_SECRET must be set to a high-entropy value (>=32 chars) in production",
      });
    }

    // BETTER_AUTH_URL: without it the framework defaults to http://localhost:5173,
    // which breaks cookie scoping, CSRF checks, and magic-link URLs in prod.
    if (!data.BETTER_AUTH_URL && !data.PUBLIC_APP_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_URL"],
        message:
          "Either BETTER_AUTH_URL or PUBLIC_APP_URL must be set in production so Better Auth resolves the correct origin",
      });
    }

    // BETTER_AUTH_TRUSTED_ORIGINS: empty in prod means Better Auth's CORS
    // check degrades to whatever its default is (historically permissive).
    // Require an explicit, non-empty allowlist.
    const trustedOrigins = data.BETTER_AUTH_TRUSTED_ORIGINS?.split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!trustedOrigins || trustedOrigins.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["BETTER_AUTH_TRUSTED_ORIGINS"],
        message:
          "BETTER_AUTH_TRUSTED_ORIGINS must list at least one origin (comma-separated) in production",
      });
    }

    // Credential encryption: at least one of the two must be set with
    // enough entropy for scrypt-derived keys to resist offline attack.
    const credentialSecret = data.ENCRYPTION_SECRET || data.AUTH_SECRET;
    if (!credentialSecret || credentialSecret.length < 32) {
      ctx.addIssue({
        code: "custom",
        path: ["ENCRYPTION_SECRET"],
        message:
          "ENCRYPTION_SECRET (or AUTH_SECRET) must be set to a high-entropy value (>=32 chars) in production — required for bank-connection credential encryption",
      });
    }

    // LLM_ENCRYPTION_KEY: without it, the encryption module falls back to
    // a scrypt key derived from a publicly-known string. Any database
    // exfiltration would immediately expose stored LLM provider keys.
    if (!data.LLM_ENCRYPTION_KEY || data.LLM_ENCRYPTION_KEY.length < 32) {
      ctx.addIssue({
        code: "custom",
        path: ["LLM_ENCRYPTION_KEY"],
        message:
          "LLM_ENCRYPTION_KEY must be set to a high-entropy value (>=32 chars) in production",
      });
    }
  });

function parseEnv() {
  const env = {
    NODE_ENV: process.env["NODE_ENV"],
    DATABASE_URL: process.env["DATABASE_URL"],
    DATABASE_TYPE: process.env["DATABASE_TYPE"],
    DATABASE_LOG_QUERIES: process.env["DATABASE_LOG_QUERIES"] === "true",
    APP_PORT: process.env["PORT"] || process.env["APP_PORT"],
    APP_HOST: process.env["HOST"] || process.env["APP_HOST"],

    BETTER_AUTH_SECRET: process.env["BETTER_AUTH_SECRET"],
    BETTER_AUTH_URL: process.env["BETTER_AUTH_URL"],
    BETTER_AUTH_TRUSTED_ORIGINS: process.env["BETTER_AUTH_TRUSTED_ORIGINS"],
    PUBLIC_APP_URL: process.env["PUBLIC_APP_URL"],

    ENCRYPTION_SECRET: process.env["ENCRYPTION_SECRET"],
    AUTH_SECRET: process.env["AUTH_SECRET"],

    LLM_ENCRYPTION_KEY: process.env["LLM_ENCRYPTION_KEY"],
    LLM_ENCRYPTION_SALT: process.env["LLM_ENCRYPTION_SALT"],
  };

  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    // Zod errors already list the failing paths and messages; surface them
    // verbatim so ops can see exactly which secret is missing without
    // leaking any values.
    const flat = parsed.error.flatten();
    console.error("Invalid environment configuration:", flat);
    throw new Error(
      "Invalid environment configuration. Missing or malformed: " +
        Object.keys(flat.fieldErrors).join(", ")
    );
  }

  return parsed.data;
}

export const env = parseEnv();

export type Environment = typeof env;
