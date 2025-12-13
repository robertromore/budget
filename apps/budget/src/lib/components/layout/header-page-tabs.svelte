<script lang="ts">
	import { Separator } from '$lib/components/ui/separator';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { headerActionsMode } from '$lib/stores/header-actions.svelte';
	import { getPageTabsContext } from '$lib/stores/page-tabs.svelte';

	const pageTabs = getPageTabsContext();

	const showTabs = $derived(headerActionsMode.tabsMode === 'on' && pageTabs?.config);
	const visibleTabs = $derived(
		pageTabs?.config?.tabs.filter((tab) => tab.condition !== false) ?? []
	);
	const isIconOnly = $derived(headerActionsMode.tabsDisplayMode === 'icon-only');
</script>

{#if showTabs && visibleTabs.length > 0 && pageTabs?.config}
	{@const config = pageTabs.config}
	<Separator orientation="vertical" class="h-6" />
	<Tabs.Root
		value={config.activeTab}
		onValueChange={(value) => config.onTabChange(value ?? '')}
		class="header-tabs"
	>
		<Tabs.List class="h-8 gap-1 bg-transparent p-0">
			{#each visibleTabs as tab (tab.id)}
				{#if isIconOnly && tab.icon}
					<Tooltip.Root>
						<Tooltip.Trigger>
							{#snippet child({ props })}
								<Tabs.Trigger
									{...props}
									value={tab.id}
									class="h-8 w-8 px-0 text-sm data-[state=active]:bg-muted"
								>
									<tab.icon class="h-4 w-4" />
								</Tabs.Trigger>
							{/snippet}
						</Tooltip.Trigger>
						<Tooltip.Content>
							<p>{tab.label}</p>
						</Tooltip.Content>
					</Tooltip.Root>
				{:else}
					<Tabs.Trigger
						value={tab.id}
						class="h-8 px-3 text-sm data-[state=active]:bg-muted"
					>
						{#if tab.icon}
							<tab.icon class="mr-2 h-4 w-4" />
						{/if}
						{tab.label}
					</Tabs.Trigger>
				{/if}
			{/each}
		</Tabs.List>
	</Tabs.Root>
{/if}
