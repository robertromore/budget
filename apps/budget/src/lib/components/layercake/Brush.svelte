<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { browser } from '$app/environment';

	interface LayerCakeContext {
		xScale: Readable<any>;
		width: Readable<number>;
		height: Readable<number>;
	}

	const { xScale, width, height } = getContext<LayerCakeContext>('LayerCake');

	// Generic type for x-axis values (Date for time scales, number for linear/ordinal scales)
	type XValue = Date | number;

	interface Props {
		/** Callback when brush selection changes (values depend on scale type) */
		onbrush?: (range: { start: XValue; end: XValue } | null) => void;
		/** Callback for quick click (passes x position and inverted scale value) */
		onclick?: (x: number, value: XValue) => void;
		/** Callback for double-click (passes x position and inverted scale value) */
		ondblclick?: (x: number, value: XValue) => void;
		/** Callback for hover position (x coordinate) - allows sharing with Tooltip */
		onhover?: (x: number | null) => void;
		/** Fill color for the brush selection area */
		fill?: string;
		/** Opacity of the brush selection */
		opacity?: number;
		/** Show resize handles on selection */
		showHandles?: boolean;
		/** Minimum selection width in pixels */
		minWidth?: number;
		/** Cursor style for the brush area (crosshair for line charts, pointer for bar charts) */
		cursor?: 'crosshair' | 'pointer' | 'default';
		/** Set to false to let underlying elements receive mouse events (useful for bar charts) */
		captureEvents?: boolean;
		class?: string;
	}

	let {
		onbrush,
		onclick,
		ondblclick,
		onhover,
		fill = 'var(--primary)',
		opacity = 0.2,
		showHandles = true,
		minWidth = 10,
		cursor = 'crosshair',
		captureEvents = true,
		class: className = ''
	}: Props = $props();

	// Reference to the group element to get SVG bounding rect
	let groupElement: SVGGElement;

	// Brush state
	let brushStart = $state<number | null>(null);
	let brushEnd = $state<number | null>(null);
	let isDragging = $state(false);
	let isResizing = $state<'start' | 'end' | null>(null);
	let dragOffset = $state(0);
	let mouseDownTime = $state(0);
	let mouseDownPos = $state({ x: 0, y: 0 });

	// Computed brush bounds
	const brushLeft = $derived(brushStart !== null && brushEnd !== null ? Math.min(brushStart, brushEnd) : null);
	const brushRight = $derived(brushStart !== null && brushEnd !== null ? Math.max(brushStart, brushEnd) : null);
	const brushWidth = $derived(brushLeft !== null && brushRight !== null ? brushRight - brushLeft : 0);
	const hasSelection = $derived(brushWidth >= minWidth);

	function getMouseX(e: MouseEvent): number {
		const svg = groupElement?.closest('svg');
		if (!svg) return 0;
		const rect = svg.getBoundingClientRect();
		return e.clientX - rect.left;
	}

	function handleMouseDown(e: MouseEvent) {
		const x = getMouseX(e);

		// Track mouse down time and position for click detection
		mouseDownTime = Date.now();
		mouseDownPos = { x: e.clientX, y: e.clientY };

		// Check if clicking on existing selection
		if (brushLeft !== null && brushRight !== null) {
			if (Math.abs(x - brushLeft) < 10) {
				isResizing = 'start';
				e.preventDefault();
				return;
			}
			if (Math.abs(x - brushRight) < 10) {
				isResizing = 'end';
				e.preventDefault();
				return;
			}
			if (x >= brushLeft && x <= brushRight) {
				// Drag the selection
				dragOffset = x - brushLeft;
				isDragging = true;
				e.preventDefault();
				return;
			}
		}

		// Start new selection
		brushStart = x;
		brushEnd = x;
		isDragging = true;
		e.preventDefault();
	}

	function handleWindowMouseMove(e: MouseEvent) {
		if (!isDragging && !isResizing) return;

		const x = Math.max(0, Math.min(getMouseX(e), $width));

		if (isResizing === 'start' && brushEnd !== null) {
			brushStart = Math.min(x, brushEnd - minWidth);
		} else if (isResizing === 'end' && brushStart !== null) {
			brushEnd = Math.max(x, brushStart + minWidth);
		} else if (isDragging && brushStart !== null && brushEnd !== null && dragOffset > 0) {
			// Dragging existing selection
			const selectionWidth = brushEnd - brushStart;
			const newStart = Math.max(0, Math.min(x - dragOffset, $width - selectionWidth));
			brushStart = newStart;
			brushEnd = newStart + selectionWidth;
		} else if (isDragging) {
			// Creating new selection
			brushEnd = x;
		}
	}

	function handleWindowMouseUp(e: MouseEvent) {
		if (!isDragging && !isResizing) return;

		// Detect quick clicks (< 200ms and < 5px movement) - these should pass through
		const clickDuration = Date.now() - mouseDownTime;
		const moveDistance = Math.sqrt(
			Math.pow(e.clientX - mouseDownPos.x, 2) + Math.pow(e.clientY - mouseDownPos.y, 2)
		);
		const isQuickClick = clickDuration < 200 && moveDistance < 5;

		if (isQuickClick) {
			// Reset brush state and fire onclick callback with position
			const x = getMouseX(e);
			brushStart = null;
			brushEnd = null;
			isDragging = false;
			isResizing = null;
			dragOffset = 0;

			// Fire onclick with x position and inverted scale value
			if (onclick) {
				if ($xScale.invert) {
					const inverted = $xScale.invert(x);
					onclick(x, inverted);
				} else {
					// For band scales without invert, pass x position as both arguments
					onclick(x, x);
				}
			}
			return;
		}

		if ((isDragging || isResizing) && brushStart !== null && brushEnd !== null) {
			const left = Math.min(brushStart, brushEnd);
			const right = Math.max(brushStart, brushEnd);

			if (right - left >= minWidth) {
				// Normalize brush values
				brushStart = left;
				brushEnd = right;

				// Convert to scale values and notify
				if ($xScale.invert) {
					const startValue = $xScale.invert(left);
					const endValue = $xScale.invert(right);
					onbrush?.({ start: startValue, end: endValue });
				} else {
					// For band scales without invert, pass pixel positions as values
					onbrush?.({ start: left, end: right });
				}
			} else {
				// Selection too small, clear it
				clearSelection();
			}
		}

		isDragging = false;
		isResizing = null;
		dragOffset = 0;
	}

	function clearSelection() {
		brushStart = null;
		brushEnd = null;
		onbrush?.(null);
	}

	function handleDoubleClick(e: MouseEvent) {
		clearSelection();
		// Also fire ondblclick callback if provided
		if (ondblclick) {
			const x = getMouseX(e);
			if ($xScale.invert) {
				const inverted = $xScale.invert(x);
				ondblclick(x, inverted);
			} else {
				// For band scales without invert, pass x position and x as number
				ondblclick(x, x);
			}
		}
	}

	// Use window-level events for mousemove and mouseup so Tooltip can still receive hover events
	onMount(() => {
		if (!browser) return;

		window.addEventListener('mousemove', handleWindowMouseMove);
		window.addEventListener('mouseup', handleWindowMouseUp);

		return () => {
			window.removeEventListener('mousemove', handleWindowMouseMove);
			window.removeEventListener('mouseup', handleWindowMouseUp);
		};
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<g
	class="brush-layer {className}"
	bind:this={groupElement}
	onmousedown={handleMouseDown}
	ondblclick={handleDoubleClick}
>
	<!-- Full area rect for brush initiation - rendered on top so it captures mousedown -->
	<rect
		x={0}
		y={0}
		width={$width}
		height={$height}
		fill="transparent"
		style="cursor: {cursor}; pointer-events: {captureEvents ? 'auto' : 'none'};"
		onmousemove={(e) => {
			const x = getMouseX(e);
			onhover?.(x);
		}}
		onmouseleave={() => onhover?.(null)}
	/>

	<!-- Selection highlight -->
	{#if hasSelection && brushLeft !== null}
		<!-- Main selection area -->
		<rect
			x={brushLeft}
			y={0}
			width={brushWidth}
			height={$height}
			{fill}
			{opacity}
			style="cursor: move;"
		/>

		<!-- Selection border -->
		<rect
			x={brushLeft}
			y={0}
			width={brushWidth}
			height={$height}
			fill="none"
			stroke={fill}
			stroke-opacity={0.5}
			stroke-width={1}
		/>

		{#if showHandles}
			<!-- Left handle -->
			<rect
				x={brushLeft - 3}
				y={$height / 2 - 20}
				width={6}
				height={40}
				rx={3}
				fill={fill}
				fill-opacity={0.8}
				style="cursor: ew-resize;"
			/>

			<!-- Right handle -->
			<rect
				x={brushRight! - 3}
				y={$height / 2 - 20}
				width={6}
				height={40}
				rx={3}
				fill={fill}
				fill-opacity={0.8}
				style="cursor: ew-resize;"
			/>
		{/if}
	{/if}

	<!-- Active dragging indicator -->
	{#if isDragging && brushStart !== null && brushEnd !== null && !hasSelection}
		<rect
			x={Math.min(brushStart, brushEnd)}
			y={0}
			width={Math.abs(brushEnd - brushStart)}
			height={$height}
			{fill}
			opacity={opacity * 0.5}
		/>
	{/if}
</g>
