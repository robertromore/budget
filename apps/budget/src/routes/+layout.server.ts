import { formInsertScheduleSchema } from "$core/schema";
import { superformInsertAccountSchema } from "$core/schema/superforms";
import { auth } from "$core/server/auth";
import { createContext } from "$core/trpc/context";
import { fromSvelteKit } from "$lib/trpc/adapters/sveltekit";
import { createCaller } from "$core/trpc/router";
import { redirect } from "@sveltejs/kit";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
import { env } from "$env/dynamic/private";
import type { LayoutServerLoad } from "./$types";

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/invite",
  "/api/auth", // Better Auth API routes
  "/onboarding", // Onboarding wizard (needs auth but minimal data)
];

/**
 * Check if the user is in tour mode (bypasses onboarding redirect)
 * Tour mode is indicated by a ?tour=true query parameter
 */
function isInTourMode(url: URL): boolean {
  return url.searchParams.get("tour") === "true";
}

/**
 * Check if the current path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

type ActiveApp = "budget" | "price-watcher" | "home";

function getActiveApp(pathname: string): ActiveApp {
  if (pathname.startsWith("/price-watcher")) return "price-watcher";
  if (pathname.startsWith("/home")) return "home";
  return "budget";
}

/**
 * Check if user needs to complete onboarding
 */
function needsOnboarding(workspace: { preferences?: string | null } | null): boolean {
  if (!workspace?.preferences) return true;

  try {
    const prefs =
      typeof workspace.preferences === "string"
        ? JSON.parse(workspace.preferences)
        : workspace.preferences;

    const onboarding = prefs?.onboarding;
    return !(onboarding?.wizardCompleted || onboarding?.wizardSkipped);
  } catch {
    return true;
  }
}

export const load: LayoutServerLoad = async (event) => {
  const { url, request } = event;

  // Get the current session
  let session = await auth.api.getSession({
    headers: request.headers,
  });

  // Check if this is a public route
  const isPublic = isPublicRoute(url.pathname);
  const activeApp = getActiveApp(url.pathname);

  // Desktop auto-login: the hook (hooks.server.ts) handles sign-in for every
  // request and stores the user in event.locals.desktopUser. Use it here to
  // populate the session object so the rest of the layout load can proceed as
  // if the user authenticated normally.
  if (!session?.user && event.locals.desktopUser) {
    session = { user: event.locals.desktopUser, session: { id: "", token: "" } } as typeof session;
  }

  // If not authenticated and trying to access protected route, redirect to login
  if (!session?.user && !isPublic) {
    const redirectTo = url.pathname + url.search;
    throw redirect(302, `/login?redirect=${encodeURIComponent(redirectTo)}`);
  }

  // If authenticated and trying to access auth pages, redirect to home
  if (session?.user && url.pathname.startsWith("/login")) {
    throw redirect(302, "/");
  }
  if (session?.user && url.pathname.startsWith("/signup")) {
    throw redirect(302, "/");
  }

  // Check if authenticated user needs onboarding (but not if already on onboarding page)
  // Skip redirect if user is in tour mode (tour bypasses onboarding temporarily)
  // Skip redirect in desktop mode — the desktop setup wizard handles first-launch config.
  if (
    session?.user &&
    !url.pathname.startsWith("/onboarding") &&
    !isInTourMode(url) &&
    env.DESKTOP_MODE !== "true"
  ) {
    const ctx = await createContext(fromSvelteKit(event), event.locals.preAuth);
    const caller = createCaller(ctx);
    const workspace = await caller.workspaceRoutes.getCurrent();

    if (needsOnboarding(workspace)) {
      throw redirect(302, "/onboarding");
    }
  }

  // For public routes without auth, return minimal data
  if (!session?.user && isPublic) {
    return {
      pathname: url.pathname,
      isPublicRoute: isPublic,
      activeApp,
      user: null,
      currentWorkspace: null,
      accounts: [],
      payees: [],
      payeeCategories: [],
      categories: [],
      schedules: [],
      budgets: [],
      manageAccountForm: await superValidate(zod4(superformInsertAccountSchema)),
      manageScheduleForm: await superValidate(zod4(formInsertScheduleSchema)),
    };
  }

  const ctx = await createContext(fromSvelteKit(event), event.locals.preAuth);
  const caller = createCaller(ctx);

  return {
    pathname: url.pathname,
    isPublicRoute: isPublic,
    activeApp,
    user: session?.user ?? null,
    currentWorkspace: await caller.workspaceRoutes.getCurrent(),
    accounts: await caller.accountRoutes.all(),
    payees: await caller.payeeRoutes.all(),
    payeeCategories: await caller.payeeCategoriesRoutes.list(),
    categories: await caller.categoriesRoutes.all(),
    schedules: await caller.scheduleRoutes.all(),
    budgets: await caller.budgetRoutes.list(),
    manageAccountForm: await superValidate(zod4(superformInsertAccountSchema)),
    manageScheduleForm: await superValidate(zod4(formInsertScheduleSchema)),
  };
};
