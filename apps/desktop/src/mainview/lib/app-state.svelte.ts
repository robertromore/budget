/**
 * Shared app phase state.
 * Avoids passing callbacks through $props() which can fail
 * due to Svelte 5 proxy issues in bundled webview contexts.
 */

export type AppPhase = "loading" | "setup" | "login" | "app";

let phase = $state<AppPhase>("loading");

export function getPhase(): AppPhase {
	return phase;
}

export function setPhase(p: AppPhase): void {
	phase = p;
}
