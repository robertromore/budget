/**
 * State management for chart data point selection
 * Enables users to select multiple data points and perform actions on them
 */

export type ChartSelectionAction =
	| 'compare'
	| 'average'
	| 'trend'
	| 'outliers'
	| 'seasonal'
	| 'set-budget'
	| 'create-alert'
	| 'add-note'
	| 'flag-review'
	| 'export-csv'
	| 'export-report'
	| 'drill-down';

export interface SelectedDataPoint {
	/** Unique identifier for the point (e.g., "2024-01") */
	id: string;
	/** Display label (e.g., "January 2024") */
	label: string;
	/** The date of this data point */
	date: Date;
	/** Primary value (usually spending amount) */
	value: number;
	/** Optional category context */
	categoryId?: string;
	categoryName?: string;
	/** Optional account context */
	accountId?: number;
	accountSlug?: string;
	/** Raw data for additional processing */
	rawData?: Record<string, unknown>;
}

export class ChartSelectionState {
	// Selection state
	selectedPoints = $state<SelectedDataPoint[]>([]);

	// Maximum selection limit to prevent performance issues
	readonly maxSelection = 24;

	// Derived states
	get count(): number {
		return this.selectedPoints.length;
	}

	get isActive(): boolean {
		return this.selectedPoints.length > 0;
	}

	get canSelectMore(): boolean {
		return this.selectedPoints.length < this.maxSelection;
	}

	// Current action sheet state
	activeAction = $state<ChartSelectionAction | null>(null);

	// Selection methods
	toggle(point: SelectedDataPoint): boolean {
		const index = this.selectedPoints.findIndex((p) => p.id === point.id);

		if (index >= 0) {
			// Remove if already selected
			this.selectedPoints = this.selectedPoints.filter((_, i) => i !== index);
			return false;
		} else if (this.canSelectMore) {
			// Add if not at limit
			this.selectedPoints = [...this.selectedPoints, point];
			return true;
		}

		return false;
	}

	select(point: SelectedDataPoint): boolean {
		if (this.isSelected(point.id)) return false;
		if (!this.canSelectMore) return false;

		this.selectedPoints = [...this.selectedPoints, point];
		return true;
	}

	deselect(pointId: string): boolean {
		const index = this.selectedPoints.findIndex((p) => p.id === pointId);
		if (index < 0) return false;

		this.selectedPoints = this.selectedPoints.filter((_, i) => i !== index);
		return true;
	}

	isSelected(pointId: string): boolean {
		return this.selectedPoints.some((p) => p.id === pointId);
	}

	clear(): void {
		this.selectedPoints = [];
		this.activeAction = null;
	}

	selectRange(points: SelectedDataPoint[]): void {
		const limited = points.slice(0, this.maxSelection);
		this.selectedPoints = [...limited];
	}

	selectAll(points: SelectedDataPoint[]): void {
		this.selectRange(points);
	}

	// Action methods
	openAction(action: ChartSelectionAction): void {
		if (this.count === 0) return;
		this.activeAction = action;
	}

	closeAction(): void {
		this.activeAction = null;
	}

	// Statistics helpers
	get totalValue(): number {
		return this.selectedPoints.reduce((sum, p) => sum + p.value, 0);
	}

	get averageValue(): number {
		if (this.count === 0) return 0;
		return this.totalValue / this.count;
	}

	get minValue(): number {
		if (this.count === 0) return 0;
		return Math.min(...this.selectedPoints.map((p) => p.value));
	}

	get maxValue(): number {
		if (this.count === 0) return 0;
		return Math.max(...this.selectedPoints.map((p) => p.value));
	}

	get medianValue(): number {
		if (this.count === 0) return 0;
		const sorted = [...this.selectedPoints].sort((a, b) => a.value - b.value);
		const mid = Math.floor(sorted.length / 2);
		if (sorted.length % 2 === 0) {
			return (sorted[mid - 1].value + sorted[mid].value) / 2;
		}
		return sorted[mid].value;
	}

	get standardDeviation(): number {
		if (this.count < 2) return 0;
		const mean = this.averageValue;
		const squaredDiffs = this.selectedPoints.map((p) => Math.pow(p.value - mean, 2));
		const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / this.count;
		return Math.sqrt(variance);
	}

	/** Points more than 2 standard deviations from mean */
	get outliers(): SelectedDataPoint[] {
		if (this.count < 3) return [];
		const mean = this.averageValue;
		const stdDev = this.standardDeviation;
		const threshold = 2 * stdDev;

		return this.selectedPoints.filter((p) => Math.abs(p.value - mean) > threshold);
	}

	/** Get points sorted by date */
	get sortedByDate(): SelectedDataPoint[] {
		return [...this.selectedPoints].sort((a, b) => a.date.getTime() - b.date.getTime());
	}

	/** Get points sorted by value */
	get sortedByValue(): SelectedDataPoint[] {
		return [...this.selectedPoints].sort((a, b) => b.value - a.value);
	}

	/** Export selection as CSV string */
	toCSV(): string {
		if (this.count === 0) return '';

		const headers = ['Date', 'Label', 'Value'];
		const rows = this.sortedByDate.map((p) => [
			p.date.toISOString().split('T')[0],
			`"${p.label}"`,
			p.value.toFixed(2)
		]);

		return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
	}

	/** Reset all state */
	reset(): void {
		this.selectedPoints = [];
		this.activeAction = null;
	}
}

// Global singleton instance
export const chartSelection = new ChartSelectionState();
