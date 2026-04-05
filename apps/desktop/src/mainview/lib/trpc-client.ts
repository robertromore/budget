import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { Router } from "$core/trpc/router";

// Same-origin: frontend is served from the tRPC server
const SERVER_URL = `${window.location.origin}/api/trpc`;

let client: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
	if (client) return client;
	client = createTRPCClient<Router>({
		links: [httpBatchLink({ url: SERVER_URL })],
	});
	return client;
}
