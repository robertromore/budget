import type { Router } from "$core/trpc/router";
import { setTrpcClientFactory } from "$core/trpc/client-factory";
import { setToastAdapter } from "$core/query/_toast";
import { toast } from "svelte-sonner";
import { createTRPCClient, httpBatchLink } from "@trpc/client";

let browserClient: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && browserClient) return browserClient;

  const client = createTRPCClient<Router>({
    links: [
      httpBatchLink({
        url: "/api/trpc",
        maxURLLength: Infinity,
      }),
    ],
  });

  if (isBrowser) browserClient = client;
  return client;
}

setTrpcClientFactory(trpc);
setToastAdapter({
  success: (msg, opts) => toast.success(msg, opts),
  error: (msg, opts) => toast.error(msg, opts),
  info: (msg, opts) => toast.info(msg, opts),
});
