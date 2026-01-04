<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		yScale: Readable<any>;
		xRange: Readable<[number, number]>;
		height: Readable<number>;
	}

	const { data, xGet, yGet, yScale, xRange, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fill?: string | ((d: any) => string);
		opacity?: number;
		hoverOpacity?: number;
		radius?: number;
		gap?: number;
		onclick?: (d: any, event: MouseEvent) => void;
		onhover?: (d: any | null) => void;
		class?: string;
	}

	let {
		fill = 'var(--primary)',
		opacity = 1,
		hoverOpacity = 1,
		radius = 4,
		gap = 4,
		onclick,
		onhover,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Helper to get fill color for a data point
	function getFill(d: any): string {
		if (typeof fill === 'function') {
			return fill(d);
		}
		return fill;
	}

	// Sort data by y position for consistent rendering
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $yGet(a) - $yGet(b));
	});

	// Calculate bar height and positions
	const barLayout = $derived.by(() => {
		if ($yScale.bandwidth) {
			// Band scale - use its bandwidth
			return {
				height: $yScale.bandwidth(),
				positions: new Map($data.map((d) => [d, $yGet(d)]))
			};
		}

		const dataLength = sortedData.length;
		if (dataLength === 0) {
			return { height: 0, positions: new Map() };
		}

		if (dataLength === 1) {
			// Single bar - center it
			const barH = Math.min(40, $height * 0.3);
			return {
				height: barH,
				positions: new Map([[sortedData[0], ($height - barH) / 2]])
			};
		}

		// For multiple bars: distribute evenly across the height
		const slotHeight = $height / dataLength;
		const barH = Math.max(8, slotHeight - gap);

		// Position each bar in the center of its slot
		const positions = new Map<any, number>();
		sortedData.forEach((d, i) => {
			const slotStart = i * slotHeight;
			const barY = slotStart + (slotHeight - barH) / 2;
			positions.set(d, barY);
		});

		return { height: barH, positions };
	});
</script>

{#each $data as d, i}
	{@const y = barLayout.positions.get(d) ?? 0}
	{@const x = $xRange[0]}
	{@const barWidth = Math.max(0, $xGet(d) - $xRange[0])}
	{@const isHovered = hoveredIndex === i}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<rect
		{x}
		{y}
		width={barWidth}
		height={barLayout.height}
		fill={getFill(d)}
		opacity={isHovered ? hoverOpacity : opacity}
		rx={radius}
		class={className}
		style={onclick ? 'cursor: pointer;' : ''}
		onclick={(e) => onclick?.(d, e)}
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
