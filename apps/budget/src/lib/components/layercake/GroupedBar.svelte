<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xScale: Readable<any>;
		yScale: Readable<any>;
		yRange: Readable<[number, number]>;
		width: Readable<number>;
	}

	const { data, xScale, yScale, yRange, width } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		/** The keys to render as grouped bars */
		keys: string[];
		/** Colors for each key */
		colors: string[];
		/** Opacity of the bars */
		opacity?: number;
		/** Opacity when hovered */
		hoverOpacity?: number;
		/** Gap between bar groups */
		groupGap?: number;
		/** Gap between bars within a group */
		barGap?: number;
		/** Border radius of bars */
		radius?: number;
		/** X accessor property name */
		xKey?: string;
		/** Hover callback - receives the data item, key index, and key name */
		onhover?: (info: { item: any; keyIndex: number; key: string } | null) => void;
		/** Click callback */
		onclick?: (info: { item: any; keyIndex: number; key: string }, event: MouseEvent) => void;
		/** Function to check if a bar group is selected */
		isSelected?: (d: any) => boolean;
		/** Opacity for unselected bars when selection is active */
		unselectedOpacity?: number;
		/** Stroke color for selected bars */
		selectedStroke?: string;
		/** External hover data index - when Brush is on top, use this to show hover state */
		externalHoveredIndex?: number | null;
		class?: string;
	}

	let {
		keys,
		colors,
		opacity = 0.85,
		hoverOpacity = 1,
		groupGap = 8,
		barGap = 2,
		radius = 2,
		xKey = 'index',
		onhover,
		onclick,
		isSelected,
		unselectedOpacity = 0.4,
		selectedStroke = 'var(--foreground)',
		externalHoveredIndex = null,
		class: className = ''
	}: Props = $props();

	let hoveredBar = $state<{ dataIndex: number; keyIndex: number } | null>(null);

	// Check if any bar group is selected (to know when to dim non-selected bars)
	const hasSelection = $derived.by(() => {
		if (!isSelected) return false;
		return $data.some((d) => isSelected(d));
	});

	// Calculate bar layout using scale context
	const barLayout = $derived.by(() => {
		const dataLength = $data.length;
		if (dataLength === 0) return { barWidth: 0, bandwidth: 0 };

		// Get bandwidth from scale if available (for scaleBand)
		const scale = $xScale;
		const bandwidth = scale && typeof scale.bandwidth === 'function' ? scale.bandwidth() : 0;

		// Calculate step (distance between band starts) from scale for bar sizing
		const x0 = scale(0);
		const x1 = scale(1);
		const step = Math.abs(x1 - x0);

		// Use bandwidth for bar sizing if available, otherwise use step
		const groupWidth = bandwidth > 0 ? bandwidth : step;

		// Calculate individual bar width based on the group width
		const numBars = keys.length;
		const totalBarGap = (numBars - 1) * barGap;
		const availableBarWidth = groupWidth - groupGap - totalBarGap;
		const barWidth = Math.max(4, availableBarWidth / numBars);

		return { barWidth, bandwidth };
	});
</script>

<g class="grouped-bars {className}">
	{#each $data as d, i}
		{@const xValue = d[xKey]}
		{@const scaledX = $xScale(xValue)}
		{@const totalBarsWidth = keys.length * barLayout.barWidth + (keys.length - 1) * barGap}
		{@const bandWidth = barLayout.bandwidth}
		{@const groupStartX = bandWidth > 0 ? scaledX + (bandWidth - totalBarsWidth) / 2 : scaledX}
		{@const groupIsSelected = isSelected?.(d) ?? false}
		{#each keys as key, ki}
			{@const value = (d[key] as number) || 0}
			{@const barX = groupStartX + ki * (barLayout.barWidth + barGap)}
			{@const barY = $yScale(value)}
			{@const barHeight = Math.max(0, $yRange[0] - barY)}
			{@const isInternalHovered = hoveredBar?.dataIndex === i && hoveredBar?.keyIndex === ki}
			{@const isExternalHovered = externalHoveredIndex === i}
			{@const isHovered = isInternalHovered || isExternalHovered}
			{@const effectiveOpacity = isHovered ? hoverOpacity : (hasSelection && !groupIsSelected ? unselectedOpacity : opacity)}
			<!-- svelte-ignore a11y_click_events_have_key_events -->
			<!-- svelte-ignore a11y_no_static_element_interactions -->
			<rect
				x={barX}
				y={barY}
				width={barLayout.barWidth}
				height={barHeight}
				fill={colors[ki % colors.length]}
				opacity={effectiveOpacity}
				rx={radius}
				stroke={groupIsSelected ? selectedStroke : 'none'}
				stroke-width={groupIsSelected ? 2 : 0}
				style={onclick || onhover ? 'cursor: pointer;' : ''}
				onclick={(e) => onclick?.({ item: d, keyIndex: ki, key }, e)}
				onmouseenter={() => {
					hoveredBar = { dataIndex: i, keyIndex: ki };
					onhover?.({ item: d, keyIndex: ki, key });
				}}
				onmouseleave={() => {
					hoveredBar = null;
					onhover?.(null);
				}}
			/>
		{/each}
	{/each}
</g>
