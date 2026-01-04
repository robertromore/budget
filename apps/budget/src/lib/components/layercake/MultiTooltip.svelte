<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Snippet } from 'svelte';
	import type { ScaleLinear } from 'd3-scale';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yScale: Readable<ScaleLinear<number, number>>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const { data, xGet, yScale, width, height } = getContext<LayerCakeContext>('LayerCake');

	interface Series {
		key: string;
		color: string;
		label?: string;
	}

	interface Props {
		series: Series[];
		children?: Snippet<[{ point: any; x: number; series: Series[] }]>;
		crosshair?: boolean;
		dots?: boolean;
		dotRadius?: number;
		class?: string;
		/** Cursor style to use when hovering */
		cursor?: 'crosshair' | 'pointer' | 'default';
		/** Double-click handler for drill-down */
		ondblclick?: (point: any, x: number) => void;
	}

	let {
		series,
		children,
		crosshair = true,
		dots = true,
		dotRadius = 4,
		class: className = '',
		cursor = 'crosshair',
		ondblclick
	}: Props = $props();

	let hoveredPoint = $state<any>(null);
	let mouseX = $state(0);

	function handleMouseMove(e: MouseEvent) {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		mouseX = e.clientX - rect.left;

		// Find closest point using bisect
		let closest = $data[0];
		let closestDist = Infinity;

		for (const d of $data) {
			const dist = Math.abs($xGet(d) - mouseX);
			if (dist < closestDist) {
				closestDist = dist;
				closest = d;
			}
		}

		hoveredPoint = closest;
	}

	function handleMouseLeave() {
		hoveredPoint = null;
	}

	const hoveredX = $derived(hoveredPoint ? $xGet(hoveredPoint) : 0);
</script>

<g class="multi-tooltip-layer {className}" role="presentation">
	<!-- Invisible rect to capture mouse events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	{#if $width > 0 && $height > 0}
		<rect
			x={0}
			y={0}
			width={$width}
			height={$height}
			fill="transparent"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			ondblclick={() => {
				if (hoveredPoint && ondblclick) {
					ondblclick(hoveredPoint, hoveredX);
				}
			}}
			style="cursor: {cursor};" />
	{/if}

	{#if hoveredPoint}
		<!-- All hover elements need pointer-events: none to prevent flickering -->
		<g style="pointer-events: none;">
			{#if crosshair}
				<!-- Vertical crosshair line -->
				<line
					x1={hoveredX}
					x2={hoveredX}
					y1={0}
					y2={$height}
					class="stroke-muted-foreground/50"
					stroke-dasharray="4" />
			{/if}

			{#if dots}
				<!-- Highlight dots for each series -->
				{#each series as s}
					{@const yValue = hoveredPoint[s.key]}
					{#if yValue !== undefined}
						{@const y = $yScale(yValue)}
						<circle cx={hoveredX} cy={y} r={dotRadius} fill={s.color} class="stroke-background" stroke-width={2} />
					{/if}
				{/each}
			{/if}

			{#if children}
				{@render children({ point: hoveredPoint, x: hoveredX, series })}
			{/if}
		</g>
	{/if}
</g>
