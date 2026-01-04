<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xScale: Readable<any>;
		yScale: Readable<any>;
		width: Readable<number>;
	}

	const { data, xScale, yScale, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		x1: string;
		x2: string;
		y: string;
		fill1?: string;
		fill2?: string | ((d: any) => string);
		lineStroke?: string | ((d: any) => string);
		lineWidth?: number;
		radius?: number;
		showLabels?: boolean;
		labelFormat?: (d: any) => string;
		onclick?: (d: any, event: MouseEvent) => void;
		onhover?: (d: any | null) => void;
		hoverOpacity?: number;
		class?: string;
	}

	let {
		x1,
		x2,
		y,
		fill1 = 'var(--muted-foreground)',
		fill2 = 'var(--primary)',
		lineStroke = 'var(--muted-foreground)',
		lineWidth = 1,
		radius = 6,
		showLabels = false,
		labelFormat,
		onclick,
		onhover,
		hoverOpacity = 1,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Helper to get fill color for second dot
	function getFill2(d: any): string {
		if (typeof fill2 === 'function') {
			return fill2(d);
		}
		return fill2;
	}

	// Helper to get line stroke color
	function getLineStroke(d: any): string {
		if (typeof lineStroke === 'function') {
			return lineStroke(d);
		}
		return lineStroke;
	}
</script>

{#each $data as d, i}
	{@const x1Pos = $xScale(d[x1])}
	{@const x2Pos = $xScale(d[x2])}
	{@const yPos = $yScale(d[y]) + ($yScale.bandwidth?.() || 0) / 2}
	{@const isHovered = hoveredIndex === i}
	{@const baseOpacity = isHovered ? hoverOpacity : 0.85}

	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<g
		style={onclick || onhover ? 'cursor: pointer;' : ''}
		onclick={(e) => onclick?.(d, e)}
		onmouseenter={() => {
			hoveredIndex = i;
			onhover?.(d);
		}}
		onmouseleave={() => {
			hoveredIndex = null;
			onhover?.(null);
		}}
	>
		<!-- Connecting line -->
		<line
			x1={x1Pos}
			x2={x2Pos}
			y1={yPos}
			y2={yPos}
			stroke={getLineStroke(d)}
			stroke-width={isHovered ? lineWidth + 1 : lineWidth}
			opacity={baseOpacity}
		/>

		<!-- First dot (e.g., previous value) -->
		<circle
			cx={x1Pos}
			cy={yPos}
			r={isHovered ? radius + 1 : radius}
			fill={fill1}
			opacity={isHovered ? 0.8 : 0.6}
			class={className}
		/>

		<!-- Second dot (e.g., current value) -->
		<circle
			cx={x2Pos}
			cy={yPos}
			r={isHovered ? radius + 1 : radius}
			fill={getFill2(d)}
			opacity={baseOpacity}
			class={className}
		/>

		<!-- Invisible hit area for easier interaction -->
		<rect
			x={Math.min(x1Pos, x2Pos) - radius}
			y={yPos - 12}
			width={Math.abs(x2Pos - x1Pos) + radius * 2}
			height={24}
			fill="transparent"
		/>
	</g>

	<!-- Optional label -->
	{#if showLabels && labelFormat}
		<text
			x={$width - 10}
			y={yPos}
			dy={4}
			font-size={12}
			text-anchor="end"
			fill={getFill2(d)}
			font-weight={isHovered ? 600 : 400}
		>
			{labelFormat(d)}
		</text>
	{/if}
{/each}
