import "$lib/server/env-sveltekit";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { auth } from "$core/server/auth";
import { building } from "$app/environment";
import { env } from "$env/dynamic/private";
import type { Handle } from "@sveltejs/kit";

/**
 * SvelteKit server hooks
 *
 * Handles:
 * - Desktop auto-login (DESKTOP_MODE=true): establishes a session for every
 *   request so tRPC procedures and page loaders all receive authenticated context
 * - Better Auth routes (/api/auth/*)
 */
export const handle: Handle = async ({ event, resolve }) => {
  // Desktop auto-login: runs before every request (page loads AND /api/trpc/ calls)
  // so all server-side code receives authenticated context via event.locals.preAuth.
  if (env.DESKTOP_MODE === "true" && !event.url.pathname.startsWith("/api/auth")) {
    const session = await auth.api.getSession({ headers: event.request.headers });

    if (!session?.user) {
      const signInResponse = await auth.api.signInEmail({
        body: { email: "local@budget.app", password: "local-desktop-user" },
        asResponse: true,
      });

      if (signInResponse.ok) {
        const data = await signInResponse.json() as any;

        if (data.user?.id && data.token) {
          event.locals.preAuth = { userId: data.user.id, sessionToken: data.token };
          event.locals.desktopUser = data.user;

          // Propagate the auth cookies to this response so subsequent requests
          // use cookie-based auth and bypass this sign-in path.
          const setCookieHeader = signInResponse.headers.get("set-cookie");
          if (setCookieHeader) {
            for (const cookieStr of setCookieHeader.split(/,(?=[^ ])/)) {
              const [nameValue, ...directives] = cookieStr.trim().split(";").map((s) => s.trim());
              const [name, ...valueParts] = nameValue.split("=");
              const value = valueParts.join("=");
              const opts: {
                path: string;
                httpOnly?: boolean;
                secure?: boolean;
                maxAge?: number;
                sameSite?: "strict" | "lax" | "none";
              } = { path: "/" };
              for (const d of directives) {
                const lower = d.toLowerCase();
                if (lower === "httponly") opts.httpOnly = true;
                else if (lower === "secure") opts.secure = true;
                else if (lower.startsWith("max-age=")) opts.maxAge = parseInt(d.split("=")[1]);
                else if (lower.startsWith("samesite=")) {
                  const val = d.split("=")[1].toLowerCase();
                  if (val === "strict" || val === "lax" || val === "none") opts.sameSite = val;
                } else if (lower.startsWith("path=")) opts.path = d.split("=")[1];
              }
              event.cookies.set(name, value, opts);
            }
          }
        }
      }
    }
  }

  return svelteKitHandler({ event, resolve, auth, building });
};
