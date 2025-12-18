<script lang="ts">
	import Plus from '@lucide/svelte/icons/plus';
	import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
	import FolderCog from '@lucide/svelte/icons/folder-cog';
	import PackagePlus from '@lucide/svelte/icons/package-plus';
	import { usePageActions } from '$lib/hooks';
	import SeedDefaultCategoriesButton from './(components)/seed-default-categories-button.svelte';
	import GroupManagementSheet from './(components)/group-management-sheet.svelte';
	import { setContext } from 'svelte';

	let { children } = $props();

	// Sheet states - shared with child pages via context
	let groupManagementSheetOpen = $state(false);
	let seedDefaultCategoriesSheetOpen = $state(false);

	// Expose sheet controls via context for child pages
	setContext('categories-sheets', {
		openGroupManagement: () => (groupManagementSheetOpen = true),
		openSeedDefaultCategories: () => (seedDefaultCategoriesSheetOpen = true)
	});

	// Register page actions for header - these persist across all categories routes
	usePageActions([
		{
			id: 'seed-default-categories',
			label: 'Add Default Categories',
			icon: PackagePlus,
			onclick: () => (seedDefaultCategoriesSheetOpen = true),
			variant: 'outline',
			isPrimary: false
		},
		{
			id: 'group-management',
			label: 'Group Management',
			icon: FolderCog,
			onclick: () => (groupManagementSheetOpen = true),
			variant: 'outline',
			isPrimary: false
		},
		{
			id: 'analytics',
			label: 'Analytics',
			icon: BarChart3,
			href: '/categories/analytics',
			variant: 'outline',
			isPrimary: false
		},
		{
			id: 'add-category',
			label: 'Add Category',
			icon: Plus,
			href: '/categories/new',
			variant: 'default',
			isPrimary: true
		}
	]);
</script>

{@render children()}

<!-- Shared sheets for all categories routes -->
<SeedDefaultCategoriesButton bind:open={seedDefaultCategoriesSheetOpen} showButton={false} />
<GroupManagementSheet bind:open={groupManagementSheetOpen} />
