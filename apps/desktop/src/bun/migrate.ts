import { mkdirSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export async function runMigrations(databasePath: string): Promise<void> {
	// Ensure the database directory exists
	const dbDir = dirname(databasePath);
	if (!existsSync(dbDir)) {
		mkdirSync(dbDir, { recursive: true });
		console.log(`Created database directory: ${dbDir}`);
	}

	const { createClient } = await import("@libsql/client");
	const { drizzle } = await import("drizzle-orm/libsql");
	const { migrate } = await import("drizzle-orm/libsql/migrator");

	const client = createClient({ url: `file:${databasePath}` });
	const db = drizzle(client);

	// Find the migrations folder — try several paths since the runtime
	// location varies between dev (source) and bundled (app bundle)
	const candidates = [
		resolve(process.cwd(), "../../apps/budget/drizzle"),
		resolve(process.cwd(), "../apps/budget/drizzle"),
		resolve(process.cwd(), "apps/budget/drizzle"),
		resolve(import.meta.dir, "../../../../apps/budget/drizzle"),
		resolve(import.meta.dir, "../../../../../apps/budget/drizzle"),
	];

	const migrationsFolder = candidates.find((p) => existsSync(resolve(p, "meta/_journal.json")));

	if (!migrationsFolder) {
		console.warn("Could not find migrations folder. Skipping migrations.");
		console.warn("Tried:", candidates);
		return;
	}

	try {
		await migrate(db, { migrationsFolder });
		console.log("Database migrations complete");
	} catch (error) {
		console.error("Migration error:", error);
		throw error;
	}
}
