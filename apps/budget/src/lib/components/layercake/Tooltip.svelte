<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';
	import type { Snippet } from 'svelte';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const ctx = getContext<LayerCakeContext>('LayerCake');
	const { data, xGet, width, height } = ctx;
	// yGet may not be defined for some chart types (like Beeswarm)
	const yGet = ctx.yGet;

	interface Props {
		children?: Snippet<[{ point: any; x: number; y: number }]>;
		crosshair?: boolean;
		dot?: boolean;
		dotRadius?: number;
		barMode?: boolean;
		/** External hover X position - when provided, Tooltip uses this instead of its own mouse tracking */
		externalHoverX?: number | null;
		/** Called when clicking anywhere in the chart area with the currently hovered point */
		onclick?: (point: any, event: MouseEvent) => void;
		/** Called when double-clicking anywhere in the chart area with the currently hovered point */
		ondblclick?: (point: any, event: MouseEvent) => void;
		class?: string;
	}

	let {
		children,
		crosshair = true,
		dot = true,
		dotRadius = 4,
		barMode = false,
		externalHoverX,
		onclick,
		ondblclick,
		class: className = ''
	}: Props = $props();

	// Bar mode automatically disables crosshair and dot (unless explicitly overridden)
	const effectiveCrosshair = $derived(crosshair && !barMode);
	const effectiveDot = $derived(dot && !barMode);

	let hoveredPoint = $state<any>(null);
	let hoveredIndex = $state<number>(-1);
	let mouseX = $state(0);

	// Whether we're using external hover control (e.g., from Brush component)
	const useExternalHover = $derived(externalHoverX !== undefined);

	// Sort data by x position for bar mode
	const sortedData = $derived.by(() => {
		return [...$data].sort((a, b) => $xGet(a) - $xGet(b));
	});

	// Find closest point to a given x position
	function findClosestPoint(x: number) {
		if (barMode && sortedData.length > 0) {
			// For bar mode, find which slot the mouse is in
			const slotWidth = $width / sortedData.length;
			const slotIndex = Math.floor(x / slotWidth);
			const clampedIndex = Math.max(0, Math.min(slotIndex, sortedData.length - 1));
			return { point: sortedData[clampedIndex], index: clampedIndex };
		} else {
			// Find closest point using distance
			let closest = $data[0];
			let closestDist = Infinity;

			for (const d of $data) {
				const dist = Math.abs($xGet(d) - x);
				if (dist < closestDist) {
					closestDist = dist;
					closest = d;
				}
			}

			return { point: closest, index: -1 };
		}
	}

	// React to external hover position changes
	$effect(() => {
		if (externalHoverX !== undefined) {
			if (externalHoverX === null) {
				hoveredPoint = null;
				hoveredIndex = -1;
			} else {
				mouseX = externalHoverX;
				const result = findClosestPoint(externalHoverX);
				hoveredPoint = result.point;
				hoveredIndex = result.index;
			}
		}
	});

	function handleMouseMove(e: MouseEvent) {
		const rect = (e.currentTarget as SVGElement).getBoundingClientRect();
		mouseX = e.clientX - rect.left;

		const result = findClosestPoint(mouseX);
		hoveredPoint = result.point;
		hoveredIndex = result.index;
	}

	function handleMouseLeave() {
		hoveredPoint = null;
		hoveredIndex = -1;
	}

	function handleClick(e: MouseEvent) {
		if (hoveredPoint && onclick) {
			onclick(hoveredPoint, e);
		}
	}

	function handleDoubleClick(e: MouseEvent) {
		if (hoveredPoint && ondblclick) {
			ondblclick(hoveredPoint, e);
		}
	}

	// Use bar position if in bar mode, otherwise use scale position
	const hoveredX = $derived.by(() => {
		if (!hoveredPoint) return 0;
		if (barMode && hoveredIndex >= 0) {
			// Calculate center of slot based on index (same as Bar component)
			const slotWidth = $width / sortedData.length;
			return hoveredIndex * slotWidth + slotWidth / 2;
		}
		return $xGet(hoveredPoint);
	});
	const hoveredY = $derived.by(() => {
		if (!hoveredPoint) return 0;
		// yGet may not be defined for some chart types (like Beeswarm)
		if (yGet && typeof $yGet === 'function') {
			try {
				return $yGet(hoveredPoint);
			} catch {
				return $height / 2;
			}
		}
		return $height / 2;
	});
</script>

<g class="tooltip-layer {className}" role="presentation">
	<!-- Invisible rect to capture mouse events - only when not using external hover -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	{#if !useExternalHover && $width > 0 && $height > 0}
		<rect
			x={0}
			y={0}
			width={$width}
			height={$height}
			fill="transparent"
			onmousemove={handleMouseMove}
			onmouseleave={handleMouseLeave}
			onclick={handleClick}
			ondblclick={handleDoubleClick}
			style="cursor: {onclick || ondblclick || barMode ? 'pointer' : 'crosshair'};" />
	{/if}

	{#if hoveredPoint}
		{#if effectiveCrosshair}
			<!-- Vertical crosshair line -->
			<line
				x1={hoveredX}
				x2={hoveredX}
				y1={0}
				y2={$height}
				class="stroke-muted-foreground/50"
				stroke-dasharray="4" />
		{/if}

		{#if effectiveDot}
			<!-- Highlight dot -->
			<circle
				cx={hoveredX}
				cy={hoveredY}
				r={dotRadius}
				class="fill-primary stroke-background"
				stroke-width={2} />
		{/if}

		{#if children}
			{@render children({ point: hoveredPoint, x: hoveredX, y: hoveredY })}
		{/if}
	{/if}
</g>
