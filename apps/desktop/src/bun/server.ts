import { setEnvProvider } from "@budget/core/server/env";
import { type DesktopConfig, saveConfig, loadConfig } from "./config";
import { runMigrations } from "./migrate";

// Wire env provider BEFORE any other @budget/core imports.
// This is used during the setup phase only; the SvelteKit server sets its own
// process.env values in sveltekit-server.ts before importing the handler.
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

/**
 * Handle setup flow — save config, run migrations, create the local user.
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
 * Verify the local user can sign in. Called during the setup phase to confirm
 * credentials before handing off to the SvelteKit server.
 */
export async function handleAutoLogin(): Promise<{ success: boolean; user?: { name: string; email: string } }> {
	try {
		const { auth } = await import("@budget/core/server/auth");

		const response = await auth.api.signInEmail({
			body: { email: "local@budget.app", password: "local-desktop-user" },
			asResponse: true,
		});

		if (!response.ok) {
			console.error("Auto-login failed:", response.status, await response.text());
			return { success: false };
		}

		const data = await response.json() as any;
		const user = data?.user ?? {};
		return { success: true, user: { name: user.name ?? "Local User", email: user.email ?? "local@budget.app" } };
	} catch (error) {
		console.error("Auto-login error:", error);
		return { success: false };
	}
}

export function getConfig(): DesktopConfig {
	return { ..._config };
}
