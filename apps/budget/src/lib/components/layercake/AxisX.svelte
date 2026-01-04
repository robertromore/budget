<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { ScaleLinear, ScaleTime } from 'd3-scale';

	interface LayerCakeContext {
		xScale: Readable<ScaleLinear<number, number> | ScaleTime<number, number>>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
	}

	const { xScale, yRange, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		/** Number of ticks to generate (ignored if tickValues is provided) */
		ticks?: number;
		/** Explicit tick values - use this to align ticks with data points */
		tickValues?: any[];
		format?: (d: any) => string;
		gridlines?: boolean;
		label?: string;
		tickMarks?: boolean;
		class?: string;
	}

	let {
		ticks = 5,
		tickValues: explicitTickValues,
		format = (d: any) => String(d),
		gridlines = false,
		label,
		tickMarks = true,
		class: className = ''
	}: Props = $props();

	const tickValues = $derived.by(() => {
		// Use explicit tick values if provided
		if (explicitTickValues && explicitTickValues.length > 0) {
			return explicitTickValues;
		}
		// Otherwise generate ticks from the scale
		const scale = $xScale;
		if ('ticks' in scale && typeof scale.ticks === 'function') {
			return scale.ticks(ticks);
		}
		return scale.domain();
	});

	// Get bandwidth for band scales to center labels
	const bandwidth = $derived.by(() => {
		const scale = $xScale as any;
		if (scale && typeof scale.bandwidth === 'function') {
			return scale.bandwidth();
		}
		return 0;
	});
</script>

<g class="axis x-axis {className}" transform="translate(0, {$yRange[0]})">
	{#each tickValues as tick}
		{@const x = $xScale(tick) + bandwidth / 2}
		<g class="tick" transform="translate({x}, 0)">
			{#if gridlines}
				<line y1={0} y2={-$yRange[0]} class="stroke-muted/20" stroke-dasharray="2,2" />
			{/if}
			{#if tickMarks}
				<line y1={0} y2={6} class="stroke-muted-foreground" />
			{/if}
			<text y={20} text-anchor="middle" class="fill-muted-foreground text-xs">
				{format(tick)}
			</text>
		</g>
	{/each}
	<line x1={0} x2={$width} class="stroke-border" />
	{#if label}
		<text x={$width / 2} y={40} text-anchor="middle" class="fill-muted-foreground text-xs">
			{label}
		</text>
	{/if}
</g>
