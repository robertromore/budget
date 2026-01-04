<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		xScale: Readable<any>;
		yRange: Readable<[number, number]>;
	}

	const { xScale, yRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		value: number;
		stroke?: string;
		strokeWidth?: number;
		strokeDasharray?: string;
		class?: string;
	}

	let {
		value,
		stroke = 'var(--muted-foreground)',
		strokeWidth = 1,
		strokeDasharray = '',
		class: className = ''
	}: Props = $props();

	const x = $derived($xScale(value));
</script>

<line
	x1={x}
	x2={x}
	y1={$yRange[1]}
	y2={$yRange[0]}
	{stroke}
	stroke-width={strokeWidth}
	stroke-dasharray={strokeDasharray}
	class={className}
/>
