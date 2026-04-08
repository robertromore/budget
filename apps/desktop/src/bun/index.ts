import { BrowserWindow, BrowserView, Updater } from "electrobun/bun";
import { loadConfig } from "./config";
import { runMigrations } from "./migrate";
import { handleSetup, handleAutoLogin, getConfig } from "./server";
import { startSvelteKitServer } from "./sveltekit-server";
import type { AppRPC } from "../shared/rpc";

// Load config and run migrations
const config = loadConfig();
try {
	await runMigrations(config.databasePath);
} catch (error) {
	console.error("Failed to run migrations:", error);
}

// If setup is already complete, start the SvelteKit server immediately
// so it's ready by the time the user finishes the brief setup/login phase.
if (config.setupComplete) {
	startSvelteKitServer(config).catch((err) =>
		console.error("Failed to start SvelteKit server:", err)
	);
}

// Dev server detection for Vite HMR (setup/login SPA phase)
const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getSetupViewUrl(): Promise<string> {
	const channel = await Updater.localInfo.channel();
	if (channel === "dev") {
		try {
			await fetch(DEV_SERVER_URL, { method: "HEAD" });
			console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
			return DEV_SERVER_URL;
		} catch {
			console.log("Vite dev server not running. Using bundled views.");
		}
	}
	return "views://mainview/index.html";
}

/**
 * Navigate the main window to the full SvelteKit app.
 * Waits for the server to be ready before loading the URL.
 */
async function navigateToApp(window: BrowserWindow): Promise<void> {
	try {
		const port = await startSvelteKitServer(config);
		// Give the SvelteKit server a moment to fully initialize on first launch
		await Bun.sleep(300);
		window.webview?.loadURL(`http://localhost:${port}/`);
		console.log(`Navigated to SvelteKit app on port ${port}`);
	} catch (err) {
		console.error("Failed to navigate to SvelteKit app:", err);
	}
}

// Define RPC handlers for the setup/login phase
const rpc = BrowserView.defineRPC<AppRPC>({
	maxRequestTime: 30000,
	handlers: {
		requests: {
			getConfig: () => {
				return getConfig();
			},
			setup: async (params) => {
				return await handleSetup(params);
			},
			autoLogin: async () => {
				const result = await handleAutoLogin();
				if (result.success) {
					// Hand off to the full SvelteKit app
					navigateToApp(mainWindow);
				}
				return result;
			},
		},
		messages: {},
	},
});

const setupUrl = await getSetupViewUrl();

const mainWindow = new BrowserWindow({
	title: "Budget",
	url: setupUrl,
	rpc,
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
});

// If setup was already complete when the app launched, navigate directly to the
// SvelteKit app once the server is ready (bypasses setup/login SPA entirely).
if (config.setupComplete) {
	navigateToApp(mainWindow);
}

console.log(`Budget desktop running (setup: ${config.setupComplete ? "complete" : "pending"})`);
