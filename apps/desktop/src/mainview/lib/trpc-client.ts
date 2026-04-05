import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { Router } from "$core/trpc/router";

const SERVER_PORT = 2022;
const SERVER_URL = `http://localhost:${SERVER_PORT}/api/trpc`;

let client: ReturnType<typeof createTRPCClient<Router>>;

export function trpc() {
	if (client) return client;
	client = createTRPCClient<Router>({
		links: [httpBatchLink({ url: SERVER_URL })],
	});
	return client;
}
