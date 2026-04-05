import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface DesktopConfig {
	databasePath: string;
	authMode: "local" | "password";
	setupComplete: boolean;
}

const CONFIG_DIR = join(homedir(), ".config", "budget-desktop");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const DEFAULT_CONFIG: DesktopConfig = {
	databasePath: join(homedir(), "Documents", "budget", "budget.db"),
	authMode: "local",
	setupComplete: false,
};

export function loadConfig(): DesktopConfig {
	if (!existsSync(CONFIG_FILE)) return { ...DEFAULT_CONFIG };
	try {
		return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
	} catch {
		return { ...DEFAULT_CONFIG };
	}
}

export function saveConfig(config: DesktopConfig): void {
	mkdirSync(CONFIG_DIR, { recursive: true });
	writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getConfigPath(): string {
	return CONFIG_FILE;
}
