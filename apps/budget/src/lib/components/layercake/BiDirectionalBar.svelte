<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		yScale: Readable<any>;
		xRange: Readable<[number, number]>;
		yRange: Readable<[number, number]>;
	}

	const { data, xGet, yGet, yScale, xRange, yRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fillPositive?: string;
		fillNegative?: string;
		opacity?: number;
		radius?: number;
		gap?: number;
		onclick?: (d: any, event: MouseEvent) => void;
		onhover?: (d: any | null) => void;
		class?: string;
	}

	let {
		fillPositive = 'var(--chart-2)',
		fillNegative = 'var(--destructive)',
		opacity = 0.7,
		radius = 1,
		gap = 1,
		onclick,
		onhover,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Calculate bar width based on data count and available space
	const barWidth = $derived.by(() => {
		if ($data.length === 0) return 0;
		const totalWidth = $xRange[1] - $xRange[0];
		return Math.max(2, totalWidth / $data.length - gap);
	});

	// Get the y position for zero
	const zeroY = $derived($yScale(0));
</script>

{#each $data as d, i}
	{@const x = $xGet(d) - barWidth / 2}
	{@const yValue = $yGet(d)}
	{@const isPositive = yValue <= zeroY}
	{@const barY = isPositive ? yValue : zeroY}
	{@const barHeight = Math.abs(yValue - zeroY)}
	{@const isHovered = hoveredIndex === i}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<rect
		{x}
		y={barY}
		width={barWidth}
		height={barHeight}
		fill={isPositive ? fillPositive : fillNegative}
		opacity={isHovered ? 1 : opacity}
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
