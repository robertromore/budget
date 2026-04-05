import type { RequestEvent } from "@sveltejs/kit";
import type { RequestAdapter } from "../context";

/**
 * Creates a RequestAdapter from a SvelteKit RequestEvent.
 *
 * Bridges SvelteKit's cookie/header API to the platform-agnostic
 * RequestAdapter interface used by the tRPC context layer.
 */
export function fromSvelteKit(event: RequestEvent): RequestAdapter {
  return {
    headers: event.request.headers,
    getCookie: (name) => event.cookies.get(name),
    setCookie: (name, value, opts) =>
      event.cookies.set(name, value, {
        path: opts.path ?? "/",
        maxAge: opts.maxAge,
        sameSite: opts.sameSite,
        httpOnly: opts.httpOnly,
        secure: opts.secure,
        domain: opts.domain,
        expires: opts.expires,
      }),
  };
}
