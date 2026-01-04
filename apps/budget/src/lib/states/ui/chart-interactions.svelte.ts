/**
 * Shared state for chart interactions across analytics dashboard
 * Enables drill-down, brush selection, and legend toggle/highlighting
 */

export type DrillDownFilterType =
	| 'category'
	| 'payee'
	| 'date'
	| 'month'
	| 'amount-range'
	| 'category-month'
	| 'new-payees-month'
	| 'weekday'
	| 'payee-month';

export interface DrillDownFilter {
	type: DrillDownFilterType;
	value:
		| string
		| number
		| { start: Date; end: Date }
		| { min: number; max: number }
		| { category: string; month: string }
		| { month: string; payees: string[] }
		| { payee: string; month: string };
	label: string;
	/** Optional: Additional context for the filter */
	context?: Record<string, unknown>;
}

export class ChartInteractionState {
	// Drill-down state
	drillDownOpen = $state(false);
	drillDownFilter = $state<DrillDownFilter | null>(null);

	// Brush selection state for time-series filtering
	dateRange = $state<{ start: Date; end: Date } | null>(null);

	// Legend/highlight state
	hiddenSeries = $state<Set<string>>(new Set());
	highlightedItem = $state<string | null>(null);

	// Helper methods
	openDrillDown(filter: DrillDownFilter) {
		this.drillDownFilter = filter;
		this.drillDownOpen = true;
	}

	closeDrillDown() {
		this.drillDownOpen = false;
		// Delay clearing filter to allow close animation
		setTimeout(() => {
			this.drillDownFilter = null;
		}, 200);
	}

	setDateRange(start: Date, end: Date) {
		this.dateRange = { start, end };
	}

	clearDateRange() {
		this.dateRange = null;
	}

	toggleSeries(key: string) {
		const hidden = new Set(this.hiddenSeries);
		if (hidden.has(key)) {
			hidden.delete(key);
		} else {
			hidden.add(key);
		}
		this.hiddenSeries = hidden;
	}

	showAllSeries() {
		this.hiddenSeries = new Set();
	}

	isSeriesHidden(key: string): boolean {
		return this.hiddenSeries.has(key);
	}

	setHighlight(item: string | null) {
		this.highlightedItem = item;
	}

	isHighlighted(item: string): boolean {
		return this.highlightedItem === item;
	}

	/** Get opacity for a series based on highlight state */
	getSeriesOpacity(key: string, baseOpacity = 0.8): number {
		if (this.highlightedItem === null) return baseOpacity;
		return this.highlightedItem === key ? 1 : 0.3;
	}

	/** Reset all interaction state */
	reset() {
		this.drillDownOpen = false;
		this.drillDownFilter = null;
		this.dateRange = null;
		this.hiddenSeries = new Set();
		this.highlightedItem = null;
	}
}

// Global singleton instance
export const chartInteractions = new ChartInteractionState();
