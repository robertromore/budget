import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "@budget/core/trpc";
import { createContext, type RequestAdapter, type CookieOptions } from "@budget/core/trpc";
import { setEnvProvider } from "@budget/core/server/env";
import type { DesktopConfig } from "./config";

function parseCookies(header: string): Record<string, string> {
	const cookies: Record<string, string> = {};
	for (const part of header.split(";")) {
		const [key, ...val] = part.trim().split("=");
		if (key) cookies[key] = val.join("=");
	}
	return cookies;
}

function fromBunRequest(req: Request): RequestAdapter {
	const cookieHeader = req.headers.get("cookie") || "";
	const cookies = parseCookies(cookieHeader);

	return {
		headers: req.headers,
		getCookie: (name: string) => cookies[name],
		setCookie: (name: string, value: string, _opts: CookieOptions) => {
			// In a real implementation, we'd accumulate Set-Cookie headers
			// For the PoC, cookies are handled by Better Auth's fetch handler
		},
	};
}

export function startServer(config: DesktopConfig): number {
	// Wire env provider with config-derived values
	setEnvProvider({
		get: (key: string) => {
			if (key === "DATABASE_URL") return `file:${config.databasePath}`;
			if (key === "BETTER_AUTH_SECRET") return "budget-desktop-local-secret-key";
			if (key === "BETTER_AUTH_URL") return `http://localhost`;
			if (key === "NODE_ENV") return "production";
			return process.env[key];
		},
	});

	const server = Bun.serve({
		port: 0, // Ephemeral port
		fetch: async (req: Request) => {
			const url = new URL(req.url);

			// CORS headers for the webview
			const corsHeaders = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Allow-Credentials": "true",
			};

			// Handle preflight
			if (req.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: corsHeaders });
			}

			// Handle Better Auth routes
			if (url.pathname.startsWith("/api/auth")) {
				try {
					const { auth } = await import("@budget/core/server/auth");
					const response = await auth.handler(req);
					// Add CORS headers
					for (const [key, value] of Object.entries(corsHeaders)) {
						response.headers.set(key, value);
					}
					return response;
				} catch (error) {
					console.error("Auth error:", error);
					return new Response("Auth error", { status: 500, headers: corsHeaders });
				}
			}

			// Handle tRPC routes
			if (url.pathname.startsWith("/api/trpc")) {
				try {
					const response = await fetchRequestHandler({
						endpoint: "/api/trpc",
						req,
						router,
						createContext: () => createContext(fromBunRequest(req)),
						onError: ({ type, path, error }) => {
							console.error(`tRPC error (${type} @ ${path}):`, error.message);
						},
					});
					// Add CORS headers
					for (const [key, value] of Object.entries(corsHeaders)) {
						response.headers.set(key, value);
					}
					return response;
				} catch (error) {
					console.error("tRPC error:", error);
					return new Response("Server error", { status: 500, headers: corsHeaders });
				}
			}

			return new Response("Not Found", { status: 404, headers: corsHeaders });
		},
	});

	console.log(`tRPC server running on http://localhost:${server.port}`);
	return server.port;
}
