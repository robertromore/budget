import { browser } from "$app/environment";
import { shouldPersistToLocalStorage } from "$lib/utils/local-storage.svelte";
import { queuePreferencesSync, loadPreferencesFromBackend } from "./preferences-sync";

const FONT_SIZE_KEY = "app-font-size";

export type FontSize = "small" | "normal" | "large";

const FONT_SIZES: Record<FontSize, string> = {
	small: "14px",
	normal: "16px",
	large: "18px",
};

const FONT_SIZE_ORDER: FontSize[] = ["small", "normal", "large"];

/**
 * Font size store using Svelte 5 runes
 * Manages font size preference
 *
 * Syncs to:
 * - localStorage for immediate persistence (only when authenticated)
 * - Backend (users.preferences) for cross-device sync when authenticated
 */
function createFontSizeStore() {
	let current = $state<FontSize>("normal");
	let initialized = false;

	// Initialize from localStorage on client (only on authenticated routes)
	if (shouldPersistToLocalStorage()) {
		const stored = localStorage.getItem(FONT_SIZE_KEY) as FontSize | null;
		const initialSize =
			stored && FONT_SIZE_ORDER.includes(stored) ? stored : "normal";
		current = initialSize;
		applyFontSize(initialSize);
		loadFromBackend();
	}

	function applyFontSize(size: FontSize) {
		if (browser) {
			document.documentElement.style.setProperty("--app-font-size", FONT_SIZES[size]);
			document.documentElement.setAttribute("data-font-size", size);
		}
	}

	function set(size: FontSize) {
		current = size;
		if (browser) {
			applyFontSize(size);
		}
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(FONT_SIZE_KEY, size);
			queuePreferencesSync({ fontSize: size });
		}
	}

	function cycle() {
		const currentIndex = FONT_SIZE_ORDER.indexOf(current);
		const nextIndex = (currentIndex + 1) % FONT_SIZE_ORDER.length;
		set(FONT_SIZE_ORDER[nextIndex]!);
	}

	async function loadFromBackend() {
		if (!browser || initialized) return;
		initialized = true;

		try {
			const backendPrefs = await loadPreferencesFromBackend();
			if (backendPrefs && backendPrefs.fontSize) {
				// Backend takes precedence
				current = backendPrefs.fontSize;
				if (shouldPersistToLocalStorage()) {
					localStorage.setItem(FONT_SIZE_KEY, backendPrefs.fontSize);
				}
				applyFontSize(backendPrefs.fontSize);
			}
		} catch (error) {
			// Silently fail - localStorage is the fallback
			console.debug("Failed to load font size from backend:", error);
		}
	}

	/**
	 * Initialize from backend preferences (called when user logs in)
	 */
	function initFromBackend(size: FontSize) {
		current = size;
		if (browser) {
			applyFontSize(size);
		}
		if (shouldPersistToLocalStorage()) {
			localStorage.setItem(FONT_SIZE_KEY, size);
		}
	}

	return {
		get current() {
			return current;
		},
		get sizes() {
			return FONT_SIZES;
		},
		set,
		cycle,
		initFromBackend,
	};
}

export const fontSize = createFontSizeStore();
