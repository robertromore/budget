/**
 * SvelteKit environment provider initialization.
 *
 * Import this module once at startup (e.g., in hooks.server.ts) to wire
 * SvelteKit's `$env/dynamic/private` into the env abstraction layer.
 */
import { env } from "$env/dynamic/private";
import { setEnvProvider } from "./env";

setEnvProvider({ get: (key) => env[key] });
