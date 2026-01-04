<script lang="ts">
	import { getContext } from 'svelte';
	import type { Readable } from 'svelte/store';

	interface LayerCakeContext {
		yScale: Readable<any>;
		xRange: Readable<[number, number]>;
	}

	const { yScale, xRange } = getContext<LayerCakeContext>('LayerCake');

	interface Props {
		value: number;
		stroke?: string;
		strokeWidth?: number;
		strokeDasharray?: string;
		label?: string;
		labelPosition?: 'left' | 'right';
		class?: string;
	}

	let {
		value,
		stroke = 'var(--muted-foreground)',
		strokeWidth = 1,
		strokeDasharray = '',
		label,
		labelPosition = 'right',
		class: className = ''
	}: Props = $props();

	const y = $derived($yScale(value));
</script>

<g class={className}>
	<line
		x1={$xRange[0]}
		x2={$xRange[1]}
		y1={y}
		y2={y}
		{stroke}
		stroke-width={strokeWidth}
		stroke-dasharray={strokeDasharray}
	/>
	{#if label}
		<text
			x={labelPosition === 'right' ? $xRange[1] - 4 : $xRange[0] + 4}
			y={y - 4}
			fill={stroke}
			font-size="10"
			text-anchor={labelPosition === 'right' ? 'end' : 'start'}
		>
			{label}
		</text>
	{/if}
</g>
