import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { DesktopConfig } from "./config";

let serverPort: number | null = null;

/**
 * Start the SvelteKit budget app as a local Bun.serve() server.
 * Returns the ephemeral port the server is listening on.
 * Calling this multiple times is safe — the server only starts once.
 */
export async function startSvelteKitServer(config: DesktopConfig): Promise<number> {
	if (serverPort) return serverPort;

	// Set env vars before importing the SvelteKit handler so Better Auth,
	// Drizzle, and other modules read the correct values at init time.
	process.env.DATABASE_URL = `file:${config.databasePath}`;
	process.env.BETTER_AUTH_SECRET = "budget-desktop-local-secret-key-32chars!!";
	process.env.DESKTOP_MODE = "true";
	process.env.NODE_ENV = "production";
	// BETTER_AUTH_URL and BETTER_AUTH_TRUSTED_ORIGINS are set after we know the port.

	const handlerPath = resolveHandlerPath();
	const serverIndexPath = handlerPath.replace("handler.js", "server/index.js");

	// svelte-adapter-bun injects a websocket() method on the SvelteKit Server
	// class only when the app defines WebSocket hooks. This app has none, so the
	// method is missing. Patch the prototype before handler.js instantiates it.
	const { Server } = await import(serverIndexPath) as any;
	if (Server?.prototype && typeof Server.prototype.websocket !== "function") {
		Server.prototype.websocket = () => null;
	}

	const { getHandler } = await import(handlerPath) as any;
	const { fetch: skFetch, websocket } = getHandler();

	const server = Bun.serve({
		port: 0, // ephemeral
		fetch: skFetch,
		...(websocket ? { websocket } : {}),
	});

	// Update auth URL env vars with the actual port.
	// Better Auth reads these at request time so setting them after serve() is fine.
	process.env.BETTER_AUTH_URL = `http://localhost:${server.port}`;
	process.env.BETTER_AUTH_TRUSTED_ORIGINS = `http://localhost:${server.port}`;

	serverPort = server.port ?? null;
	if (!serverPort) throw new Error("SvelteKit server failed to bind to a port");
	console.log(`SvelteKit server running on http://localhost:${serverPort}`);
	return serverPort;
}

/**
 * Resolve the path to the SvelteKit build handler.
 *
 * import.meta.url always points to the bundled file inside the Electrobun
 * .app bundle, so we can't use a fixed relative path. Instead we probe
 * candidate locations with existsSync:
 *   1. Production: handler.js is copied into the bundle as budget-server/
 *   2. Dev: walk upward from the bundle to find the monorepo build output
 */
function resolveHandlerPath(): string {
	const selfDir = dirname(fileURLToPath(import.meta.url));

	// Production: Electrobun copies apps/budget/build → budget-server/ in the bundle
	const prodPath = resolve(selfDir, "../budget-server/handler.js");
	if (existsSync(prodPath)) return prodPath;

	// Dev: scan upward from the bundle directory to find the monorepo handler.
	// The bundle sits several levels inside the .app bundle; the handler is at
	// <monorepo-root>/apps/budget/build/handler.js somewhere up the tree.
	for (let up = 4; up <= 12; up++) {
		const candidate = resolve(selfDir, "../".repeat(up), "apps/budget/build/handler.js");
		if (existsSync(candidate)) return candidate;
	}

	throw new Error(
		`Cannot find SvelteKit handler.js. Searched upward from: ${selfDir}\n` +
		`Run 'bun run build' in apps/budget first.`
	);
}
