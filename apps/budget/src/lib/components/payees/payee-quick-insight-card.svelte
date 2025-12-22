<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import type { QuickInsightType } from '$lib/hooks/use-payee-insights.svelte';
// Icons
	import AlertTriangle from '@lucide/svelte/icons/alert-triangle';
	import Calendar from '@lucide/svelte/icons/calendar';
	import DollarSign from '@lucide/svelte/icons/dollar-sign';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import Tag from '@lucide/svelte/icons/tag';
	import X from '@lucide/svelte/icons/x';

	interface Props {
		type: QuickInsightType;
		title: string;
		description: string;
		priority: 'high' | 'medium' | 'low';
		actionLabel?: string;
		onAction?: () => void;
		onDismiss?: () => void;
	}

	let {
		type,
		title,
		description,
		priority,
		actionLabel,
		onAction,
		onDismiss,
	}: Props = $props();

	// Get icon and colors based on type
	const config = $derived(() => {
		switch (type) {
			case 'subscription_detected':
				return {
					icon: Calendar,
					borderClass: 'border-blue-200 dark:border-blue-900',
					bgClass: 'bg-blue-50/50 dark:bg-blue-950/20',
					iconClass: 'text-blue-500',
				};
			case 'category_mismatch':
				return {
					icon: Tag,
					borderClass: 'border-purple-200 dark:border-purple-900',
					bgClass: 'bg-purple-50/50 dark:bg-purple-950/20',
					iconClass: 'text-purple-500',
				};
			case 'unusual_amount':
				return {
					icon: AlertTriangle,
					borderClass: 'border-orange-200 dark:border-orange-900',
					bgClass: 'bg-orange-50/50 dark:bg-orange-950/20',
					iconClass: 'text-orange-500',
				};
			case 'budget_exceeded':
				return {
					icon: DollarSign,
					borderClass: 'border-red-200 dark:border-red-900',
					bgClass: 'bg-red-50/50 dark:bg-red-950/20',
					iconClass: 'text-red-500',
				};
			case 'new_payee':
				return {
					icon: Sparkles,
					borderClass: 'border-gray-200 dark:border-gray-800',
					bgClass: 'bg-gray-50/50 dark:bg-gray-950/20',
					iconClass: 'text-gray-500',
				};
			default:
				return {
					icon: Sparkles,
					borderClass: 'border-gray-200 dark:border-gray-800',
					bgClass: 'bg-gray-50/50 dark:bg-gray-950/20',
					iconClass: 'text-gray-500',
				};
		}
	});

	// Priority indicator
	const priorityDot = $derived(() => {
		switch (priority) {
			case 'high':
				return 'bg-red-500';
			case 'medium':
				return 'bg-yellow-500';
			case 'low':
				return 'bg-green-500';
		}
	});

	const Icon = $derived(config().icon);
</script>

<div
	class="relative rounded-lg border p-4 {config().borderClass} {config().bgClass}"
>
	{#if onDismiss}
		<button
			onclick={onDismiss}
			class="text-muted-foreground hover:text-foreground absolute right-2 top-2"
			aria-label="Dismiss"
		>
			<X class="h-4 w-4" />
		</button>
	{/if}

	<div class="flex items-start gap-3">
		<div class="mt-0.5">
			<Icon class="h-5 w-5 {config().iconClass}" />
		</div>
		<div class="flex-1 space-y-2">
			<div class="flex items-center gap-2">
				<span class="h-2 w-2 rounded-full {priorityDot()}"></span>
				<h4 class="font-medium">{title}</h4>
			</div>
			<p class="text-muted-foreground text-sm">{description}</p>
			{#if actionLabel && onAction}
				<Button variant="outline" size="sm" onclick={onAction} class="mt-2">
					{actionLabel}
				</Button>
			{/if}
		</div>
	</div>
</div>
