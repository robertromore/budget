<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { headerActionsMode } from '$lib/stores/header-actions.svelte';
	import { getPageActionsContext } from '$lib/stores/page-actions.svelte';

	const pageActions = getPageActionsContext();

	const filteredActions = $derived.by(() => {
		if (!pageActions) return [];
		const mode = headerActionsMode.value;

		if (mode === 'off') return [];
		if (mode === 'all') return pageActions.actions;
		// 'secondary' - only non-primary actions
		return pageActions.actions.filter((a) => !a.isPrimary);
	});

	const hasActions = $derived(filteredActions.length > 0);
	const showLabels = $derived(headerActionsMode.displayMode === 'icon-text');
</script>

{#if hasActions}
	<Separator orientation="vertical" class="h-6" />
	<div class="flex items-center gap-2" data-help-id="header-page-actions" data-help-title="Page Actions">
		{#each filteredActions as action (action.id)}
			{#if showLabels}
				<Button
					variant={action.variant ?? 'outline'}
					size="sm"
					href={action.href}
					onclick={action.onclick}
				>
					{#if action.icon}
						<action.icon class="mr-2 h-4 w-4" />
					{/if}
					{action.label}
				</Button>
			{:else}
				<Tooltip.Root>
					<Tooltip.Trigger>
						{#snippet child({ props })}
							<Button
								{...props}
								variant={action.variant ?? 'outline'}
								size="icon"
								href={action.href}
								onclick={action.onclick}
								class="h-8 w-8"
							>
								{#if action.icon}
									<action.icon class="h-4 w-4" />
								{/if}
							</Button>
						{/snippet}
					</Tooltip.Trigger>
					<Tooltip.Content>
						<p>{action.label}</p>
					</Tooltip.Content>
				</Tooltip.Root>
			{/if}
		{/each}
	</div>
{/if}
