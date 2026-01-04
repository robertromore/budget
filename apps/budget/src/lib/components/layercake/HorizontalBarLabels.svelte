<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yScale: Readable<any>;
		y: Readable<string | ((d: any) => any)>;
	}

	const { data, xGet, yScale, y } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		format?: (d: any) => string;
		offset?: number;
		fontSize?: number;
		fill?: string;
		class?: string;
	}

	let {
		format = (d: any) => String(d),
		offset = 5,
		fontSize = 11,
		fill = 'var(--muted-foreground)',
		class: className = ''
	}: Props = $props();

	// Get the y accessor key
	const yKey = $derived(typeof $y === 'string' ? $y : null);
</script>

{#each $data as d}
	{@const x = $xGet(d)}
	{@const yVal = yKey ? d[yKey] : typeof $y === 'function' ? $y(d) : d[$y]}
	{@const yPos = $yScale(yVal) + ($yScale.bandwidth?.() || 0) / 2}

	<text
		x={x + offset}
		y={yPos}
		dy={4}
		font-size={fontSize}
		{fill}
		class={className}
	>
		{format(d)}
	</text>
{/each}
