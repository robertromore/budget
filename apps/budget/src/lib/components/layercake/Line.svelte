<script lang="ts">
	import { getContext } from 'svelte';
	import { line, curveMonotoneX, type CurveFactory } from 'd3-shape';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
	}

	const { data, xGet, yGet } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		stroke?: string;
		strokeWidth?: number;
		strokeDasharray?: string;
		curved?: boolean;
		curve?: CurveFactory;
		class?: string;
	}

	let {
		stroke = 'currentColor',
		strokeWidth = 2,
		strokeDasharray = '',
		curved = true,
		curve = curveMonotoneX,
		class: className = ''
	}: Props = $props();

	const path = $derived.by(() => {
		const lineGenerator = line<any>()
			.x((d) => $xGet(d))
			.y((d) => $yGet(d));

		if (curved && curve) {
			lineGenerator.curve(curve);
		}

		return lineGenerator($data) || '';
	});
</script>

<path d={path} fill="none" {stroke} stroke-width={strokeWidth} stroke-dasharray={strokeDasharray} class={className} />
