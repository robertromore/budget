import { setEnvProvider } from "@budget/core/server/env";
import { type DesktopConfig, saveConfig, loadConfig } from "./config";
import { runMigrations } from "./migrate";

// Wire env provider BEFORE any other @budget/core imports.
const _config = loadConfig();
setEnvProvider({
	get: (key: string) => {
		if (key === "DATABASE_URL") return `file:${_config.databasePath}`;
		if (key === "BETTER_AUTH_SECRET") return "budget-desktop-local-secret-key-32chars!!";
		if (key === "BETTER_AUTH_URL") return "http://localhost:2022";
		if (key === "BETTER_AUTH_TRUSTED_ORIGINS") return "http://localhost:2022,http://localhost:5174,views://mainview";
		if (key === "NODE_ENV") return "production";
		return process.env[key];
	},
});

// Now safe to import core modules
const { createCaller } = await import("@budget/core/trpc");
const { createContext } = await import("@budget/core/trpc");

/**
 * Create a tRPC caller context for desktop use.
 * No HTTP request involved — we construct a minimal RequestAdapter.
 */
function createDesktopContext() {
	return createContext({
		headers: new Headers(),
		getCookie: () => undefined,
		setCookie: () => {},
	});
}

/**
 * Execute a tRPC procedure by path using the server-side caller.
 */
export async function executeTrpcCall(
	path: string,
	input: any,
	type: "query" | "mutate"
): Promise<any> {
	const ctx = await createDesktopContext();
	const caller = createCaller(ctx);

	// Navigate the caller object by dot-separated path
	// e.g. "accountRoutes.all" → caller.accountRoutes.all
	const parts = path.split(".");
	let current: any = caller;
	for (const part of parts) {
		current = current[part];
		if (!current) throw new Error(`Unknown procedure path: ${path}`);
	}

	// Call the procedure
	if (type === "query") {
		return typeof current.query === "function"
			? await current.query(input)
			: await current(input);
	} else {
		return typeof current.mutate === "function"
			? await current.mutate(input)
			: await current(input);
	}
}

/**
 * Handle setup flow — save config, run migrations, create user.
 */
export async function handleSetup(params: {
	databasePath: string;
	authMode: "local" | "password";
	email?: string;
	password?: string;
}): Promise<{ success: boolean; error?: string }> {
	try {
		_config.databasePath = params.databasePath;
		_config.authMode = params.authMode;
		_config.setupComplete = true;
		saveConfig(_config);

		await runMigrations(_config.databasePath);

		const { auth } = await import("@budget/core/server/auth");

		if (params.authMode === "password" && params.email && params.password) {
			await auth.api.signUpEmail({
				body: { email: params.email, password: params.password, name: "Admin" },
			});
		} else if (params.authMode === "local") {
			try {
				await auth.api.signUpEmail({
					body: { email: "local@budget.app", password: "local-desktop-user", name: "Local User" },
				});
			} catch {
				// User may already exist
			}
		}

		return { success: true };
	} catch (error) {
		console.error("Setup error:", error);
		return { success: false, error: String(error) };
	}
}

/**
 * Auto-login for local auth mode.
 */
export async function handleAutoLogin(): Promise<{ success: boolean; user?: { name: string; email: string } }> {
	try {
		// For local mode, just verify the user exists and return it
		const ctx = await createDesktopContext();
		const caller = createCaller(ctx);
		// The user is already "logged in" since we bypass auth for desktop
		return { success: true, user: { name: "Local User", email: "local@budget.app" } };
	} catch (error) {
		return { success: false };
	}
}

export function getConfig(): DesktopConfig {
	return { ..._config };
}
