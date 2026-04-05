/**
 * Environment variable abstraction layer.
 *
 * Decouples server code from SvelteKit's `$env/dynamic/private` module,
 * allowing the same code to run in SvelteKit, Bun.serve, or any other runtime.
 *
 * The default provider reads from `process.env`. SvelteKit overrides this
 * at startup via `setEnvProvider()` in `env-sveltekit.ts`.
 */

export interface EnvProvider {
  get(key: string): string | undefined;
}

let provider: EnvProvider = {
  get: (key) => process.env[key],
};

export function setEnvProvider(p: EnvProvider): void {
  provider = p;
}

export function getEnv(key: string): string | undefined {
  return provider.get(key);
}

export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}
