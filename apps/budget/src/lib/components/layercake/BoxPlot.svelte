<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { quantile } from '$lib/utils/chart-statistics';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xScale: Readable<any>;
		yRange: Readable<[number, number]>;
		height: Readable<number>;
	}

	const { data, xScale, yRange, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		/** Key to access the numeric value from data items */
		valueKey?: string;
		/** IQR multiplier for whisker calculation (default 1.5) */
		multiplier?: number;
		/** Box fill color */
		boxFill?: string;
		/** Box stroke color */
		boxStroke?: string;
		/** Box stroke width */
		boxStrokeWidth?: number;
		/** Whisker stroke color */
		whiskerStroke?: string;
		/** Whisker stroke width */
		whiskerStrokeWidth?: number;
		/** Median line color */
		medianStroke?: string;
		/** Outlier dot fill color - can be a string or function */
		outlierFill?: string | ((d: any) => string);
		/** Outlier dot radius */
		outlierRadius?: number;
		/** Box width as percentage of chart width */
		boxWidthPercent?: number;
		/** Box opacity */
		opacity?: number;
		/** Click callback for outlier dots */
		onOutlierClick?: (d: any, event: MouseEvent) => void;
		/** Hover callback for outlier dots */
		onOutlierHover?: (d: any | null) => void;
		class?: string;
	}

	let {
		valueKey = 'value',
		multiplier = 1.5,
		boxFill = 'var(--chart-1)',
		boxStroke = 'var(--chart-1)',
		boxStrokeWidth = 2,
		whiskerStroke = 'var(--muted-foreground)',
		whiskerStrokeWidth = 1,
		medianStroke = 'var(--background)',
		outlierFill = 'var(--destructive)',
		outlierRadius = 4,
		boxWidthPercent = 30,
		opacity = 0.3,
		onOutlierClick,
		onOutlierHover,
		class: className = ''
	}: Props = $props();

	let hoveredOutlierIndex = $state<number | null>(null);

	// Helper to get outlier fill color
	function getOutlierFill(d: any): string {
		if (typeof outlierFill === 'function') {
			return outlierFill(d);
		}
		return outlierFill;
	}

	// Calculate box plot statistics
	const stats = $derived.by(() => {
		if ($data.length === 0) return null;

		const values = $data.map((d) => (typeof d === 'number' ? d : d[valueKey])).sort((a, b) => a - b);

		const q1 = quantile(values, 0.25);
		const median = quantile(values, 0.5);
		const q3 = quantile(values, 0.75);
		const iqr = q3 - q1;

		const lowerFence = q1 - multiplier * iqr;
		const upperFence = q3 + multiplier * iqr;

		// Whiskers extend to the most extreme data point within the fence
		const whiskerLow = Math.max(values[0], lowerFence);
		const whiskerHigh = Math.min(values[values.length - 1], upperFence);

		// Outliers are points outside the fences
		const outliers = $data.filter((d) => {
			const val = typeof d === 'number' ? d : d[valueKey];
			return val < lowerFence || val > upperFence;
		});

		return {
			q1,
			median,
			q3,
			iqr,
			whiskerLow,
			whiskerHigh,
			lowerFence,
			upperFence,
			outliers,
			min: values[0],
			max: values[values.length - 1]
		};
	});

	// Calculate pixel positions
	const layout = $derived.by(() => {
		if (!stats || !$xScale) return null;

		const centerY = $height / 2;
		const boxWidth = ($height * boxWidthPercent) / 100;
		const halfBox = boxWidth / 2;

		return {
			// Box coordinates
			boxX: $xScale(stats.q1),
			boxWidth: $xScale(stats.q3) - $xScale(stats.q1),
			boxY: centerY - halfBox,
			boxHeight: boxWidth,

			// Median line
			medianX: $xScale(stats.median),

			// Whiskers
			whiskerLowX: $xScale(stats.whiskerLow),
			whiskerHighX: $xScale(stats.whiskerHigh),
			whiskerY: centerY,

			// Center for outlier positioning
			centerY,
			halfBox,

			// Outlier positions (with slight jitter to avoid overlap)
			outlierPositions: stats.outliers.map((d, i) => {
				const val = typeof d === 'number' ? d : d[valueKey];
				// Add slight vertical jitter for overlapping outliers
				const jitter = (i % 3 - 1) * (outlierRadius * 0.8);
				return {
					x: $xScale(val),
					y: centerY + jitter,
					data: d
				};
			})
		};
	});
</script>

{#if layout && stats}
	<g class="box-plot {className}">
		<!-- Lower whisker line -->
		<line
			x1={layout.whiskerLowX}
			x2={layout.boxX}
			y1={layout.whiskerY}
			y2={layout.whiskerY}
			stroke={whiskerStroke}
			stroke-width={whiskerStrokeWidth}
		/>

		<!-- Lower whisker cap -->
		<line
			x1={layout.whiskerLowX}
			x2={layout.whiskerLowX}
			y1={layout.whiskerY - layout.halfBox * 0.5}
			y2={layout.whiskerY + layout.halfBox * 0.5}
			stroke={whiskerStroke}
			stroke-width={whiskerStrokeWidth}
		/>

		<!-- Upper whisker line -->
		<line
			x1={layout.boxX + layout.boxWidth}
			x2={layout.whiskerHighX}
			y1={layout.whiskerY}
			y2={layout.whiskerY}
			stroke={whiskerStroke}
			stroke-width={whiskerStrokeWidth}
		/>

		<!-- Upper whisker cap -->
		<line
			x1={layout.whiskerHighX}
			x2={layout.whiskerHighX}
			y1={layout.whiskerY - layout.halfBox * 0.5}
			y2={layout.whiskerY + layout.halfBox * 0.5}
			stroke={whiskerStroke}
			stroke-width={whiskerStrokeWidth}
		/>

		<!-- Box (IQR) -->
		<rect
			x={layout.boxX}
			y={layout.boxY}
			width={layout.boxWidth}
			height={layout.boxHeight}
			fill={boxFill}
			{opacity}
			stroke={boxStroke}
			stroke-width={boxStrokeWidth}
			rx={2}
		/>

		<!-- Median line -->
		<line
			x1={layout.medianX}
			x2={layout.medianX}
			y1={layout.boxY}
			y2={layout.boxY + layout.boxHeight}
			stroke={medianStroke}
			stroke-width={boxStrokeWidth + 1}
		/>

		<!-- Outlier dots -->
		{#each layout.outlierPositions as outlier, i}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle
				cx={outlier.x}
				cy={outlier.y}
				r={hoveredOutlierIndex === i ? outlierRadius + 2 : outlierRadius}
				fill={getOutlierFill(outlier.data)}
				opacity={hoveredOutlierIndex === i ? 1 : 0.8}
				style={onOutlierClick ? 'cursor: pointer;' : ''}
				onclick={(e) => onOutlierClick?.(outlier.data, e)}
				onmouseenter={() => {
					hoveredOutlierIndex = i;
					onOutlierHover?.(outlier.data);
				}}
				onmouseleave={() => {
					hoveredOutlierIndex = null;
					onOutlierHover?.(null);
				}}
			/>
		{/each}
	</g>
{/if}
