<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import type { Readable } from 'svelte/store';
	import { forceSimulation, forceX, forceY, forceCollide } from 'd3-force';

	interface LayerCakeContext {
		data: Readable<any[]>;
		xGet: Readable<(d: any) => number>;
		yGet: Readable<(d: any) => number>;
		height: Readable<number>;
	}

	const { data, xGet, yGet, height } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		radius?: number;
		fill?: string | ((d: any) => string);
		stroke?: string | ((d: any) => string);
		strokeWidth?: number;
		opacity?: number | ((d: any) => number);
		hoverOpacity?: number;
		strength?: number;
		iterations?: number;
		/** Click callback */
		onclick?: (d: any, event: MouseEvent) => void;
		/** Hover callback */
		onhover?: (d: any | null) => void;
		class?: string;
	}

	let {
		radius = 5,
		fill = 'var(--primary)',
		stroke = 'var(--background)',
		strokeWidth = 1,
		opacity = 1,
		hoverOpacity = 1,
		strength = 0.5,
		iterations = 100,
		onclick,
		onhover,
		class: className = ''
	}: Props = $props();

	let hoveredIndex = $state<number | null>(null);

	// Helper to get fill color for a data point
	function getFill(d: any): string {
		if (typeof fill === 'function') {
			return fill(d);
		}
		return fill;
	}

	// Helper to get stroke color for a data point
	function getStroke(d: any): string {
		if (typeof stroke === 'function') {
			return stroke(d);
		}
		return stroke;
	}

	// Helper to get opacity for a data point
	function getOpacity(d: any): number {
		if (typeof opacity === 'function') {
			return opacity(d);
		}
		return opacity;
	}

	interface SimNode {
		data: any;
		x: number;
		y: number;
		targetX: number;
		targetY: number;
	}

	let simulatedNodes = $state<SimNode[]>([]);

	// Run force simulation when data changes
	$effect(() => {
		if ($data.length === 0) {
			simulatedNodes = [];
			return;
		}

		// Create nodes with initial positions from scale
		const nodes: SimNode[] = $data.map((d) => ({
			data: d,
			x: $xGet(d),
			y: $height / 2, // Start at vertical center
			targetX: $xGet(d),
			targetY: $height / 2
		}));

		// Run force simulation
		const simulation = forceSimulation(nodes)
			.force('x', forceX<SimNode>((d) => d.targetX).strength(strength))
			.force('y', forceY<SimNode>($height / 2).strength(0.1))
			.force('collide', forceCollide<SimNode>(radius + 1))
			.stop();

		// Run simulation synchronously
		for (let i = 0; i < iterations; i++) {
			simulation.tick();
		}

		// Clamp y positions to stay within bounds
		nodes.forEach((node) => {
			node.y = Math.max(radius, Math.min($height - radius, node.y));
		});

		simulatedNodes = nodes;
	});
</script>

<g class="beeswarm {className}">
	{#each simulatedNodes as node, i}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<circle
			cx={node.x}
			cy={node.y}
			r={hoveredIndex === i ? radius + 2 : radius}
			fill={getFill(node.data)}
			stroke={getStroke(node.data)}
			stroke-width={hoveredIndex === i ? strokeWidth + 1 : strokeWidth}
			opacity={hoveredIndex === i ? hoverOpacity : getOpacity(node.data)}
			style={onclick || onhover ? 'cursor: pointer;' : ''}
			onclick={(e) => onclick?.(node.data, e)}
			onmouseenter={() => {
				hoveredIndex = i;
				onhover?.(node.data);
			}}
			onmouseleave={() => {
				hoveredIndex = null;
				onhover?.(null);
			}}
		/>
	{/each}
</g>
