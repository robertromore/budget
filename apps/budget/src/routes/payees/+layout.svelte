<script lang="ts">
	import { usePageActions } from '$lib/hooks';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import FolderCog from '@lucide/svelte/icons/folder-cog';
	import Plus from '@lucide/svelte/icons/plus';

	let { children } = $props();

	// Register page actions for header - these persist across all payees routes
	usePageActions([
		{
			id: 'manage-categories',
			label: 'Manage Categories',
			icon: FolderCog,
			href: '/payees/categories',
			variant: 'outline',
			isPrimary: false
		},
		{
			id: 'analytics',
			label: 'Analytics',
			icon: BarChart3,
			href: '/payees/analytics',
			variant: 'outline',
			isPrimary: false
		},
		{
			id: 'add-payee',
			label: 'Add Payee',
			icon: Plus,
			href: '/payees/new',
			variant: 'default',
			isPrimary: true
		}
	]);
</script>

{@render children()}
