/**
 * Initialize platform adapters for @budget/core query layer.
 * Must be imported before any query/rpc usage.
 */
import { setTrpcClientFactory } from "$core/trpc/client-factory";
import { setToastAdapter } from "$core/query/_toast";
import { trpc } from "./trpc-client";

// Wire tRPC client factory
setTrpcClientFactory(trpc);

// Wire toast adapter (console-based for PoC)
setToastAdapter({
	success: (msg: string) => console.log(`[success] ${msg}`),
	error: (msg: string) => console.error(`[error] ${msg}`),
	info: (msg: string) => console.info(`[info] ${msg}`),
});

console.log("Desktop adapters initialized");
