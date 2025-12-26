import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "$lib/server/db";
import { AUTH_CONFIG } from "$lib/server/config/auth";
import { env } from "$env/dynamic/private";
import * as schema from "$lib/schema";
import { createDefaultWorkspaceForUser } from "./workspace-setup";

/**
 * Better Auth instance configured for the budget application
 *
 * Features:
 * - Email/password authentication
 * - Session management with secure cookies
 * - Rate limiting for login attempts
 * - Integration with Drizzle ORM and SQLite
 */
export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "sqlite",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.authAccounts,
      verification: schema.verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: AUTH_CONFIG.PASSWORD.MIN_LENGTH,
    maxPasswordLength: AUTH_CONFIG.PASSWORD.MAX_LENGTH,
    requireEmailVerification: false, // Optional initially as per plan
  },

  session: {
    expiresIn: AUTH_CONFIG.SESSION.MAX_AGE_SECONDS,
    updateAge: Math.floor(AUTH_CONFIG.SESSION.MAX_AGE_SECONDS / 2),
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes cache
    },
  },

  rateLimit: {
    window: AUTH_CONFIG.RATE_LIMITING.LOGIN_ATTEMPTS.WINDOW_MS / 1000,
    max: AUTH_CONFIG.RATE_LIMITING.LOGIN_ATTEMPTS.MAX_ATTEMPTS,
  },

  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL || "http://localhost:5173",

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "user",
        required: false,
      },
      displayName: {
        type: "string",
        required: false,
      },
      slug: {
        type: "string",
        required: false,
      },
    },
  },

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          // Create a default workspace for new users
          try {
            await createDefaultWorkspaceForUser(user.id);
          } catch (error) {
            console.error("Failed to create default workspace for user:", error);
            // Don't throw - user creation should still succeed
            // Workspace can be created on first access via context fallback
          }
        },
      },
    },
  },
});

// Export types
export type Session = typeof auth.$Infer.Session.session;
export type User = typeof auth.$Infer.Session.user;
