<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		xGet: Readable<(d: any) => number>;
		yScale: Readable<(value: number) => number>;
	}

	const { xGet, yScale } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		/** The trend line data with average values */
		trendData: Array<{ month: string; average: number; x: Date | number }>;
		/** Fill color for the dots */
		fill?: string;
		/** Dot radius */
		radius?: number;
		/** Stroke width for outline */
		strokeWidth?: number;
		/** Opacity for the dots */
		opacity?: number;
	}

	let {
		trendData,
		fill = 'var(--chart-2)',
		radius = 4,
		strokeWidth = 2,
		opacity = 1
	}: Props = $props();
</script>

{#if trendData.length > 0}
	<g class="trend-dots">
		{#each trendData as point}
			<circle
				cx={$xGet(point)}
				cy={$yScale(point.average)}
				r={radius}
				{fill}
				stroke="var(--background)"
				stroke-width={strokeWidth}
				{opacity}
			/>
		{/each}
	</g>
{/if}
