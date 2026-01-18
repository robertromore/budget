<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { ScaleLinear } from 'd3-scale';

	interface LayerCakeContext {
		yScale: Readable<ScaleLinear<number, number>>;
		xRange: Readable<[number, number]>;
		height: Readable<number>;
	}

	const { yScale, xRange, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		ticks?: number;
		format?: (d: any) => string;
		gridlines?: boolean;
		label?: string;
		tickMarks?: boolean;
		class?: string;
	}

	let {
		ticks = 5,
		format = (d: any) => String(d),
		gridlines = true,
		label,
		tickMarks = true,
		class: className = ''
	}: Props = $props();

	const tickValues = $derived.by(() => {
		const scale = $yScale;
		if ('ticks' in scale && typeof scale.ticks === 'function') {
			return scale.ticks(ticks);
		}
		return scale.domain();
	});

	// Get bandwidth for band scales to center labels
	const bandwidth = $derived.by(() => {
		const scale = $yScale as any;
		if (scale && typeof scale.bandwidth === 'function') {
			return scale.bandwidth();
		}
		return 0;
	});
</script>

<g class="axis y-axis {className}">
	{#each tickValues as tick}
		{@const y = $yScale(tick) + bandwidth / 2}
		<g class="tick" transform="translate(0, {y})">
			{#if gridlines}
				<line x1={0} x2={$xRange[1]} class="stroke-muted/20" stroke-dasharray="2,2" />
			{/if}
			{#if tickMarks}
				<line x1={-6} x2={0} class="stroke-muted-foreground" />
			{/if}
			<text
				x={-10}
				text-anchor="end"
				dominant-baseline="middle"
				class="fill-muted-foreground text-xs">
				{format(tick)}
			</text>
		</g>
	{/each}
	<line y1={0} y2={$height} class="stroke-border" />
	{#if label}
		<text
			x={-40}
			y={$height / 2}
			text-anchor="middle"
			transform="rotate(-90, -40, {$height / 2})"
			class="fill-muted-foreground text-xs">
			{label}
		</text>
	{/if}
</g>
