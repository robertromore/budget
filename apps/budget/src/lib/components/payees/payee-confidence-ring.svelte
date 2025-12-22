<script lang="ts">
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
	const strokeWidth = 10;
	const radius = (size - strokeWidth) / 2;
	const circumference = 2 * Math.PI * radius;

	// Calculate stroke offset based on confidence
	const offset = $derived(circumference - confidence * circumference);

	// Color based on confidence level
	const ringColor = $derived(() => {
		if (confidence >= 0.7) return 'stroke-green-500';
		if (confidence >= 0.4) return 'stroke-yellow-500';
		return 'stroke-red-500';
	});

	const bgRingColor = $derived(() => {
		if (confidence >= 0.7) return 'stroke-green-100 dark:stroke-green-950';
		if (confidence >= 0.4) return 'stroke-yellow-100 dark:stroke-yellow-950';
		return 'stroke-red-100 dark:stroke-red-950';
	});

	// Confidence label
	const confidenceLabel = $derived(() => {
		if (confidence >= 0.8) return 'High Confidence';
		if (confidence >= 0.6) return 'Good Confidence';
		if (confidence >= 0.4) return 'Moderate';
		if (confidence >= 0.2) return 'Low Confidence';
		return 'Building...';
	});

	// Data quality colors
	const qualityBadgeClass = $derived(() => {
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
				<svg width={size} height={size} class="-rotate-90">
					<!-- Background ring -->
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke-width={strokeWidth}
						class={bgRingColor()}
					/>
					<!-- Confidence ring -->
					<circle
						cx={size / 2}
						cy={size / 2}
						r={radius}
						fill="none"
						stroke-width={strokeWidth}
						stroke-linecap="round"
						stroke-dasharray={circumference}
						stroke-dashoffset={offset}
						class="transition-all duration-500 ease-out {ringColor()}"
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
						{#each factors as factor}
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
		<p class="font-medium">{confidenceLabel()}</p>
		<div class="mt-2 flex flex-wrap justify-center gap-2">
			<span class="rounded-full px-2 py-0.5 text-xs {qualityBadgeClass()}">
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
