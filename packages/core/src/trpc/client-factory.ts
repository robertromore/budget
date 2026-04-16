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
/**
 * A promise that resolves the instant `setTrpcClientFactory` is called.
 * Consumers scheduled at module-init time (e.g. preferences sync) `await`
 * this instead of racing module evaluation order.
 */
let readyResolve: (() => void) | null = null;
let readyPromise: Promise<void> = new Promise((resolve) => {
  readyResolve = resolve;
});

export function setTrpcClientFactory(factory: () => CreateTRPCClient<Router>): void {
  clientFactory = factory;
  if (readyResolve) {
    readyResolve();
    readyResolve = null;
  }
}

/**
 * Returns true once `setTrpcClientFactory` has been called at startup.
 * Prefer `whenTrpcClientReady()` when you can await readiness.
 */
export function isTrpcClientInitialized(): boolean {
  return clientFactory !== null;
}

/**
 * Resolves once the tRPC client factory has been wired. If the factory is
 * already set, resolves immediately. Use this from module-initialization
 * code that needs the client but may evaluate before the layout's startup
 * wiring runs.
 */
export function whenTrpcClientReady(): Promise<void> {
  if (clientFactory) return Promise.resolve();
  return readyPromise;
}

export function trpc(): CreateTRPCClient<Router> {
  if (!clientFactory) throw new Error("tRPC client not initialized — call setTrpcClientFactory() at startup");
  return clientFactory();
}
