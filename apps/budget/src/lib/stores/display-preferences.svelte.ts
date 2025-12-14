import { browser } from "$app/environment";

const STORAGE_KEY = "display-preferences";

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
export type NumberFormat = "en-US" | "de-DE" | "fr-FR";
export type TableDisplayMode = "popover" | "sheet";

interface DisplayPreferencesData {
	dateFormat: DateFormat;
	currencySymbol: string;
	numberFormat: NumberFormat;
	showCents: boolean;
	tableDisplayMode: TableDisplayMode;
}

const defaults: DisplayPreferencesData = {
	dateFormat: "MM/DD/YYYY",
	currencySymbol: "$",
	numberFormat: "en-US",
	showCents: true,
	tableDisplayMode: "popover",
};

/**
 * Display preferences store using Svelte 5 runes
 * Manages display-related settings like date format, currency, and number formatting
 *
 * TODO: Integrate with user preferences API when multi-user support is added
 */
class DisplayPreferencesStore {
	private preferences = $state<DisplayPreferencesData>({ ...defaults });

	constructor() {
		if (browser) {
			this.loadFromStorage();
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

	setDateFormat(format: DateFormat) {
		this.preferences.dateFormat = format;
		this.saveToStorage();
	}

	setCurrencySymbol(symbol: string) {
		this.preferences.currencySymbol = symbol;
		this.saveToStorage();
	}

	setNumberFormat(format: NumberFormat) {
		this.preferences.numberFormat = format;
		this.saveToStorage();
	}

	setShowCents(show: boolean) {
		this.preferences.showCents = show;
		this.saveToStorage();
	}

	setTableDisplayMode(mode: TableDisplayMode) {
		this.preferences.tableDisplayMode = mode;
		this.saveToStorage();
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

	private loadFromStorage() {
		if (!browser) return;

		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				const parsed = JSON.parse(stored);
				this.preferences = { ...defaults, ...parsed };
			}
		} catch (error) {
			console.error("Failed to load display preferences:", error);
		}
	}

	private saveToStorage() {
		if (!browser) return;

		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences));
		} catch (error) {
			console.error("Failed to save display preferences:", error);
		}
	}
}

// Export singleton instance
export const displayPreferences = new DisplayPreferencesStore();
