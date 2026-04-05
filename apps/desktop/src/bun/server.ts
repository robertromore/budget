import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "@budget/core/trpc";
import { createContext, type RequestAdapter, type CookieOptions } from "@budget/core/trpc";
import { setEnvProvider } from "@budget/core/server/env";
import { type DesktopConfig, saveConfig } from "./config";
import { runMigrations } from "./migrate";

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
		port: 2022,
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

			// Handle desktop setup API
			if (url.pathname === "/api/setup" && req.method === "POST") {
				try {
					const body = await req.json() as {
						databasePath: string;
						authMode: "local" | "password";
						email?: string;
						password?: string;
					};

					// Update config
					config.databasePath = body.databasePath;
					config.authMode = body.authMode;
					config.setupComplete = true;
					saveConfig(config);

					// Re-run migrations with new path
					await runMigrations(config.databasePath);

					// Create initial user if password mode
					if (body.authMode === "password" && body.email && body.password) {
						const { auth } = await import("@budget/core/server/auth");
						await auth.api.signUpEmail({
							body: { email: body.email, password: body.password, name: "Admin" },
						});
					} else if (body.authMode === "local") {
						// Create a default local user
						const { auth } = await import("@budget/core/server/auth");
						try {
							await auth.api.signUpEmail({
								body: { email: "local@budget.app", password: "local-desktop-user", name: "Local User" },
							});
						} catch {
							// User may already exist
						}
					}

					return Response.json({ success: true }, { headers: corsHeaders });
				} catch (error) {
					console.error("Setup error:", error);
					return Response.json(
						{ success: false, error: String(error) },
						{ status: 500, headers: corsHeaders },
					);
				}
			}

			// Handle desktop config API
			if (url.pathname === "/api/config" && req.method === "GET") {
				return Response.json(config, { headers: corsHeaders });
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
