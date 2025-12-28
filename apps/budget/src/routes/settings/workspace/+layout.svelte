<script lang="ts">
	import { page } from '$app/state';
	import type { Snippet } from 'svelte';

	let { children }: { children: Snippet } = $props();

	// Determine active tab from URL
	const activeTab = $derived.by(() => {
		const pathname = page.url.pathname;
		if (pathname.includes('/invitations')) return 'invitations';
		if (pathname.includes('/security')) return 'security';
		if (pathname.includes('/general')) return 'general';
		return 'members';
	});

	const tabs = [
		{ id: 'members', label: 'Members', href: '/settings/workspace' },
		{ id: 'invitations', label: 'Invitations', href: '/settings/workspace/invitations' },
		{ id: 'security', label: 'Security', href: '/settings/workspace/security' },
		{ id: 'general', label: 'General', href: '/settings/workspace/general' }
	];
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Workspace</h2>
		<p class="text-muted-foreground text-sm">Manage your workspace members and settings</p>
	</div>

	<!-- Tab navigation -->
	<div class="border-border border-b">
		<nav class="-mb-px flex gap-4">
			{#each tabs as tab}
				<a
					href={tab.href}
					class="border-b-2 px-1 pb-3 text-sm font-medium transition-colors"
					class:border-primary={activeTab === tab.id}
					class:text-foreground={activeTab === tab.id}
					class:border-transparent={activeTab !== tab.id}
					class:text-muted-foreground={activeTab !== tab.id}
					class:hover:border-border={activeTab !== tab.id}
					class:hover:text-foreground={activeTab !== tab.id}
				>
					{tab.label}
				</a>
			{/each}
		</nav>
	</div>

	{@render children?.()}
</div>
