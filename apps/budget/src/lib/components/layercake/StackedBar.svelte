<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { stack, type Series } from 'd3-shape';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yScale: Readable<any>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
	}

	const { data, xGet, yScale, yRange, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		keys: string[];
		colors?: string[];
		opacity?: number;
		hoverOpacity?: number;
		radius?: number;
		gap?: number;
		/** Hover callback - receives the data item, series key, and segment index */
		onhover?: (info: { item: any; key: string; segmentIndex: number; seriesIndex: number } | null) => void;
		/** Click callback */
		onclick?: (info: { item: any; key: string; segmentIndex: number; seriesIndex: number }, event: MouseEvent) => void;
		/** Function to check if a bar stack is selected */
		isSelected?: (d: any) => boolean;
		/** Opacity for unselected bars when selection is active */
		unselectedOpacity?: number;
		/** Stroke color for selected bars */
		selectedStroke?: string;
		/** External hover segment index - when Brush is on top, use this to show hover state */
		externalHoveredIndex?: number | null;
		class?: string;
	}

	let {
		keys,
		colors = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
		opacity = 0.9,
		hoverOpacity = 1,
		radius = 4,
		gap = 4,
		onhover,
		onclick,
		isSelected,
		unselectedOpacity = 0.4,
		selectedStroke = 'var(--foreground)',
		externalHoveredIndex = null,
		class: className = ''
	}: Props = $props();

	let hoveredBar = $state<{ seriesIndex: number; segmentIndex: number } | null>(null);

	// Check if any bar stack is selected (to know when to dim non-selected bars)
	const hasSelection = $derived.by(() => {
		if (!isSelected) return false;
		return $data.some((d) => isSelected(d));
	});

	// Sort data by x position for consistent rendering
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $xGet(a) - $xGet(b));
	});

	// Calculate stacked data using D3 stack
	const stackedData = $derived.by(() => {
		if (sortedData.length === 0 || keys.length === 0) return [];

		// Ensure all keys have numeric values (default to 0)
		const normalizedData = sortedData.map((d) => {
			const normalized: Record<string, any> = { ...d };
			for (const key of keys) {
				normalized[key] = typeof d[key] === 'number' ? d[key] : 0;
			}
			return normalized;
		});

		const stackGenerator = stack<any>().keys(keys);
		return stackGenerator(normalizedData);
	});

	// Calculate bar width and x positions
	const barLayout = $derived.by(() => {
		const dataLength = sortedData.length;
		if (dataLength === 0) {
			return { width: 0, positions: new Map() };
		}

		if (dataLength === 1) {
			const barW = Math.min(40, $width * 0.3);
			return {
				width: barW,
				positions: new Map([[0, ($width - barW) / 2]])
			};
		}

		const slotWidth = $width / dataLength;
		const barW = Math.max(8, slotWidth - gap);

		const positions = new Map<number, number>();
		for (let i = 0; i < dataLength; i++) {
			const slotStart = i * slotWidth;
			const barX = slotStart + (slotWidth - barW) / 2;
			positions.set(i, barX);
		}

		return { width: barW, positions };
	});

	// Convert y value to pixel position
	function yToPixel(value: number): number {
		if ($yScale) {
			return $yScale(value);
		}
		return $yRange[0] - value;
	}

	// Generate path for rect with only top corners rounded
	function topRoundedRect(x: number, y: number, w: number, h: number, r: number): string {
		const effectiveR = Math.min(r, h / 2, w / 2);
		return `
			M ${x} ${y + h}
			L ${x} ${y + effectiveR}
			Q ${x} ${y} ${x + effectiveR} ${y}
			L ${x + w - effectiveR} ${y}
			Q ${x + w} ${y} ${x + w} ${y + effectiveR}
			L ${x + w} ${y + h}
			Z
		`;
	}
</script>

{#each stackedData as series, seriesIndex}
	{@const color = colors[seriesIndex % colors.length]}
	{@const key = keys[seriesIndex]}
	{#each series as segment, segmentIndex}
		{@const x = barLayout.positions.get(segmentIndex) ?? 0}
		{@const y0 = yToPixel(segment[0])}
		{@const y1 = yToPixel(segment[1])}
		{@const height = Math.abs(y0 - y1)}
		{@const y = Math.min(y0, y1)}
		{@const isTop = seriesIndex === stackedData.length - 1}
		{@const isStackHovered = hoveredBar?.segmentIndex === segmentIndex || externalHoveredIndex === segmentIndex}
		{@const item = sortedData[segmentIndex]}
		{@const stackIsSelected = isSelected?.(item) ?? false}
		{@const effectiveOpacity = isStackHovered ? hoverOpacity : (hasSelection && !stackIsSelected ? unselectedOpacity : opacity)}
		{#if !isNaN(y) && !isNaN(height) && height > 0}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			{#if isTop && radius > 0}
				<!-- Top segment uses path for top-only rounded corners -->
				<path
					d={topRoundedRect(x, y, barLayout.width, height, radius)}
					fill={color}
					opacity={effectiveOpacity}
					stroke={stackIsSelected ? selectedStroke : 'none'}
					stroke-width={stackIsSelected ? 2 : 0}
					class={className}
					style={onclick || onhover ? 'cursor: pointer;' : ''}
					onclick={(e) => onclick?.({ item, key, segmentIndex, seriesIndex }, e)}
					onmouseenter={() => {
						hoveredBar = { seriesIndex, segmentIndex };
						onhover?.({ item, key, segmentIndex, seriesIndex });
					}}
					onmouseleave={() => {
						hoveredBar = null;
						onhover?.(null);
					}}
				/>
			{:else}
				<!-- Non-top segments use rect with no radius -->
				<rect
					{x}
					{y}
					width={barLayout.width}
					{height}
					fill={color}
					opacity={effectiveOpacity}
					stroke={stackIsSelected ? selectedStroke : 'none'}
					stroke-width={stackIsSelected ? 2 : 0}
					class={className}
					style={onclick || onhover ? 'cursor: pointer;' : ''}
					onclick={(e) => onclick?.({ item, key, segmentIndex, seriesIndex }, e)}
					onmouseenter={() => {
						hoveredBar = { seriesIndex, segmentIndex };
						onhover?.({ item, key, segmentIndex, seriesIndex });
					}}
					onmouseleave={() => {
						hoveredBar = null;
						onhover?.(null);
					}}
				/>
			{/if}
		{/if}
	{/each}
{/each}
