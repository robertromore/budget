import type { Router } from "./router";
import type { CreateTRPCClient } from "@trpc/client";

/**
 * Platform-agnostic tRPC client factory.
 *
 * The app initializes this at startup with its platform-specific client
 * (e.g., httpBatchLink for SvelteKit, localhost for Electrobun).
 * Query layer files import `trpc()` from here instead of a specific client.
 */
let clientFactory: (() => CreateTRPCClient<Router>) | null = null;

export function setTrpcClientFactory(factory: () => CreateTRPCClient<Router>): void {
  clientFactory = factory;
}

export function trpc(): CreateTRPCClient<Router> {
  if (!clientFactory) throw new Error("tRPC client not initialized — call setTrpcClientFactory() at startup");
  return clientFactory();
}
