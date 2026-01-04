<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Snippet } from 'svelte';
	import { scaleSequential } from 'd3-scale';
	import { interpolateGreens } from 'd3-scale-chromatic';
	import { extent } from 'd3';

	interface LayerCakeContext {
		data: Readable<any[]>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const { data, width, height } = getContext<LayerCakeContext>('LayerCake');

	interface CellData {
		date: Date;
		value: number | null;
	}

	interface Props {
		dateAccessor?: (d: any) => Date;
		valueAccessor?: (d: any) => number;
		colorScale?: (value: number) => string;
		cellSize?: number;
		cellGap?: number;
		cellRadius?: number;
		showMonthLabels?: boolean;
		showDayLabels?: boolean;
		emptyColor?: string;
		/** Show subtle background tint for weekend cells */
		highlightWeekends?: boolean;
		/** Show indicator ring around today's cell */
		showTodayIndicator?: boolean;
		/** Override start date (for showing full filter period) */
		startDate?: Date;
		/** Override end date (for showing full filter period) */
		endDate?: Date;
		/** Minimum cell size for readability (default 14) */
		minCellSize?: number;
		onhover?: (cell: CellData | null) => void;
		/** Click handler for drill-down support */
		onclick?: (cell: CellData) => void;
		tooltipContent?: Snippet<[{ date: Date; value: number | null; x: number; y: number }]>;
		class?: string;
	}

	let {
		dateAccessor = (d: any) => d.date,
		valueAccessor = (d: any) => d.value,
		colorScale,
		cellSize: fixedCellSize,
		cellGap = 2,
		cellRadius = 2,
		showMonthLabels = true,
		showDayLabels = true,
		emptyColor = 'var(--muted)',
		highlightWeekends = true,
		showTodayIndicator = true,
		startDate,
		endDate,
		minCellSize = 14,
		onhover,
		onclick,
		tooltipContent,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Helper to create a local date string (YYYY-MM-DD) from a Date
	const toLocalDateStr = (d: Date): string => {
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	};

	// Get today's date key for comparison (using local date)
	const todayKey = toLocalDateStr(new Date());

	const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

	// Build a map of date -> value (using local date strings)
	const dateValueMap = $derived.by(() => {
		const map = new Map<string, number>();
		for (const d of $data) {
			const date = dateAccessor(d);
			if (date instanceof Date) {
				const key = toLocalDateStr(date);
				map.set(key, valueAccessor(d));
			}
		}
		return map;
	});

	// Helper to create a local date (midnight) from a Date object
	const toLocalMidnight = (d: Date): Date => {
		return new Date(d.getFullYear(), d.getMonth(), d.getDate());
	};

	// Determine date range - use passed-in dates if provided, otherwise calculate from data
	const dateRange = $derived.by(() => {
		if (startDate && endDate) {
			return {
				start: toLocalMidnight(startDate),
				end: toLocalMidnight(endDate)
			};
		}

		const dates = $data.map(dateAccessor).filter((d) => d instanceof Date);
		if (dates.length === 0) return { start: new Date(), end: new Date() };

		const [minDate, maxDate] = extent(dates) as [Date, Date];
		return {
			start: toLocalMidnight(minDate),
			end: toLocalMidnight(maxDate)
		};
	});

	// Value extent for color scale
	const valueExtent = $derived.by(() => {
		const values = $data.map(valueAccessor).filter((v) => typeof v === 'number');
		if (values.length === 0) return [0, 1];
		const [min, max] = extent(values) as [number, number];
		return [min ?? 0, max ?? 1];
	});

	// Default color scale
	const defaultColorScale = $derived(scaleSequential(interpolateGreens).domain(valueExtent));

	const getColor = $derived((value: number) => {
		if (colorScale) return colorScale(value);
		return defaultColorScale(value);
	});

	// Calculate total weeks span
	const totalWeeks = $derived.by(() => {
		return (
			Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (7 * 24 * 60 * 60 * 1000)) +
			1
		);
	});

	// Layout constants
	const labelOffset = $derived(showDayLabels ? 35 : 0);
	const topOffset = $derived(showMonthLabels ? 20 : 0);
	const rowGap = 16; // Gap between calendar rows

	// Calculate how many weeks fit per row and cell size
	const layout = $derived.by(() => {
		const availableWidth = $width - labelOffset;

		// Calculate max weeks that fit at minimum cell size
		const maxWeeksAtMinSize = Math.floor(
			(availableWidth + cellGap) / (minCellSize + cellGap)
		);

		// How many rows do we need?
		const rowCount = Math.ceil(totalWeeks / maxWeeksAtMinSize);
		const weeksPerRow = Math.ceil(totalWeeks / rowCount);

		// Now calculate cell size to fill available space
		// Each row has weeksPerRow columns
		const cellSizeByWidth = (availableWidth - (weeksPerRow - 1) * cellGap) / weeksPerRow;

		// Calculate available height per row
		const totalRowHeight = 7 * minCellSize + 6 * cellGap + topOffset;
		const availableHeightPerRow = ($height - (rowCount - 1) * rowGap) / rowCount;
		const cellSizeByHeight = (availableHeightPerRow - topOffset - 6 * cellGap) / 7;

		// Use the smaller to ensure fit, but respect minimum
		let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight);
		if (fixedCellSize) cellSize = fixedCellSize;
		cellSize = Math.max(minCellSize, Math.floor(cellSize));

		// Actual row height with this cell size
		const rowHeight = topOffset + 7 * cellSize + 6 * cellGap;

		return {
			rowCount,
			weeksPerRow,
			cellSize,
			rowHeight
		};
	});

	// Generate calendar cells organized by rows
	const calendarRows = $derived.by(() => {
		const rows: Array<{
			rowIndex: number;
			yOffset: number;
			cells: Array<{
				x: number;
				y: number;
				date: Date;
				dateKey: string;
				value: number | null;
				color: string;
				isWeekend: boolean;
				isToday: boolean;
				globalIndex: number;
			}>;
			monthLabels: Array<{ x: number; label: string }>;
		}> = [];

		const { rowCount, weeksPerRow, cellSize, rowHeight } = layout;

		// Start from the first Sunday before or on the start date
		let currentDate = new Date(dateRange.start);
		currentDate.setDate(currentDate.getDate() - currentDate.getDay());

		let globalWeekIndex = 0;
		let globalCellIndex = 0;
		let globalLastMonth = -1; // Track month across rows to avoid duplicate labels

		for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
			const yOffset = rowIndex * (rowHeight + rowGap);
			const cells: typeof rows[0]['cells'] = [];
			const rowMonthLabels: Array<{ x: number; label: string }> = [];
			let weekInRow = 0;
			let lastLabelX = -100; // Track last label position to avoid overlap

			// Process weeks for this row
			while (weekInRow < weeksPerRow && currentDate <= dateRange.end) {
				// Process all 7 days of this week
				for (let dayOfWeek = currentDate.getDay(); dayOfWeek < 7; dayOfWeek++) {
					if (currentDate > dateRange.end) break;

					const dateKey = toLocalDateStr(currentDate);
					const value = dateValueMap.get(dateKey) ?? null;
					const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
					const isToday = dateKey === todayKey;

					// Month label at start of month (only if month changed globally)
					const month = currentDate.getMonth();
					const labelX = labelOffset + weekInRow * (cellSize + cellGap);
					// Only add label if month changed AND there's enough space from last label (min 40px)
					if (month !== globalLastMonth && currentDate >= dateRange.start && labelX - lastLabelX >= 40) {
						globalLastMonth = month;
						lastLabelX = labelX;
						rowMonthLabels.push({
							x: labelX,
							label: monthLabels[month]
						});
					} else if (month !== globalLastMonth && currentDate >= dateRange.start) {
						// Month changed but not enough space - still update globalLastMonth to prevent duplicate
						globalLastMonth = month;
					}

					cells.push({
						x: labelOffset + weekInRow * (cellSize + cellGap),
						y: topOffset + dayOfWeek * (cellSize + cellGap),
						date: new Date(currentDate),
						dateKey,
						value,
						color: value !== null ? getColor(value) : emptyColor,
						isWeekend,
						isToday,
						globalIndex: globalCellIndex++
					});

					currentDate.setDate(currentDate.getDate() + 1);
				}

				weekInRow++;
				globalWeekIndex++;
			}

			rows.push({
				rowIndex,
				yOffset,
				cells,
				monthLabels: rowMonthLabels
			});
		}

		return rows;
	});

	// Flatten cells for tooltip lookup
	const allCells = $derived(calendarRows.flatMap((row) => row.cells));
