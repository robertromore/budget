// Types for chart components

/** Standard data point shape for time series charts */
export interface TimeSeriesDataPoint {
	date: Date;
	value: number;
	month: string; // "YYYY-MM"
	monthLabel: string;
	index: number;
	[key: string]: unknown;
}

/** Threshold line configuration */
export interface ThresholdLine {
	value: number;
	label?: string;
	color?: string;
	strokeWidth?: number;
	strokeDasharray?: string;
}

/** Overlay data passed to tooltip */
export interface OverlayData {
	trendValue: number | null;
	historicalAvg: number | null;
	movingAvg: number | null;
	yoyData: { prevYearValue: number; yoyChange: number } | null;
}
