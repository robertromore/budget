import { browser } from "$app/environment";
import { shouldPersistToLocalStorage } from "$lib/utils/local-storage.svelte";
import { queuePreferencesSync, loadPreferencesFromBackend } from "./preferences-sync";

const STORAGE_KEY = "display-preferences";

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type NumberFormat = "en-US" | "de-DE" | "fr-FR";
export type TableDisplayMode = "popover" | "sheet";
export type BorderRadius = "none" | "sm" | "md" | "lg" | "xl";
export type NotificationMode = "toast" | "popover";

// Maps radius setting to CSS value
const radiusValues: Record<BorderRadius, string> = {
	none: "0",
	sm: "0.25rem",
	md: "0.5rem",
	lg: "0.625rem",
	xl: "1rem",
};

interface DisplayPreferencesData {
	dateFormat: DateFormat;
	currencySymbol: string;
	numberFormat: NumberFormat;
	showCents: boolean;
	tableDisplayMode: TableDisplayMode;
	borderRadius: BorderRadius;
	notificationMode: NotificationMode;
}

const defaults: DisplayPreferencesData = {
	dateFormat: "MM/DD/YYYY",
	currencySymbol: "$",
	numberFormat: "en-US",
	showCents: true,
	tableDisplayMode: "popover",
	borderRadius: "lg",
	notificationMode: "toast",
};

/**
 * Display preferences store using Svelte 5 runes
 * Manages display-related settings like date format, currency, and number formatting
 *
 * Syncs to:
 * - localStorage for immediate persistence
 * - Backend (users.preferences) for cross-device sync when authenticated
 */
class DisplayPreferencesStore {
	private preferences = $state<DisplayPreferencesData>({ ...defaults });
	private initialized = false;

	constructor() {
		if (shouldPersistToLocalStorage()) {
			this.loadFromStorage();
			this.loadFromBackend();
		}
	}

	get dateFormat(): DateFormat {
		return this.preferences.dateFormat;
	}

	get currencySymbol(): string {
		return this.preferences.currencySymbol;
	}

	get numberFormat(): NumberFormat {
		return this.preferences.numberFormat;
	}

	get showCents(): boolean {
		return this.preferences.showCents;
	}

	get tableDisplayMode(): TableDisplayMode {
		return this.preferences.tableDisplayMode;
	}

	get borderRadius(): BorderRadius {
		return this.preferences.borderRadius;
	}

	get notificationMode(): NotificationMode {
		return this.preferences.notificationMode;
	}

	setDateFormat(format: DateFormat) {
		this.preferences.dateFormat = format;
		this.saveToStorage();
		this.syncToBackend({ dateFormat: format });
	}

	setCurrencySymbol(symbol: string) {
		this.preferences.currencySymbol = symbol;
		this.saveToStorage();
		this.syncToBackend({ currencySymbol: symbol });
	}

	setNumberFormat(format: NumberFormat) {
		this.preferences.numberFormat = format;
		this.saveToStorage();
		this.syncToBackend({ numberFormat: format });
	}

	setShowCents(show: boolean) {
		this.preferences.showCents = show;
		this.saveToStorage();
		this.syncToBackend({ showCents: show });
	}

	setTableDisplayMode(mode: TableDisplayMode) {
		this.preferences.tableDisplayMode = mode;
		this.saveToStorage();
		this.syncToBackend({ tableDisplayMode: mode });
	}

	setBorderRadius(radius: BorderRadius) {
		this.preferences.borderRadius = radius;
		this.applyBorderRadius(radius);
		this.saveToStorage();
		this.syncToBackend({ borderRadius: radius });
	}

	setNotificationMode(mode: NotificationMode) {
		this.preferences.notificationMode = mode;
		this.saveToStorage();
		this.syncToBackend({ notificationMode: mode });
	}

	/**
	 * Apply the border radius CSS variable to the document
	 */
	private applyBorderRadius(radius: BorderRadius) {
		if (!browser) return;
		document.documentElement.style.setProperty("--radius", radiusValues[radius]);
	}

