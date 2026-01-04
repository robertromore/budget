<script lang="ts">
	import { getContext } from 'svelte';
	import { area, stack, curveMonotoneX, type CurveFactory } from 'd3-shape';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yScale: Readable<any>;
		yRange: Readable<[number, number]>;
	}

	const { data, xGet, yScale, yRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		keys: string[];
		colors?: string[];
		opacity?: number;
		curved?: boolean;
		curve?: CurveFactory;
		class?: string;
	}

	let {
		keys,
		colors = ['var(--primary)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'],
		opacity = 0.7,
		curved = true,
		curve = curveMonotoneX,
		class: className = ''
	}: Props = $props();

	// Sort data by x position for consistent rendering
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $xGet(a) - $xGet(b));
	});

	// Calculate stacked data using D3 stack
	const stackedData = $derived.by(() => {
		if (sortedData.length === 0 || keys.length === 0) return [];

		const stackGenerator = stack<any>().keys(keys);
		return stackGenerator(sortedData);
	});

	// Convert y value to pixel position
	function yToPixel(value: number): number {
		if ($yScale) {
			return $yScale(value);
		}
		return $yRange[0] - value;
	}

	// Generate area paths for each series
	const areaPaths = $derived.by(() => {
		return stackedData.map((series, seriesIndex) => {
			const areaGenerator = area<any>()
				.x((d, i) => $xGet(sortedData[i]))
				.y0((d) => yToPixel(d[0]))
				.y1((d) => yToPixel(d[1]));

			if (curved && curve) {
				areaGenerator.curve(curve);
			}

			return {
				path: areaGenerator(series) || '',
				color: colors[seriesIndex % colors.length],
				key: keys[seriesIndex]
			};
		});
	});
</script>

{#each areaPaths as { path, color, key }}
	<path d={path} fill={color} fill-opacity={opacity} stroke="none" class={className} />
{/each}
