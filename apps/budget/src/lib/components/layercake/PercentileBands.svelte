<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		yScale: Readable<(value: number) => number>;
		xRange: Readable<[number, number]>;
	}

	const { yScale, xRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		/** 25th percentile value */
		p25: number;
		/** 75th percentile value */
		p75: number;
		/** Fill color for the band */
		fill?: string;
		/** Opacity of the band */
		opacity?: number;
		class?: string;
	}

	let {
		p25,
		p75,
		fill = 'var(--chart-3)',
		opacity = 0.1,
		class: className = ''
	}: Props = $props();

	const y25 = $derived($yScale(p25));
	const y75 = $derived($yScale(p75));
	const bandHeight = $derived(Math.abs(y25 - y75));
	const bandY = $derived(Math.min(y25, y75));
</script>

<g class="percentile-bands {className}">
	<rect
		x={$xRange[0]}
		y={bandY}
		width={$xRange[1] - $xRange[0]}
		height={bandHeight}
		{fill}
		fill-opacity={opacity}
	/>
</g>
