<script lang="ts">
	import {Button} from '$lib/components/ui/button';
	import * as Empty from '$lib/components/ui/empty';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import {
		Plus,
		Settings,
		Sparkles,
		LoaderCircle,
		FolderTree,
	} from '@lucide/svelte/icons';
	import {CategoryGroupCard, RecommendationsPanel, SettingsDialog} from '$lib/components/category-groups';
	import ManageCategoryGroupForm from '$lib/components/forms/manage-category-group-form.svelte';
	import {deleteCategoryGroup} from '$lib/query/category-groups';
	import {rpc} from '$lib/query';
	import type {CategoryGroupWithCounts} from '$lib/schema/category-groups';
	import {goto} from '$app/navigation';

	// Query for category groups
	const groupsQuery = rpc.categoryGroups.listCategoryGroups().options();
	const groups = $derived(groupsQuery.data ?? []);
	const isLoading = $derived(groupsQuery.isLoading);
	const hasNoGroups = $derived(groups.length === 0);

	// Mutations
	const deleteMutation = deleteCategoryGroup.options();

	// UI State
	let createSheetOpen = $state(false);
	let editSheetOpen = $state(false);
	let recommendationsSheetOpen = $state(false);
	let settingsDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let selectedGroup = $state<CategoryGroupWithCounts | null>(null);

	// Handlers
	function handleCreateNew() {
		selectedGroup = null;
		createSheetOpen = true;
	}

	function handleEdit(group: CategoryGroupWithCounts) {
		selectedGroup = group;
		editSheetOpen = true;
	}

	function handleDelete(group: CategoryGroupWithCounts) {
		selectedGroup = group;
		deleteDialogOpen = true;
	}

	function confirmDelete() {
		if (selectedGroup) {
			deleteMutation.mutate(selectedGroup.id, {
				onSuccess: () => {
					deleteDialogOpen = false;
					selectedGroup = null;
				},
			});
		}
	}

	function handleManageCategories(group: CategoryGroupWithCounts) {
		goto(`/category-groups/${group.slug}`);
	}

	function handleSaveNew() {
		createSheetOpen = false;
		selectedGroup = null;
	}

	async function handleSaveEdit() {
		editSheetOpen = false;
		selectedGroup = null;
		await groupsQuery.refetch();
	}
</script>

<svelte:head>
	<title>Category Groups</title>
</svelte:head>

<div class="flex flex-col gap-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Category Groups</h1>
			<p class="text-muted-foreground">
				Organize your categories into logical groups for better insights
			</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={() => (recommendationsSheetOpen = true)}>
				<Sparkles class="mr-2 h-4 w-4" />
				Suggestions
			</Button>
			<Button variant="outline" size="icon" onclick={() => (settingsDialogOpen = true)}>
				<Settings class="h-4 w-4" />
			</Button>
			<Button onclick={handleCreateNew}>
				<Plus class="mr-2 h-4 w-4" />
				New Group
			</Button>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-16">
			<LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
		</div>

		<!-- Empty State -->
	{:else if hasNoGroups}
		<Empty.Empty>
			<Empty.EmptyMedia variant="icon">
				<FolderTree class="size-6" />
			</Empty.EmptyMedia>
			<Empty.EmptyHeader>
				<Empty.EmptyTitle>No Category Groups Yet</Empty.EmptyTitle>
				<Empty.EmptyDescription>
					Get started by creating your first category group to organize your categories.
				</Empty.EmptyDescription>
			</Empty.EmptyHeader>
			<Empty.EmptyContent>
				<Button onclick={handleCreateNew}>
					<Plus class="mr-2 h-4 w-4" />
					Create Your First Group
				</Button>
			</Empty.EmptyContent>
		</Empty.Empty>

		<!-- Groups Grid -->
	{:else}
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
			{#each groups as group (group.id)}
				<CategoryGroupCard
					{group}
					onEdit={handleEdit}
					onDelete={handleDelete}
					onManageCategories={handleManageCategories}
				/>
			{/each}
		</div>
	{/if}
</div>

<!-- Create Group Sheet -->
<ResponsiveSheet bind:open={createSheetOpen}>
	{#snippet header()}
		<Sheet.Title>Create Category Group</Sheet.Title>
		<Sheet.Description>
			Create a new group to organize related categories together.
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<ManageCategoryGroupForm onSave={handleSaveNew} />
	{/snippet}
</ResponsiveSheet>

<!-- Edit Group Sheet -->
<ResponsiveSheet bind:open={editSheetOpen}>
	{#snippet header()}
		<Sheet.Title>Edit Category Group</Sheet.Title>
		<Sheet.Description>
			Update the details for this category group.
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		{#if selectedGroup}
			<ManageCategoryGroupForm
				id={selectedGroup.id}
				initialData={selectedGroup}
				onSave={handleSaveEdit}
			/>
		{/if}
	{/snippet}
</ResponsiveSheet>

<!-- Recommendations Sheet -->
<ResponsiveSheet bind:open={recommendationsSheetOpen}>
	{#snippet header()}
		<Sheet.Title>Grouping Suggestions</Sheet.Title>
		<Sheet.Description>
			AI-powered recommendations for organizing your categories.
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<RecommendationsPanel />
	{/snippet}
</ResponsiveSheet>

<!-- Settings Dialog -->
<SettingsDialog bind:open={settingsDialogOpen} />

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Category Group?</AlertDialog.Title>
			<AlertDialog.Description>
				{#if selectedGroup}
					Are you sure you want to delete "{selectedGroup.name}"? This will unassign all
					categories from this group, but the categories themselves will not be deleted.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive hover:bg-destructive/90"
				onclick={confirmDelete}
				disabled={deleteMutation.isPending}
			>
				{#if deleteMutation.isPending}
					Deleting...
				{:else}
					Delete Group
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
