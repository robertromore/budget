<script lang="ts">
	/**
	 * CustomLine - A Line component that accepts custom data as a prop
	 * Uses the scale context from LayerCake but renders with provided data
	 */
	import { getContext } from 'svelte';
	import { line, curveMonotoneX, type CurveFactory } from 'd3-shape';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		xScale: Readable<any>;
		yScale: Readable<any>;
	}

	const { xScale, yScale } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		data: Array<{ x: Date | number; y: number | null }>;
		stroke?: string;
		strokeWidth?: number;
		strokeDasharray?: string;
		curved?: boolean;
		curve?: CurveFactory;
		opacity?: number;
		class?: string;
	}

	let {
		data,
		stroke = 'currentColor',
		strokeWidth = 2,
		strokeDasharray = '',
		curved = true,
		curve = curveMonotoneX,
		opacity = 1,
		class: className = ''
	}: Props = $props();

	const path = $derived.by(() => {
		// Filter out null y values
		const validData = data.filter((d) => d.y !== null);
		if (validData.length < 2) return '';

		const lineGenerator = line<any>()
			.x((d) => $xScale(d.x))
			.y((d) => $yScale(d.y));

		if (curved && curve) {
			lineGenerator.curve(curve);
		}

		return lineGenerator(validData) || '';
	});
</script>

{#if path}
	<path
		d={path}
		fill="none"
		{stroke}
		stroke-width={strokeWidth}
		stroke-dasharray={strokeDasharray}
		{opacity}
		class={className}
	/>
{/if}
