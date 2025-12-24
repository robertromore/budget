import { createAuthClient } from "better-auth/svelte";

/**
 * Better Auth client for Svelte
 *
 * Provides reactive authentication state and methods for:
 * - Sign in/out
 * - Sign up
 * - Session management
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BETTER_AUTH_URL || "http://localhost:5173",
});

// Export convenience methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;
