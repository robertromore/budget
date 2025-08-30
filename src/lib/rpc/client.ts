import { browser } from "$app/environment";
import { createORPCClient } from "@orpc/client";
import type { Router } from "$lib/server/rpc/router";

// Create the proper oRPC client with full type safety
export const orpcClient = createORPCClient<Router>({
  baseURL: browser ? "/api/rpc" : "http://localhost:5173/api/rpc",
  fetch: fetch,
});

// Export a function to get the client (for consistency with previous patterns)
export function orpc() {
  return orpcClient;
}
