<script lang="ts">
	import { RadialGauge } from '$lib/components/layercake';
	import * as Tooltip from '$lib/components/ui/tooltip';

	interface ConfidenceFactor {
		name: string;
		score: number;
		description: string;
	}

	interface Props {
		confidence: number; // 0-1
		dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
		transactionCount: number;
		timeSpanMonths: number;
		factors?: ConfidenceFactor[];
	}

	let { confidence, dataQuality, transactionCount, timeSpanMonths, factors = [] }: Props = $props();

	// Ring dimensions
	const size = 120;
	const thickness = 10;

	// Color based on confidence level
	const ringColor = $derived.by(() => {
		if (confidence >= 0.7) return 'var(--green-500, #22c55e)';
		if (confidence >= 0.4) return 'var(--yellow-500, #eab308)';
		return 'var(--red-500, #ef4444)';
	});

	const bgRingColor = $derived.by(() => {
		if (confidence >= 0.7) return 'var(--green-200, #bbf7d0)';
		if (confidence >= 0.4) return 'var(--yellow-200, #fef08a)';
		return 'var(--red-200, #fecaca)';
	});

	// Confidence label
	const confidenceLabel = $derived.by(() => {
		if (confidence >= 0.8) return 'High Confidence';
		if (confidence >= 0.6) return 'Good Confidence';
		if (confidence >= 0.4) return 'Moderate';
		if (confidence >= 0.2) return 'Low Confidence';
		return 'Building...';
	});

	// Data quality colors
	const qualityBadgeClass = $derived.by(() => {
		switch (dataQuality) {
			case 'excellent':
				return 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300';
			case 'good':
				return 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300';
			case 'fair':
				return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300';
			case 'poor':
				return 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
		}
	});
</script>

<div class="flex flex-col items-center gap-4">
	<!-- Ring Chart -->
	<Tooltip.Root>
		<Tooltip.Trigger>
			<div class="relative">
				<svg width={size} height={size}>
					<RadialGauge
						value={confidence}
						{size}
						{thickness}
						fill={ringColor}
						backgroundFill={bgRingColor}
						backgroundOpacity={0.4}
						cornerRadius={thickness / 2}
					/>
				</svg>
				<!-- Center text -->
				<div class="absolute inset-0 flex flex-col items-center justify-center">
					<span class="text-2xl font-bold">{Math.round(confidence * 100)}%</span>
					<span class="text-muted-foreground text-xs">confidence</span>
				</div>
			</div>
		</Tooltip.Trigger>
		<Tooltip.Content side="right" class="max-w-xs">
			<div class="space-y-2">
				<p class="font-medium">Confidence Factors</p>
				{#if factors.length > 0}
					<ul class="space-y-1 text-sm">
						{#each factors as factor (factor.name)}
							<li class="flex items-center justify-between gap-4">
								<span>{factor.name}</span>
								<span class="text-muted-foreground">{Math.round(factor.score * 100)}%</span>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-muted-foreground text-sm">Based on transaction history analysis</p>
				{/if}
			</div>
		</Tooltip.Content>
	</Tooltip.Root>

	<!-- Labels -->
	<div class="text-center">
		<p class="font-medium">{confidenceLabel}</p>
		<div class="mt-2 flex flex-wrap justify-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs {qualityBadgeClass}">
				{dataQuality.charAt(0).toUpperCase() + dataQuality.slice(1)} Data
			</span>
			<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
				{transactionCount} txns
			</span>
			{#if timeSpanMonths > 0}
				<span class="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">
					{timeSpanMonths} mo
				</span>
			{/if}
		</div>
	</div>
</div>
