<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
	}

	const { data, xGet, yGet } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fill?: string | ((d: any) => string);
		stroke?: string | ((d: any) => string);
		strokeWidth?: number;
		radius?: number | ((d: any) => number);
		hoverRadius?: number;
		opacity?: number | ((d: any) => number);
		hoverOpacity?: number;
		onclick?: (d: any, event: MouseEvent) => void;
		ondblclick?: (d: any, event: MouseEvent) => void;
		onhover?: (d: any | null) => void;
		class?: string;
	}

	let {
		fill = 'var(--primary)',
		stroke = 'var(--background)',
		strokeWidth = 1,
		radius = 5,
		hoverRadius,
		opacity = 0.8,
		hoverOpacity = 1,
		onclick,
		ondblclick,
		onhover,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Helper to get fill color for a data point
	function getFill(d: any): string {
		if (typeof fill === 'function') {
			return fill(d);
		}
		return fill;
	}

	// Helper to get stroke color for a data point
	function getStroke(d: any): string {
		if (typeof stroke === 'function') {
			return stroke(d);
		}
		return stroke;
	}

	// Helper to get radius for a data point
	function getRadius(d: any): number {
		if (typeof radius === 'function') {
			return radius(d);
		}
		return radius;
	}

	// Helper to get opacity for a data point
	function getOpacity(d: any): number {
		if (typeof opacity === 'function') {
			return opacity(d);
		}
		return opacity;
	}
</script>

{#each $data as d, i}
	{@const isHovered = hoveredIndex === i}
	{@const baseRadius = getRadius(d)}
	{@const baseOpacity = getOpacity(d)}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<circle
		cx={$xGet(d)}
		cy={$yGet(d)}
		r={isHovered && hoverRadius ? hoverRadius : baseRadius}
		fill={getFill(d)}
		stroke={getStroke(d)}
		stroke-width={strokeWidth}
		opacity={isHovered ? hoverOpacity : baseOpacity}
		class={className}
		style={onclick || ondblclick ? 'cursor: pointer;' : ''}
		onclick={(e) => onclick?.(d, e)}
		ondblclick={(e) => ondblclick?.(d, e)}
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
