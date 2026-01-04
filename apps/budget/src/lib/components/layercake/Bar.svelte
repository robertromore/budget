<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		xScale: Readable<any>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
	}

	const { data, xGet, yGet, xScale, yRange, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fill?: string | ((d: any) => string);
		opacity?: number | ((d: any) => number);
		hoverOpacity?: number;
		radius?: number;
		gap?: number;
		onclick?: (d: any, event: MouseEvent) => void;
		ondblclick?: (d: any, event: MouseEvent) => void;
		onhover?: (d: any | null) => void;
		/** Function to check if a bar is selected */
		isSelected?: (d: any) => boolean;
		/** Opacity for unselected bars when selection is active */
		unselectedOpacity?: number;
		/** Stroke color for selected bars */
		selectedStroke?: string;
		/** External hover index - when Brush is on top, use this to show hover state */
		externalHoveredIndex?: number | null;
		class?: string;
	}

	let {
		fill = 'currentColor',
		opacity = 1,
		hoverOpacity = 1,
		radius = 4,
		gap = 4,
		onclick,
		ondblclick,
		onhover,
		isSelected,
		unselectedOpacity = 0.4,
		selectedStroke = 'var(--foreground)',
		externalHoveredIndex = null,
		class: className = ''
	}: Props = $props();

	// Check if any bar is selected (to know when to dim non-selected bars)
	const hasSelection = $derived.by(() => {
		if (!isSelected) return false;
		return $data.some((d) => isSelected(d));
	});

	let hoveredIndex = $state<number | null>(null);

	// Helper to get fill color for a data point
	function getFill(d: any): string {
		if (typeof fill === 'function') {
			return fill(d);
		}
		return fill;
	}

	// Helper to get opacity for a data point
	function getOpacity(d: any): number {
		if (typeof opacity === 'function') {
			return opacity(d);
		}
		return opacity;
	}

	// Sort data by x position for consistent rendering
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $xGet(a) - $xGet(b));
	});

	// Calculate bar width and positions that fit within chart bounds without overlapping
	const barLayout = $derived.by(() => {
		if ($xScale.bandwidth) {
			// Band scale - use its bandwidth
			return {
				width: $xScale.bandwidth(),
				positions: new Map($data.map((d) => [d, $xGet(d)]))
			};
		}

		const dataLength = sortedData.length;
		if (dataLength === 0) {
			return { width: 0, positions: new Map() };
		}

		if (dataLength === 1) {
			// Single bar - center it
			const barW = Math.min(40, $width * 0.3);
			return {
				width: barW,
				positions: new Map([[sortedData[0], ($width - barW) / 2]])
			};
		}

		// For multiple bars: distribute evenly across the width
		// Each bar gets an equal slot, with the bar centered in its slot
		const slotWidth = $width / dataLength;
		const barW = Math.max(8, slotWidth - gap);

		// Position each bar in the center of its slot
		const positions = new Map<any, number>();
		sortedData.forEach((d, i) => {
			const slotStart = i * slotWidth;
			const barX = slotStart + (slotWidth - barW) / 2;
			positions.set(d, barX);
		});

		return { width: barW, positions };
	});
</script>

{#each $data as d, i}
	{@const x = barLayout.positions.get(d) ?? 0}
	{@const y = $yGet(d)}
	{@const height = Math.max(0, $yRange[0] - y)}
	{@const isHovered = hoveredIndex === i || externalHoveredIndex === i}
	{@const baseOpacity = getOpacity(d)}
	{@const barIsSelected = isSelected?.(d) ?? false}
	{@const effectiveOpacity = isHovered ? hoverOpacity : (hasSelection && !barIsSelected ? unselectedOpacity : baseOpacity)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<rect
		{x}
		{y}
		width={barLayout.width}
		{height}
		fill={getFill(d)}
		opacity={effectiveOpacity}
		rx={radius}
		stroke={barIsSelected ? selectedStroke : 'none'}
		stroke-width={barIsSelected ? 2 : 0}
		class={className}
		style={onclick ? 'cursor: pointer;' : ''}
		onclick={(e) => onclick?.(d, e)}
		ondblclick={(e) => ondblclick?.(d, e)}
		onmouseenter={() => {
			hoveredIndex = i;
			onhover?.(d);
		}}
		onmouseleave={() => {
			hoveredIndex = null;
			onhover?.(null);
		}}
	/>
{/each}
