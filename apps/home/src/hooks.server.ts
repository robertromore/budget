import "$lib/server/env-sveltekit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "$core/server/auth";
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  return svelteKitHandler({ event, resolve, auth });
};
