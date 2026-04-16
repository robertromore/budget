import type { RequestEvent } from "@sveltejs/kit";
import type { RequestAdapter } from "$core/trpc/context";

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
    preAuth: event.locals.preAuth,
  };
}
