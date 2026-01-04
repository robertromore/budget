<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { lineRadial, curveLinearClosed } from 'd3-shape';
	import { scaleLinear } from 'd3-scale';
	import { max } from 'd3-array';

	interface LayerCakeContext {
		data: Readable<any[]>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const { data, width, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		keys: string[];
		fill?: string;
		stroke?: string;
		strokeWidth?: number;
		fillOpacity?: number;
		showGrid?: boolean;
		showLabels?: boolean;
		levels?: number;
		gridColor?: string;
		labelColor?: string;
		class?: string;
		onhover?: (point: { key: string; value: number; x: number; y: number } | null) => void;
	}

	let {
		keys,
		fill = 'var(--primary)',
		stroke = 'var(--primary)',
		strokeWidth = 2,
		fillOpacity = 0.2,
		showGrid = true,
		showLabels = true,
		levels = 5,
		gridColor = 'var(--muted-foreground)',
		labelColor = 'var(--muted-foreground)',
		class: className = '',
		onhover
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Calculate center and radius
	const center = $derived({ x: $width / 2, y: $height / 2 });
	const radius = $derived(Math.min($width, $height) / 2 - 40);

	// Calculate angle for each axis
	const angleSlice = $derived((Math.PI * 2) / keys.length);

	// Find max value across all data and keys for scaling
	const maxValue = $derived.by(() => {
		if ($data.length === 0 || keys.length === 0) return 1;

		let maxVal = 0;
		for (const d of $data) {
			for (const key of keys) {
				const val = d[key];
				if (typeof val === 'number' && val > maxVal) {
					maxVal = val;
				}
			}
		}
		return maxVal || 1;
	});

	// Create radial scale
	const rScale = $derived(scaleLinear().domain([0, maxValue]).range([0, radius]));

	// Generate grid circles
	const gridCircles = $derived.by(() => {
		if (!showGrid) return [];

		return Array.from({ length: levels }, (_, i) => {
			const r = (radius / levels) * (i + 1);
			return { r, value: (maxValue / levels) * (i + 1) };
		});
	});

	// Generate axis lines
	const axisLines = $derived.by(() => {
		return keys.map((key, i) => {
			const angle = angleSlice * i - Math.PI / 2;
			return {
				key,
				x1: center.x,
				y1: center.y,
				x2: center.x + radius * Math.cos(angle),
				y2: center.y + radius * Math.sin(angle),
				labelX: center.x + (radius + 15) * Math.cos(angle),
				labelY: center.y + (radius + 15) * Math.sin(angle)
			};
		});
	});

	// Generate data polygons
	const dataPolygons = $derived.by(() => {
		return $data.map((d) => {
			const points = keys.map((key, i) => {
				const value = d[key] ?? 0;
				const angle = angleSlice * i - Math.PI / 2;
				const r = rScale(value);
				return {
					x: center.x + r * Math.cos(angle),
					y: center.y + r * Math.sin(angle),
					key,
					value
				};
			});

			// Create path string
			const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

			return {
				path: pathData + ' Z',
				points
			};
		});
	});
</script>

<g class="radar-chart {className}">
	{#if showGrid}
		<!-- Grid circles -->
		{#each gridCircles as circle}
			<circle
				cx={center.x}
				cy={center.y}
				r={circle.r}
				fill="none"
				stroke={gridColor}
				stroke-opacity={0.2}
				stroke-dasharray="4"
			/>
		{/each}

		<!-- Axis lines -->
		{#each axisLines as axis}
			<line
				x1={axis.x1}
				y1={axis.y1}
				x2={axis.x2}
				y2={axis.y2}
				stroke={gridColor}
				stroke-opacity={0.3}
			/>
		{/each}
	{/if}

	{#if showLabels}
		<!-- Axis labels -->
		{#each axisLines as axis}
			<text
				x={axis.labelX}
				y={axis.labelY}
				fill={labelColor}
				font-size="12"
				text-anchor="middle"
				dominant-baseline="middle"
			>
				{axis.key}
			</text>
		{/each}
	{/if}

	<!-- Data polygons -->
	{#each dataPolygons as polygon}
		<path
			d={polygon.path}
			{fill}
			fill-opacity={fillOpacity}
			{stroke}
			stroke-width={strokeWidth}
		/>

		<!-- Data points -->
		{#each polygon.points as point, i}
			{@const isHovered = hoveredIndex === i}
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<circle
				cx={point.x}
				cy={point.y}
				r={isHovered ? 6 : 4}
				{fill}
				stroke="var(--background)"
				stroke-width={2}
				style={onhover ? 'cursor: pointer;' : ''}
				onmouseenter={() => {
					hoveredIndex = i;
					onhover?.({ key: point.key, value: point.value, x: point.x, y: point.y });
				}}
				onmouseleave={() => {
					hoveredIndex = null;
					onhover?.(null);
				}}
			/>
		{/each}
	{/each}
</g>
