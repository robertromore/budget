import { setEnvProvider } from "@budget/core/server/env";
import { type DesktopConfig, saveConfig, loadConfig } from "./config";
import { runMigrations } from "./migrate";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

// Wire env provider BEFORE any other @budget/core imports.
// The auth module is a singleton that reads env at init time.
const _config = loadConfig();
setEnvProvider({
	get: (key: string) => {
		if (key === "DATABASE_URL") return `file:${_config.databasePath}`;
		if (key === "BETTER_AUTH_SECRET") return "budget-desktop-local-secret-key";
		if (key === "BETTER_AUTH_URL") return `http://localhost:2022`;
		if (key === "BETTER_AUTH_TRUSTED_ORIGINS") return "http://localhost:2022,http://localhost:5174,views://mainview";
		if (key === "NODE_ENV") return "production";
		return process.env[key];
	},
});

// Now safe to import core modules that depend on env
const { router } = await import("@budget/core/trpc");
const { createContext } = await import("@budget/core/trpc");
type RequestAdapter = import("@budget/core/trpc").RequestAdapter;
type CookieOptions = import("@budget/core/trpc").CookieOptions;

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
			// Cookies handled by Better Auth's fetch handler
		},
	};
}

export function startServer(config: DesktopConfig): number {
	const { fetchRequestHandler } = require("@trpc/server/adapters/fetch");

	// Try preferred port, fall back to next available
	let port = 2022;
	for (let attempt = 0; attempt < 10; attempt++) {
		try {
			const testServer = Bun.serve({ port: port + attempt, fetch: () => new Response("") });
			testServer.stop();
			port = port + attempt;
			break;
		} catch {
			console.log(`Port ${port + attempt} in use, trying next...`);
		}
	}

	const server = Bun.serve({
		port,
		fetch: async (req: Request) => {
			const url = new URL(req.url);

			const corsHeaders = {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type, Authorization",
				"Access-Control-Allow-Credentials": "true",
			};

			if (req.method === "OPTIONS") {
				return new Response(null, { status: 204, headers: corsHeaders });
			}

			// Desktop setup API
			if (url.pathname === "/api/setup" && req.method === "POST") {
				try {
					const body = await req.json() as {
						databasePath: string;
						authMode: "local" | "password";
						email?: string;
						password?: string;
					};

					config.databasePath = body.databasePath;
					config.authMode = body.authMode;
					config.setupComplete = true;
					saveConfig(config);

					await runMigrations(config.databasePath);

					if (body.authMode === "password" && body.email && body.password) {
						const { auth } = await import("@budget/core/server/auth");
						await auth.api.signUpEmail({
							body: { email: body.email, password: body.password, name: "Admin" },
						});
					} else if (body.authMode === "local") {
						const { auth } = await import("@budget/core/server/auth");
						try {
							await auth.api.signUpEmail({
								body: { email: "local@budget.app", password: "local-desktop-user", name: "Local User" },
							});
						} catch {}
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

			// Desktop config API
			if (url.pathname === "/api/config" && req.method === "GET") {
				return Response.json(config, { headers: corsHeaders });
			}

			// Better Auth routes
			if (url.pathname.startsWith("/api/auth")) {
				try {
					const { auth } = await import("@budget/core/server/auth");
					const response = await auth.handler(req);
					for (const [key, value] of Object.entries(corsHeaders)) {
						response.headers.set(key, value);
					}
					return response;
				} catch (error) {
					console.error("Auth error:", error);
					return new Response("Auth error", { status: 500, headers: corsHeaders });
				}
			}

			// tRPC routes
			if (url.pathname.startsWith("/api/trpc")) {
				try {
					const response = await fetchRequestHandler({
						endpoint: "/api/trpc",
						req,
						router,
						createContext: () => createContext(fromBunRequest(req)),
						onError: ({ type, path, error }: any) => {
							console.error(`tRPC error (${type} @ ${path}):`, error.message);
						},
					});
					for (const [key, value] of Object.entries(corsHeaders)) {
						response.headers.set(key, value);
					}
					return response;
				} catch (error) {
					console.error("tRPC error:", error);
					return new Response("Server error", { status: 500, headers: corsHeaders });
				}
			}

			// Serve static frontend files
			const staticDir = resolve(import.meta.dir, "../views/mainview");
			let filePath = url.pathname === "/" ? "/index.html" : url.pathname;
			const fullPath = resolve(staticDir, `.${filePath}`);

			if (existsSync(fullPath)) {
				return new Response(Bun.file(fullPath), { headers: corsHeaders });
			}

			// SPA fallback
			const indexPath = resolve(staticDir, "index.html");
			if (existsSync(indexPath)) {
				return new Response(Bun.file(indexPath), { headers: corsHeaders });
			}

			return new Response("Not Found", { status: 404, headers: corsHeaders });
		},
	});

	console.log(`tRPC server running on http://localhost:${server.port}`);
	return server.port;
}
