<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { bin, extent } from 'd3-array';

	interface LayerCakeContext {
		data: Readable<any[]>;
		x: Readable<string | ((d: any) => number)>;
		xScale: Readable<any>;
		yScale: Readable<any>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
	}

	const { data, x, xScale, yScale, yRange, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		bins?: number;
		fill?: string;
		opacity?: number;
		hoverOpacity?: number;
		radius?: number;
		gap?: number;
		valueAccessor?: (d: any) => number;
		onclick?: (bin: { x0: number; x1: number; count: number }) => void;
		onhover?: (bin: { x0: number; x1: number; count: number } | null) => void;
		class?: string;
	}

	let {
		bins: binCount = 10,
		fill = 'var(--primary)',
		opacity = 0.8,
		hoverOpacity = 1,
		radius = 2,
		gap = 1,
		valueAccessor,
		onclick,
		onhover,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Get value from data point
	const getValue = $derived.by(() => {
		if (valueAccessor) return valueAccessor;
		if (typeof $x === 'function') return $x;
		if (typeof $x === 'string') return (d: any) => d[$x];
		return (d: any) => d;
	});

	// Calculate histogram bins
	const histogramBins = $derived.by(() => {
		if ($data.length === 0) return [];

		const values = $data.map(getValue);
		const [minVal, maxVal] = extent(values) as [number, number];

		if (minVal === undefined || maxVal === undefined) return [];

		const histogram = bin<number, number>()
			.domain([minVal, maxVal])
			.thresholds(binCount);

		return histogram(values);
	});

	// Calculate bar layout
	const barLayout = $derived.by(() => {
		if (histogramBins.length === 0 || !$xScale) {
			return [];
		}

		const maxCount = Math.max(...histogramBins.map((b) => b.length));

		return histogramBins.map((binData) => {
			const x0 = binData.x0 ?? 0;
			const x1 = binData.x1 ?? 0;

			const xStart = $xScale(x0);
			const xEnd = $xScale(x1);
			const barWidth = Math.max(0, xEnd - xStart - gap);

			// Scale height by count
			const heightRatio = binData.length / maxCount;
			const maxHeight = $yRange[0];
			const barHeight = heightRatio * maxHeight * 0.9; // 90% of available height

			return {
				x: xStart + gap / 2,
				y: $yRange[0] - barHeight,
				width: barWidth,
				height: barHeight,
				count: binData.length,
				x0,
				x1
			};
		});
	});
</script>

{#each barLayout as bar, i}
	{@const isHovered = hoveredIndex === i}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<rect
		x={bar.x}
		y={bar.y}
		width={bar.width}
		height={bar.height}
		{fill}
		opacity={isHovered ? hoverOpacity : opacity}
		rx={radius}
		class={className}
		style={onclick ? 'cursor: pointer;' : ''}
		onclick={() => onclick?.({ x0: bar.x0, x1: bar.x1, count: bar.count })}
		onmouseenter={() => {
			hoveredIndex = i;
			onhover?.({ x0: bar.x0, x1: bar.x1, count: bar.count });
		}}
		onmouseleave={() => {
			hoveredIndex = null;
			onhover?.(null);
		}}
	/>
{/each}
