import type { Router } from "$core/trpc/router";
import { setTrpcClientFactory } from "$core/trpc/client-factory";
import { setToastAdapter } from "$core/query/_toast";
import { toast as appToast } from "$lib/utils/toast-interceptor";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

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

// Wire up adapters for core query layer
setTrpcClientFactory(trpc);
// Use lazy wrappers so appToast is accessed at call time rather than at module
// evaluation time — avoids a TDZ error when circular imports cause client.ts
// to evaluate before toast-interceptor.ts has finished initializing.
setToastAdapter({
  success: (msg, opts) => appToast.success(msg, opts),
  error: (msg, opts) => appToast.error(msg, opts),
  info: (msg, opts) => appToast.info(msg, opts),
});
