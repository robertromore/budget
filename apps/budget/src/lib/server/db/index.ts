import * as schema from "$lib/schema/index";
import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';

// Support both SvelteKit context ($env) and standalone scripts (process.env)
let DATABASE_URL: string;

try {
	// Try SvelteKit's $env first (dynamic import to avoid build errors)
	const { env } = await import('$env/dynamic/private');
	DATABASE_URL = env.DATABASE_URL || '';
} catch {
	// Fallback to process.env for scripts running outside SvelteKit
	DATABASE_URL = process.env.DATABASE_URL || '';
}

if (!DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: DATABASE_URL });

export const db = drizzle(client, { schema });
