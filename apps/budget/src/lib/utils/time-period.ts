/**
 * Time Period Utilities
 *
 * Formatting and preset options for time period filtering.
 */

import type { TimePeriod, TimePeriodPreset } from '$lib/states/ui/time-period-filter.svelte';

export type PeriodPresetGroup = 'days' | 'months' | 'year' | 'other';

export interface PeriodPresetOption {
	value: TimePeriodPreset;
	label: string;
	group: PeriodPresetGroup;
}

/**
 * Get all preset options grouped for UI
 */
export function getPeriodPresetOptions(): PeriodPresetOption[] {
	return [
		// Days
		{ value: 'last-7-days', label: 'Last 7 days', group: 'days' },
		{ value: 'last-14-days', label: 'Last 14 days', group: 'days' },
		{ value: 'last-30-days', label: 'Last 30 days', group: 'days' },
		{ value: 'last-60-days', label: 'Last 60 days', group: 'days' },
		{ value: 'last-90-days', label: 'Last 90 days', group: 'days' },
		// Months
		{ value: 'last-3-months', label: 'Last 3 months', group: 'months' },
		{ value: 'last-6-months', label: 'Last 6 months', group: 'months' },
		{ value: 'last-12-months', label: 'Last 12 months', group: 'months' },
		// Year
		{ value: 'ytd', label: 'Year to date', group: 'year' },
		{ value: 'last-year', label: 'Last year', group: 'year' },
		// Other
		{ value: 'all-time', label: 'All time', group: 'other' }
	];
}

/**
 * Get preset options grouped by category
 * @param allowedGroups - Optional filter to only include specific groups
 */
export function getGroupedPresetOptions(
	allowedGroups?: PeriodPresetGroup[]
): Record<string, PeriodPresetOption[]> {
	const options = getPeriodPresetOptions();
	const groups: Record<string, PeriodPresetOption[]> = {};

	if (!allowedGroups || allowedGroups.includes('days')) {
		const dayOptions = options.filter((o) => o.group === 'days');
		if (dayOptions.length) groups['Days'] = dayOptions;
	}
	if (!allowedGroups || allowedGroups.includes('months')) {
		const monthOptions = options.filter((o) => o.group === 'months');
		if (monthOptions.length) groups['Months'] = monthOptions;
	}
	if (!allowedGroups || allowedGroups.includes('year')) {
		const yearOptions = options.filter((o) => o.group === 'year');
		if (yearOptions.length) groups['Year'] = yearOptions;
	}
	if (!allowedGroups || allowedGroups.includes('other')) {
		const otherOptions = options.filter((o) => o.group === 'other');
		if (otherOptions.length) groups['Other'] = otherOptions;
	}

	return groups;
}

/**
 * Get label for a preset
 */
export function getPresetLabel(preset: TimePeriodPreset): string {
	if (preset === 'custom') return 'Custom range';

	const option = getPeriodPresetOptions().find((o) => o.value === preset);
	return option?.label ?? preset;
}

/**
 * Format a date for display
 */
function formatDate(date: Date, includeYear = true): string {
	const options: Intl.DateTimeFormatOptions = {
		month: 'short',
		day: 'numeric'
	};
	if (includeYear) {
		options.year = 'numeric';
	}
	return date.toLocaleDateString('en-US', options);
}

/**
 * Format period for display
 *
 * Examples:
 * - "All time"
 * - "Last 30 days"
 * - "Jan 1 - Mar 15, 2024"
 * - "Dec 15, 2023 - Jan 15, 2024"
 */
export function formatPeriodLabel(period: TimePeriod): string {
	// Use preset label for non-custom presets
	if (period.preset !== 'custom') {
		return getPresetLabel(period.preset);
	}

	// Format custom range
	if (!period.start || !period.end) {
		return 'Custom range';
	}

	const sameYear = period.start.getFullYear() === period.end.getFullYear();

	if (sameYear) {
		// "Jan 1 - Mar 15, 2024"
		return `${formatDate(period.start, false)} - ${formatDate(period.end, true)}`;
	} else {
		// "Dec 15, 2023 - Jan 15, 2024"
		return `${formatDate(period.start, true)} - ${formatDate(period.end, true)}`;
	}
}

/**
 * Format period as a short label (for badges)
 */
export function formatPeriodShortLabel(period: TimePeriod): string {
	if (period.preset === 'all-time') return 'All';
	if (period.preset === 'custom' && period.start && period.end) {
		const days = Math.ceil(
			(period.end.getTime() - period.start.getTime()) / (1000 * 60 * 60 * 24)
		);
		return `${days}d`;
	}
	return getPresetLabel(period.preset);
}

/**
 * Check if period represents "all time" (no filtering)
 */
export function isAllTime(period: TimePeriod): boolean {
	return period.preset === 'all-time';
}

/**
 * Check if two periods are equal
 */
export function periodsEqual(a: TimePeriod, b: TimePeriod): boolean {
	if (a.preset !== b.preset) return false;
	if (a.preset === 'custom') {
		return a.start?.getTime() === b.start?.getTime() && a.end?.getTime() === b.end?.getTime();
	}
	return true;
}
