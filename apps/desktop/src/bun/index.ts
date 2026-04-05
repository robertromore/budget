import { BrowserWindow, BrowserView, Updater } from "electrobun/bun";
import { loadConfig } from "./config";
import { runMigrations } from "./migrate";
import { executeTrpcCall, handleSetup, handleAutoLogin, getConfig } from "./server";
import type { AppRPC } from "../shared/rpc";

// Load config and run migrations
const config = loadConfig();
try {
	await runMigrations(config.databasePath);
} catch (error) {
	console.error("Failed to run migrations:", error);
}

// Define RPC handlers
const rpc = BrowserView.defineRPC<AppRPC>({
	maxRequestTime: 30000,
	handlers: {
		requests: {
			trpcCall: async ({ path, input, type }) => {
				return await executeTrpcCall(path, input, type);
			},
			getConfig: () => {
				return getConfig();
			},
			setup: async (params) => {
				return await handleSetup(params);
			},
			autoLogin: async () => {
				return await handleAutoLogin();
			},
		},
		messages: {},
	},
});

// Dev server detection for Vite HMR
const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
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

const url = await getMainViewUrl();

const mainWindow = new BrowserWindow({
	title: "Budget",
	url,
	rpc,
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
});

console.log(`Budget desktop running (setup: ${config.setupComplete ? "complete" : "pending"})`);
