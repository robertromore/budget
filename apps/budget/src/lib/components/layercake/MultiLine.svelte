<script lang="ts">
	import { getContext } from 'svelte';
	import { line, curveMonotoneX, type CurveFactory } from 'd3-shape';
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
		stroke?: string;
		strokeWidth?: number;
		curved?: boolean;
		curve?: CurveFactory;
		opacity?: number;
		class?: string;
	}

	let {
		y,
		stroke = 'currentColor',
		strokeWidth = 2,
		curved = true,
		curve = curveMonotoneX,
		opacity = 1,
		class: className = ''
	}: Props = $props();

	const path = $derived.by(() => {
		const lineGenerator = line<any>()
			.x((d) => $xGet(d))
			.y((d) => $yScale(d[y]));

		if (curved && curve) {
			lineGenerator.curve(curve);
		}

		return lineGenerator($data) || '';
	});
</script>

<path d={path} fill="none" {stroke} stroke-width={strokeWidth} {opacity} class={className} />
