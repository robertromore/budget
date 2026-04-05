import type { RPCSchema } from "electrobun/bun";

/**
 * RPC schema for communication between the Bun main process and the webview.
 *
 * Instead of running an HTTP server, the webview sends tRPC-like procedure
 * calls through Electrobun's encrypted RPC channel. The main process executes
 * them against @budget/core's tRPC router via createCaller().
 */
export type AppRPC = {
	bun: RPCSchema<{
		requests: {
			/** Execute a tRPC procedure (query or mutation) */
			trpcCall: {
				params: {
					/** Dot-separated procedure path, e.g. "accountRoutes.all" */
					path: string;
					/** Input data for the procedure */
					input?: any;
					/** "query" or "mutate" */
					type: "query" | "mutate";
				};
				response: any;
			};
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
			/** Auto-login for local auth mode */
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
