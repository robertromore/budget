<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { ScaleLinear, ScaleTime } from 'd3-scale';

	interface LayerCakeContext {
		xScale: Readable<ScaleLinear<number, number> | ScaleTime<number, number>>;
		yScale: Readable<ScaleLinear<number, number>>;
		xRange: Readable<[number, number]>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const { xScale, yScale, xRange, yRange, width, height } =
		getContext<LayerCakeContext>('LayerCake');

	interface Props {
		horizontal?: boolean;
		vertical?: boolean;
		xTicks?: number;
		yTicks?: number;
		class?: string;
	}

	let {
		horizontal = true,
		vertical = false,
		xTicks = 5,
		yTicks = 5,
		class: className = ''
	}: Props = $props();

	const xTickValues = $derived.by(() => {
		const scale = $xScale;
		if ('ticks' in scale && typeof scale.ticks === 'function') {
			return scale.ticks(xTicks);
		}
		return scale.domain();
	});

	const yTickValues = $derived.by(() => {
		const scale = $yScale;
		if ('ticks' in scale && typeof scale.ticks === 'function') {
			return scale.ticks(yTicks);
		}
		return scale.domain();
	});
</script>

<g class="grid {className}">
	{#if horizontal}
		{#each yTickValues as tick}
			{@const y = $yScale(tick)}
			<line x1={0} x2={$width} y1={y} y2={y} class="stroke-muted/20" />
		{/each}
	{/if}

	{#if vertical}
		{#each xTickValues as tick}
			{@const x = $xScale(tick)}
			<line x1={x} x2={x} y1={0} y2={$height} class="stroke-muted/20" />
		{/each}
	{/if}
</g>
