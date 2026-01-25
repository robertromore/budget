<script lang="ts">
	import * as Tooltip from '$lib/components/ui/tooltip';
	import type { QuickInsightType } from '$lib/hooks/use-payee-insights.svelte';
	// Icons
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tag from '@lucide/svelte/icons/tag';

	interface Props {
		type: QuickInsightType;
		title: string;
		description: string;
		onAction?: () => void;
	}

	let { type, title, description, onAction }: Props = $props();

	// Get icon and colors based on type
	const config = $derived.by(() => {
		switch (type) {
			case 'subscription_detected':
				return {
					icon: Calendar,
					class: 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60'
				};
			case 'category_mismatch':
				return {
					icon: Tag,
					class: 'bg-purple-100 text-purple-700 hover:bg-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:hover:bg-purple-900/60'
				};
			case 'unusual_amount':
				return {
					icon: AlertTriangle,
					class: 'bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/40 dark:text-orange-300 dark:hover:bg-orange-900/60'
				};
			case 'budget_exceeded':
				return {
					icon: DollarSign,
					class: 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60'
				};
			case 'new_payee':
				return {
					icon: Sparkles,
					class: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
				};
			default:
				return {
					icon: Sparkles,
					class: 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
				};
		}
	});

	const Icon = $derived(config.icon);
</script>

<Tooltip.Root>
	<Tooltip.Trigger>
		<button
			type="button"
			class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors {config.class}"
			onclick={onAction}
			disabled={!onAction}
		>
			<Icon class="h-3.5 w-3.5" />
			{title}
		</button>
	</Tooltip.Trigger>
	<Tooltip.Content side="bottom" class="max-w-xs">
		<p class="text-sm">{description}</p>
	</Tooltip.Content>
</Tooltip.Root>