	/**
	 * Format a date according to the current preference
	 */
	formatDate(date: Date | string): string {
		const d = typeof date === "string" ? new Date(date) : date;
		const day = d.getDate().toString().padStart(2, "0");
		const month = (d.getMonth() + 1).toString().padStart(2, "0");
		const year = d.getFullYear();

		switch (this.preferences.dateFormat) {
			case "DD/MM/YYYY":
				return `${day}/${month}/${year}`;
			case "YYYY-MM-DD":
				return `${year}-${month}-${day}`;
			case "MM/DD/YYYY":
			default:
				return `${month}/${day}/${year}`;
		}
	}

	/**
	 * Format a number according to the current preference
	 */
	formatNumber(value: number): string {
		const options: Intl.NumberFormatOptions = {
			minimumFractionDigits: this.preferences.showCents ? 2 : 0,
			maximumFractionDigits: this.preferences.showCents ? 2 : 0,
		};
		return new Intl.NumberFormat(this.preferences.numberFormat, options).format(value);
	}

	/**
	 * Format a currency value according to the current preferences
	 */
	formatCurrency(value: number): string {
		const formatted = this.formatNumber(Math.abs(value));
		const sign = value < 0 ? "-" : "";
		return `${sign}${this.preferences.currencySymbol}${formatted}`;
	}

	/**
	 * Initialize from backend preferences (called when user logs in)
	 */
	initFromBackend(prefs: Partial<DisplayPreferencesData>) {
		this.preferences = { ...this.preferences, ...prefs };
		this.saveToStorage();
		// Apply border radius if provided
		if (prefs.borderRadius) {
			this.applyBorderRadius(prefs.borderRadius);
		}
	}

	private loadFromStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.preferences = { ...defaults, ...parsed };
			}
			// Apply border radius on load
			this.applyBorderRadius(this.preferences.borderRadius);
		} catch (error) {
			console.error("Failed to load display preferences:", error);
		}
	}

	private async loadFromBackend() {
		if (!browser || this.initialized) return;
		this.initialized = true;

		try {
			const backendPrefs = await loadPreferencesFromBackend();
			if (backendPrefs) {
				// Merge backend preferences with current (backend takes precedence)
				const displayPrefs: Partial<DisplayPreferencesData> = {};
				if (backendPrefs.dateFormat) displayPrefs.dateFormat = backendPrefs.dateFormat;
				if (backendPrefs.currencySymbol) displayPrefs.currencySymbol = backendPrefs.currencySymbol;
				if (backendPrefs.numberFormat) displayPrefs.numberFormat = backendPrefs.numberFormat;
				if (backendPrefs.showCents !== undefined) displayPrefs.showCents = backendPrefs.showCents;
				if (backendPrefs.tableDisplayMode) displayPrefs.tableDisplayMode = backendPrefs.tableDisplayMode;
				if (backendPrefs.borderRadius) displayPrefs.borderRadius = backendPrefs.borderRadius;
				if (backendPrefs.notificationMode) displayPrefs.notificationMode = backendPrefs.notificationMode;

				if (Object.keys(displayPrefs).length > 0) {
					this.preferences = { ...this.preferences, ...displayPrefs };
					this.saveToStorage();
					// Apply border radius if it was updated from backend
					if (displayPrefs.borderRadius) {
						this.applyBorderRadius(displayPrefs.borderRadius);
					}
				}
			}
		} catch (error) {
			// Silently fail - localStorage is the fallback
			console.debug("Failed to load display preferences from backend:", error);
		}
	}

	private saveToStorage() {
		if (!shouldPersistToLocalStorage()) return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
		} catch (error) {
			console.error("Failed to save display preferences:", error);
		}
	}

	private syncToBackend(prefs: Partial<DisplayPreferencesData>) {
		queuePreferencesSync(prefs);
	}
}

// Export singleton instance
export const displayPreferences = new DisplayPreferencesStore();
