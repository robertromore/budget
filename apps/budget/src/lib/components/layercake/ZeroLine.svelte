<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		yScale: Readable<any>;
		xRange: Readable<[number, number]>;
	}

	const { yScale, xRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		stroke?: string;
		strokeWidth?: number;
		strokeDasharray?: string;
		class?: string;
	}

	let {
		stroke = 'var(--muted-foreground)',
		strokeWidth = 1,
		strokeDasharray = '',
		class: className = ''
	}: Props = $props();

	const y = $derived($yScale(0));
</script>

<line
	x1={$xRange[0]}
	x2={$xRange[1]}
	y1={y}
	y2={y}
	{stroke}
	stroke-width={strokeWidth}
	stroke-dasharray={strokeDasharray}
	class={className}
/>
