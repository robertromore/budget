import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "$lib/server/auth";
import { building } from "$app/environment";
import type { Handle } from "@sveltejs/kit";

/**
 * SvelteKit server hooks
 *
 * Handles:
 * - Better Auth routes (/api/auth/*)
 * - Future middleware can be added here
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Handle Better Auth routes
  return svelteKitHandler({ event, resolve, auth, building });
};
