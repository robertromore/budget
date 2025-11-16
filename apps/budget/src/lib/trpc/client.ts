import type {Router} from "$lib/trpc/router";
import {createTRPCClient, httpBatchLink} from "@trpc/client";

let browserClient: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
  const isBrowser = typeof window !== "undefined";

  if (isBrowser && browserClient) {
    return browserClient;
  }

  const client = createTRPCClient<Router>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        maxURLLength: Infinity, // Disable URL length-based batching
      }),
    ],
  });

  if (isBrowser) {
    browserClient = client;
  }

  return client;
}
