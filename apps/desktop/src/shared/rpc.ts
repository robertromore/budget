import type { RPCSchema } from "electrobun/bun";

/**
 * RPC schema for the setup/login phase of the desktop app.
 *
 * These handlers run before the SvelteKit server takes over. Once setup is
 * complete and autoLogin succeeds, the main process navigates the webview to
 * the full SvelteKit app and this RPC channel is no longer used for data.
 */
export type AppRPC = {
	bun: RPCSchema<{
		requests: {
			/** Get desktop app configuration */
			getConfig: {
				params: {};
				response: {
					databasePath: string;
					authMode: "local" | "password";
					setupComplete: boolean;
				};
			};
			/** Complete first-launch setup */
			setup: {
				params: {
					databasePath: string;
					authMode: "local" | "password";
					email?: string;
					password?: string;
				};
				response: { success: boolean; error?: string };
			};
			/** Auto-login for local auth mode, then hands off to SvelteKit */
			autoLogin: {
				params: {};
				response: { success: boolean; user?: { name: string; email: string } };
			};
		};
		messages: {};
	}>;
	webview: RPCSchema<{
		requests: {};
		messages: {};
	}>;
};
