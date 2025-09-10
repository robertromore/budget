import type {Router} from "$lib/trpc/router";
import {createTRPCClient, type TRPCClientInit} from "trpc-sveltekit";

let browserClient: ReturnType<typeof createTRPCClient<Router>>;

export function trpc(init?: TRPCClientInit) {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && browserClient) return browserClient;
  const client = createTRPCClient<Router>(init ? {init} : {});
  if (isBrowser) browserClient = client;
  return client;
}

// export function trpc(init?: TRPCClientInit) {
//   if (typeof window === 'undefined' || !init)
//     return createTRPCClient<Router>({ init, transformer });
//   if (!defaultBrowserClient) defaultBrowserClient = createTRPCClient<Router>({ transformer });
//   return defaultBrowserClient;
// }
