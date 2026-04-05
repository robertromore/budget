import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Find the monorepo root by walking up from a starting path
 * looking for the root package.json with workspaces field.
 */
function findMonorepoRoot(startDir: string): string | null {
	let dir = startDir;
	for (let i = 0; i < 20; i++) {
		const pkgPath = resolve(dir, "package.json");
		if (existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(require("fs").readFileSync(pkgPath, "utf-8"));
				if (pkg.workspaces) return dir;
			} catch {}
		}
		const parent = dirname(dir);
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

export async function runMigrations(databasePath: string): Promise<void> {
	// Ensure the database directory exists
	const dbDir = dirname(databasePath);
	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
		console.log(`Created database directory: ${dbDir}`);
	}

	// Find migrations folder — walk up from known locations to find monorepo root
	const searchStarts = [
		process.cwd(),
		dirname(process.argv[1] || ""),
		import.meta.dir,
	];

	let migrationsFolder: string | null = null;
	for (const start of searchStarts) {
		const root = findMonorepoRoot(start);
		if (root) {
			const candidate = resolve(root, "apps/budget/drizzle");
			if (existsSync(resolve(candidate, "meta/_journal.json"))) {
				migrationsFolder = candidate;
				break;
			}
		}
	}

	if (!migrationsFolder) {
		console.warn("Could not find migrations folder. Skipping migrations.");
		return;
	}

	const { createClient } = await import("@libsql/client");
	const { drizzle } = await import("drizzle-orm/libsql");
	const { migrate } = await import("drizzle-orm/libsql/migrator");

	const client = createClient({ url: `file:${databasePath}` });
	const db = drizzle(client);

	try {
		await migrate(db, { migrationsFolder });
		console.log("Database migrations complete");
	} catch (error) {
		console.error("Migration error:", error);
		throw error;
	}
}
