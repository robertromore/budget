<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { ScaleLinear } from 'd3-scale';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yScale: Readable<ScaleLinear<number, number>>;
	}

	const { data, xGet, yScale } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		y: string;
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		radius?: number;
		opacity?: number;
		hoverOpacity?: number;
		class?: string;
		onclick?: (d: any) => void;
		onhover?: (d: any | null) => void;
	}

	let {
		y,
		fill = 'currentColor',
		stroke = 'var(--background)',
		strokeWidth = 1,
		radius = 4,
		opacity = 1,
		hoverOpacity = 1,
		class: className = '',
		onclick,
		onhover
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);
</script>

{#each $data as d, i}
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
	<circle
		cx={$xGet(d)}
		cy={$yScale(d[y])}
		r={radius}
		{fill}
		{stroke}
		stroke-width={strokeWidth}
		opacity={hoveredIndex === i ? hoverOpacity : opacity}
		class="{className} {onclick ? 'cursor-pointer' : ''}"
		role={onclick ? 'button' : undefined}
		tabindex={onclick ? 0 : undefined}
		onclick={() => onclick?.(d)}
		onkeydown={(e) => e.key === 'Enter' && onclick?.(d)}
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
