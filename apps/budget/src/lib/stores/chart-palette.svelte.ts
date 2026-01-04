import { browser } from "$app/environment";
import { shouldPersistToLocalStorage } from "$lib/utils/local-storage.svelte";
import { queuePreferencesSync, loadPreferencesFromBackend } from "./preferences-sync";
import {
	CHART_PALETTE_PRESETS,
	getChartPalettePreset,
	type ChartPalettePreset,
} from "$lib/config/chart-palette-presets";

const STORAGE_KEY = "chart-palette";
const DEFAULT_PALETTE = "default";

/**
 * Chart palette store using Svelte 5 runes
 * Manages chart color palette preferences
 *
 * Syncs to:
 * - localStorage for immediate persistence
 * - Backend (users.preferences) for cross-device sync when authenticated
 */
class ChartPaletteStore {
	private paletteName = $state<string>(DEFAULT_PALETTE);
	private initialized = false;

	constructor() {
		if (shouldPersistToLocalStorage()) {
			this.loadFromStorage();
			this.loadFromBackend();
		}
	}

	/**
	 * Get the current palette name
	 */
	get current(): string {
		return this.paletteName;
	}

	/**
	 * Get the current palette preset
	 */
	get preset(): ChartPalettePreset {
		return getChartPalettePreset(this.paletteName) ?? CHART_PALETTE_PRESETS[0];
	}

	/**
	 * Get all available palettes
	 */
	get palettes(): ChartPalettePreset[] {
		return CHART_PALETTE_PRESETS;
	}

	/**
	 * Set the chart palette
	 */
	set(paletteName: string) {
		// Validate the palette exists
		const palette = getChartPalettePreset(paletteName);
		if (!palette) {
			console.warn(`Unknown chart palette: ${paletteName}, using default`);
			paletteName = DEFAULT_PALETTE;
		}

		this.paletteName = paletteName;
		this.applyPalette(paletteName);
		this.saveToStorage();
		this.syncToBackend(paletteName);
	}

	/**
	 * Initialize from backend preferences (called when user logs in)
	 */
	initFromBackend(paletteName: string | undefined) {
		if (paletteName) {
			this.paletteName = paletteName;
			this.applyPalette(paletteName);
			this.saveToStorage();
		}
	}

	/**
	 * Apply the palette colors as CSS variables
	 */
	private applyPalette(paletteName: string) {
		if (!browser) return;

		const palette = getChartPalettePreset(paletteName);
		if (!palette) return;

		const root = document.documentElement;
		const isDark = root.classList.contains("dark");
		const colors = isDark ? palette.colors.dark : palette.colors.light;

		root.style.setProperty("--chart-1", colors.chart1);
		root.style.setProperty("--chart-2", colors.chart2);
		root.style.setProperty("--chart-3", colors.chart3);
		root.style.setProperty("--chart-4", colors.chart4);
		root.style.setProperty("--chart-5", colors.chart5);
	}

	/**
	 * Re-apply palette when theme mode changes
	 */
	onThemeModeChange() {
		this.applyPalette(this.paletteName);
	}

	private loadFromStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				this.paletteName = stored;
			}
			// Apply palette on load
			this.applyPalette(this.paletteName);
		} catch (error) {
			console.error("Failed to load chart palette:", error);
		}
	}

	private async loadFromBackend() {
		if (!browser || this.initialized) return;
		this.initialized = true;

		try {
			const backendPrefs = await loadPreferencesFromBackend();
			if (backendPrefs?.chartPalette) {
				this.paletteName = backendPrefs.chartPalette;
				this.applyPalette(this.paletteName);
				this.saveToStorage();
			}
		} catch (error) {
			console.debug("Failed to load chart palette from backend:", error);
		}
	}

	private saveToStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			localStorage.setItem(STORAGE_KEY, this.paletteName);
		} catch (error) {
			console.error("Failed to save chart palette:", error);
		}
	}

	private syncToBackend(paletteName: string) {
		queuePreferencesSync({ chartPalette: paletteName });
	}
}

// Export singleton instance
export const chartPalette = new ChartPaletteStore();
