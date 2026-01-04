/**
 * Time Period Filter State
 *
 * Manages global and per-chart time period filtering for analytics charts.
 * Supports preset periods (e.g., "Last 30 days") and custom date ranges.
 */

import { SvelteMap } from 'svelte/reactivity';

export type TimePeriodPreset =
	| 'last-7-days'
	| 'last-14-days'
	| 'last-30-days'
	| 'last-60-days'
	| 'last-90-days'
	| 'last-3-months'
	| 'last-6-months'
	| 'last-12-months'
	| 'ytd'
	| 'last-year'
	| 'all-time'
	| 'custom';

export interface TimePeriod {
	preset: TimePeriodPreset;
	/** Start date - null for 'all-time', computed for presets, user-set for 'custom' */
	start: Date | null;
	/** End date - null for 'all-time', computed for presets, user-set for 'custom' */
	end: Date | null;
}

/**
 * Calculate date range from a preset
 * Uses UTC dates to match the chart data which is stored in UTC
 */
function calculateDateRange(preset: TimePeriodPreset): { start: Date; end: Date } | null {
	if (preset === 'all-time') return null;

	const now = new Date();
	const currentYear = now.getUTCFullYear();
	const currentMonth = now.getUTCMonth();
	const currentDate = now.getUTCDate();

	// End of today in UTC
	const todayEnd = new Date(Date.UTC(currentYear, currentMonth, currentDate, 23, 59, 59, 999));
	let start: Date;

	switch (preset) {
		case 'last-7-days':
			start = new Date(todayEnd);
			start.setUTCDate(start.getUTCDate() - 6);
			break;
		case 'last-14-days':
			start = new Date(todayEnd);
			start.setUTCDate(start.getUTCDate() - 13);
			break;
		case 'last-30-days':
			start = new Date(todayEnd);
			start.setUTCDate(start.getUTCDate() - 29);
			break;
		case 'last-60-days':
			start = new Date(todayEnd);
			start.setUTCDate(start.getUTCDate() - 59);
			break;
		case 'last-90-days':
			start = new Date(todayEnd);
			start.setUTCDate(start.getUTCDate() - 89);
			break;
		case 'last-3-months':
			// Current month + 2 previous = 3 months total
			// Use first of month to avoid day overflow issues
			start = new Date(Date.UTC(currentYear, currentMonth - 2, 1, 0, 0, 0, 0));
			break;
		case 'last-6-months':
			// Current month + 5 previous = 6 months total
			start = new Date(Date.UTC(currentYear, currentMonth - 5, 1, 0, 0, 0, 0));
			break;
		case 'last-12-months':
			// Current month + 11 previous = 12 months total
			start = new Date(Date.UTC(currentYear, currentMonth - 11, 1, 0, 0, 0, 0));
			break;
		case 'ytd':
			start = new Date(Date.UTC(currentYear, 0, 1, 0, 0, 0, 0));
			break;
		case 'last-year':
			start = new Date(Date.UTC(currentYear - 1, 0, 1, 0, 0, 0, 0));
			return {
				start,
				end: new Date(Date.UTC(currentYear - 1, 11, 31, 23, 59, 59, 999))
			};
		case 'custom':
			// Custom ranges use the stored start/end dates
			return null;
		default:
			return null;
	}

	// Set start time to beginning of day (UTC) for day-based presets
	if (preset.includes('days')) {
		start.setUTCHours(0, 0, 0, 0);
	}

	return { start, end: todayEnd };
}

/**
 * Time Period Filter State Class
 *
 * Singleton state manager for chart time period filtering.
 */
/** Default preset for time period filtering */
const DEFAULT_PRESET: TimePeriodPreset = 'last-6-months';

export class TimePeriodFilterState {
	/** Global filter applied to all charts */
	globalPeriod = $state<TimePeriod>(this.createPeriod(DEFAULT_PRESET));

	/** Helper to create a TimePeriod from a preset */
	private createPeriod(preset: TimePeriodPreset): TimePeriod {
		const range = calculateDateRange(preset);
		return {
			preset,
			start: range?.start ?? null,
			end: range?.end ?? null
		};
	}

	/** Per-chart overrides (chartId -> period) - uses SvelteMap for granular reactivity */
	chartOverrides = new SvelteMap<string, TimePeriod>();

	/**
	 * Set global filter to a preset period
	 */
	setGlobalPreset(preset: TimePeriodPreset) {
		const range = calculateDateRange(preset);
		this.globalPeriod = {
			preset,
			start: range?.start ?? null,
			end: range?.end ?? null
		};
	}

	/**
	 * Set global filter to a custom date range
	 */
	setGlobalCustomRange(start: Date, end: Date) {
		this.globalPeriod = {
			preset: 'custom',
			start,
			end
		};
	}

	/**
	 * Clear global filter (reset to default preset)
	 */
	clearGlobalFilter() {
		this.globalPeriod = this.createPeriod(DEFAULT_PRESET);
	}

	/**
	 * Set a per-chart override
	 */
	setChartOverride(chartId: string, preset: TimePeriodPreset) {
		const range = calculateDateRange(preset);
		const period: TimePeriod = {
			preset,
			start: range?.start ?? null,
			end: range?.end ?? null
		};
		this.chartOverrides.set(chartId, period);
	}

	/**
	 * Set a per-chart custom range override
	 */
	setChartCustomRange(chartId: string, start: Date, end: Date) {
		const period: TimePeriod = {
			preset: 'custom',
			start,
			end
		};
		this.chartOverrides.set(chartId, period);
	}

	/**
	 * Clear a per-chart override (use global filter)
	 */
	clearChartOverride(chartId: string) {
		this.chartOverrides.delete(chartId);
	}

	/**
	 * Check if a chart has an override
	 */
	hasChartOverride(chartId: string): boolean {
		return this.chartOverrides.has(chartId);
	}

	/**
	 * Get effective period for a chart (override or global)
	 */
	getEffectivePeriod(chartId: string): TimePeriod {
		return this.chartOverrides.get(chartId) ?? this.globalPeriod;
	}

	/**
	 * Get actual date range from a period
	 * Returns null for 'all-time' (no filtering)
	 * Always recalculates for presets to ensure fresh dates
	 */
	getDateRange(period: TimePeriod): { start: Date; end: Date } | null {
		if (period.preset === 'all-time') return null;

		// For custom ranges, use the stored dates
		if (period.preset === 'custom' && period.start && period.end) {
			return { start: period.start, end: period.end };
		}

		// Always recalculate for presets to ensure current dates
		return calculateDateRange(period.preset);
	}

	/**
	 * Reset all state
	 */
	reset() {
		this.globalPeriod = this.createPeriod(DEFAULT_PRESET);
		this.chartOverrides.clear();
	}
}

// Global singleton instance
export const timePeriodFilter = new TimePeriodFilterState();
