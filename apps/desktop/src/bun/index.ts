import { BrowserWindow, Updater } from "electrobun/bun";
import { loadConfig } from "./config";
import { startServer } from "./server";
import { runMigrations } from "./migrate";

// Load desktop configuration
const config = loadConfig();

// Run database migrations
try {
	await runMigrations(config.databasePath);
} catch (error) {
	console.error("Failed to run migrations:", error);
}

// Start the tRPC server
const serverPort = startServer(config);

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
	frame: {
		width: 1200,
		height: 800,
		x: 100,
		y: 100,
	},
});

console.log(
	`Budget desktop running (server: localhost:${serverPort}, setup: ${config.setupComplete ? "complete" : "pending"})`,
);
