import { formInsertScheduleSchema } from "$lib/schema";
import { superformInsertAccountSchema } from "$lib/schema/superforms";
import { auth } from "$lib/server/auth";
import { createContext } from "$lib/trpc/context";
import { createCaller } from "$lib/trpc/router";
import { redirect } from "@sveltejs/kit";
import { getLocalTimeZone, today } from "@internationalized/date";
import { superValidate } from "sveltekit-superforms";
import { zod4 } from "sveltekit-superforms/adapters";
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
 * Check if the current path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if user needs to complete onboarding
 */
function needsOnboarding(workspace: { preferences?: string | null } | null): boolean {
  if (!workspace?.preferences) return true;

  try {
    const prefs = typeof workspace.preferences === "string"
      ? JSON.parse(workspace.preferences)
      : workspace.preferences;

    return !prefs?.onboarding?.wizardCompleted;
  } catch {
    return true;
  }
}

const thisday = today(getLocalTimeZone());
export const load: LayoutServerLoad = async (event) => {
  const { url, request } = event;

  // Get the current session
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  // Check if this is a public route
  const isPublic = isPublicRoute(url.pathname);

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
  if (session?.user && !url.pathname.startsWith("/onboarding")) {
    const ctx = await createContext(event);
    const caller = createCaller(ctx);
    const workspace = await caller.workspaceRoutes.getCurrent();

    if (needsOnboarding(workspace)) {
      throw redirect(302, "/onboarding");
    }
  }

  // For public routes without auth, return minimal data
  if (!session?.user && isPublic) {
    return {
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
      dates: [],
    };
  }

  const ctx = await createContext(event);
  const caller = createCaller(ctx);

  return {
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
    dates: [
      {
        value: thisday.subtract({ days: 1 }).toString(),
        label: "1 day ago",
      },
      {
        value: thisday.subtract({ days: 3 }).toString(),
        label: "3 days ago",
      },
      {
        value: thisday.subtract({ weeks: 1 }).toString(),
        label: "1 week ago",
      },
      {
        value: thisday.subtract({ months: 1 }).toString(),
        label: "1 month ago",
      },
      {
        value: thisday.subtract({ months: 3 }).toString(),
        label: "3 months ago",
      },
      {
        value: thisday.subtract({ months: 6 }).toString(),
        label: "6 months ago",
      },
      {
        value: thisday.subtract({ years: 1 }).toString(),
        label: "1 year ago",
      },
    ],
  };
};
