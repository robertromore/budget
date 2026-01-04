<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		xRange: Readable<[number, number]>;
		height: Readable<number>;
	}

	const { data, xGet, yGet, xRange, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		radius?: number;
		showLine?: boolean;
		lineColor?: string;
		lineOpacity?: number;
		gap?: number;
		class?: string;
	}

	let {
		fill = 'var(--primary)',
		stroke = 'var(--background)',
		strokeWidth = 2,
		radius = 6,
		showLine = true,
		lineColor = 'var(--muted-foreground)',
		lineOpacity = 0.3,
		gap = 8,
		class: className = ''
	}: Props = $props();

	// Sort data by y position for consistent rendering
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $yGet(a) - $yGet(b));
	});

	// Calculate row heights for evenly distributed data
	const rowLayout = $derived.by(() => {
		const dataLength = sortedData.length;
		if (dataLength === 0) return { height: 0, positions: new Map() };

		const slotHeight = $height / dataLength;
		const positions = new Map<any, number>();

		sortedData.forEach((d, i) => {
			// Center dot in the middle of its slot
			const y = i * slotHeight + slotHeight / 2;
			positions.set(d, y);
		});

		return { height: slotHeight - gap, positions };
	});
</script>

{#each $data as d}
	{@const x = $xGet(d)}
	{@const y = rowLayout.positions.get(d) ?? $yGet(d)}

	{#if showLine}
		<!-- Connecting line from axis to dot -->
		<line
			x1={$xRange[0]}
			y1={y}
			x2={x}
			y2={y}
			stroke={lineColor}
			stroke-opacity={lineOpacity}
			stroke-width={1}
		/>
	{/if}

	<!-- Dot at value position -->
	<circle
		cx={x}
		cy={y}
		r={radius}
		{fill}
		{stroke}
		stroke-width={strokeWidth}
		class={className}
	/>
{/each}