</script>

<g class="calendar-heatmap {className}">
	{#each calendarRows as row}
		<g transform="translate(0, {row.yOffset})">
			<!-- Day labels (only on first row) -->
			{#if showDayLabels && row.rowIndex === 0}
				{#each dayLabels as label, i}
					{#if i % 2 === 1}
						<text
							x={12}
							y={topOffset + i * (layout.cellSize + cellGap) + layout.cellSize / 2}
							font-size="11"
							fill="var(--muted-foreground)"
							dominant-baseline="middle"
						>
							{label}
						</text>
					{/if}
				{/each}
			{/if}

			<!-- Month labels for this row -->
			{#if showMonthLabels}
				{#each row.monthLabels as { x, label }}
					<text x={x} y={14} font-size="11" fill="var(--muted-foreground)">
						{label}
					</text>
				{/each}
			{/if}

			<!-- Cells for this row -->
			{#each row.cells as cell}
				{@const isHovered = hoveredIndex === cell.globalIndex}
				{@const hasValue = cell.value !== null}

				<!-- Weekend background highlight -->
				{#if highlightWeekends && cell.isWeekend}
					<rect
						x={cell.x - 1}
						y={cell.y - 1}
						width={layout.cellSize + 2}
						height={layout.cellSize + 2}
						fill="var(--muted-foreground)"
						fill-opacity={0.08}
						rx={cellRadius + 1}
					/>
				{/if}

				<!-- Main cell -->
				<!-- svelte-ignore a11y_no_static_element_interactions a11y_click_events_have_key_events -->
				<rect
					x={cell.x}
					y={cell.y}
					width={layout.cellSize}
					height={layout.cellSize}
					fill={cell.color}
					fill-opacity={hasValue ? (isHovered ? 1 : 0.9) : 0.25}
					rx={cellRadius}
					stroke={isHovered ? 'var(--foreground)' : 'none'}
					stroke-width={isHovered ? 1.5 : 0}
					class="calendar-cell"
					style="cursor: {hasValue || onclick ? 'pointer' : 'default'}; transition: fill-opacity 0.15s, stroke 0.15s;"
					onmouseenter={() => {
						hoveredIndex = cell.globalIndex;
						onhover?.({ date: cell.date, value: cell.value });
					}}
					onmouseleave={() => {
						hoveredIndex = null;
						onhover?.(null);
					}}
					onclick={() => {
						if (onclick) {
							onclick({ date: cell.date, value: cell.value });
						}
					}}
				/>

				<!-- Today indicator ring -->
				{#if showTodayIndicator && cell.isToday}
					<rect
						x={cell.x - 2}
						y={cell.y - 2}
						width={layout.cellSize + 4}
						height={layout.cellSize + 4}
						fill="none"
						stroke="var(--primary)"
						stroke-width={2}
						rx={cellRadius + 2}
						style="pointer-events: none;"
					/>
				{/if}
			{/each}
		</g>
	{/each}

	<!-- Tooltip -->
	{#if hoveredIndex !== null && tooltipContent}
		{@const cell = allCells[hoveredIndex]}
		{@const row = calendarRows.find((r) => r.cells.some((c) => c.globalIndex === hoveredIndex))}
		{@const tooltipX = Math.min(cell.x + layout.cellSize + 8, $width - 160)}
		{@const tooltipY = (row?.yOffset ?? 0) + Math.max(cell.y - 10, 0)}

		<foreignObject
			x={tooltipX}
			y={tooltipY}
			width="160"
			height="100"
			style="overflow: visible; pointer-events: none;"
		>
			<div style="pointer-events: none;">
				{@render tooltipContent({ date: cell.date, value: cell.value, x: cell.x, y: cell.y })}
			</div>
		</foreignObject>
	{/if}
</g>
