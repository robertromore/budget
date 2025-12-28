<script lang="ts">
	import { getContext } from 'svelte';
	import { area, curveMonotoneX, type CurveFactory } from 'd3-shape';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		yRange: Readable<[number, number]>;
	}

	const { data, xGet, yGet, yRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		fill?: string;
		opacity?: number;
		curved?: boolean;
		curve?: CurveFactory;
		class?: string;
	}

	let {
		fill = 'currentColor',
		opacity = 0.3,
		curved = true,
		curve = curveMonotoneX,
		class: className = ''
	}: Props = $props();

	const path = $derived.by(() => {
		const areaGenerator = area<any>()
			.x((d) => $xGet(d))
			.y0($yRange[0])
			.y1((d) => $yGet(d));

		if (curved && curve) {
			areaGenerator.curve(curve);
		}

		return areaGenerator($data) || '';
	});
</script>

<path d={path} {fill} fill-opacity={opacity} stroke="none" class={className} />
