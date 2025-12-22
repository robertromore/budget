<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import ArrowLeft from '@lucide/svelte/icons/arrow-left';
	import Brain from '@lucide/svelte/icons/brain';
	import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
	import Monitor from '@lucide/svelte/icons/monitor';
	import Palette from '@lucide/svelte/icons/palette';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Settings navigation items
	const settingsNav = [
		{
			title: 'General',
			items: [
				{ href: '/settings', label: 'Appearance', icon: Palette },
				{ href: '/settings/display', label: 'Display', icon: Monitor }
			]
		},
		{
			title: 'Data',
			items: [{ href: '/settings/import-profiles', label: 'Import Profiles', icon: FileSpreadsheet }]
		},
		{
			title: 'Intelligence',
			items: [
				{ href: '/settings/intelligence', label: 'ML Settings', icon: Brain },
				{ href: '/settings/intelligence/llm', label: 'LLM Providers', icon: Sparkles }
			]
		},
		{
			title: 'Advanced',
			items: [{ href: '/settings/advanced', label: 'Data Management', icon: TriangleAlert }]
		}
	];

	// Check if current path matches the nav item (exact match only)
	function isActive(href: string): boolean {
		return page.url.pathname === href;
	}
</script>

<div class="container mx-auto py-8">
	<!-- Header with back button -->
	<div class="mb-6 flex items-center gap-4">
		<Button variant="ghost" size="icon" href="/">
			<ArrowLeft class="h-4 w-4" />
		</Button>
		<div>
			<h1 class="text-2xl font-bold">Settings</h1>
			<p class="text-muted-foreground text-sm">Manage your app preferences</p>
		</div>
	</div>

	<div class="flex gap-8">
		<!-- Settings Sidebar -->
		<aside class="w-56 shrink-0">
			<nav class="space-y-6">
				{#each settingsNav as group}
					<div>
						<h3 class="text-muted-foreground mb-2 px-3 text-xs font-semibold uppercase tracking-wider">
							{group.title}
						</h3>
						<ul class="space-y-1">
							{#each group.items as item}
								{@const Icon = item.icon}
								{@const active = isActive(item.href)}
								<li>
									<a
										href={item.href}
										class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors"
										class:bg-accent={active}
										class:text-accent-foreground={active}
										class:hover:bg-muted={!active}
										class:text-muted-foreground={!active}>
										<Icon class="h-4 w-4" />
										{item.label}
									</a>
								</li>
							{/each}
						</ul>
					</div>
				{/each}
			</nav>
		</aside>

		<Separator orientation="vertical" class="h-auto" />

		<!-- Main Content -->
		<main class="min-w-0 flex-1">
			{@render children?.()}
		</main>
	</div>
</div>
