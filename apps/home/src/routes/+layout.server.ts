import { redirect } from "@sveltejs/kit";
import { auth } from "$core/server/auth";
import { createContext } from "$core/trpc/context";
import { createCaller } from "$core/trpc/router";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (event) => {
  const session = await auth.api.getSession({ headers: event.request.headers });

  const isAuthPage =
    event.url.pathname === "/login" || event.url.pathname === "/register";

  if (!session && !isAuthPage) {
    redirect(302, "/login");
  }

  if (session && isAuthPage) {
    redirect(302, "/");
  }

  if (!session) {
    return { user: null, homes: [] };
  }

  const ctx = await createContext(fromSvelteKit(event));
  const caller = createCaller(ctx);

  const homes = await caller.homeHomesRoutes.list();

  return {
    user: session.user,
    homes,
  };
};
