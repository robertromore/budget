<script lang="ts">
import {Button} from '$lib/components/ui/button';
import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
import * as Sheet from '$lib/components/ui/sheet';
import * as Tabs from '$lib/components/ui/tabs';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import * as Card from '$lib/components/ui/card';
import {Badge} from '$lib/components/ui/badge';
import {
	Plus,
	Pencil,
	Trash2,
	FolderOpen,
	LoaderCircle,
	Sparkles,
	List,
	X,
	Tag,
} from '@lucide/svelte/icons';
import ManageCategoryGroupForm from '$lib/components/forms/manage-category-group-form.svelte';
import {RecommendationsPanel} from '$lib/components/category-groups';
import {deleteCategoryGroup, removeCategoryFromGroup} from '$lib/query/category-groups';
import {rpc} from '$lib/query';
import type {CategoryGroupWithCounts} from '$lib/schema/category-groups';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';

interface Props {
	open: boolean;
}

let {open = $bindable()}: Props = $props();

// Query for category groups
const groupsQuery = rpc.categoryGroups.listCategoryGroups().options();
const groups = $derived(groupsQuery.data ?? []);
const isLoading = $derived(groupsQuery.isLoading);

// Query for categories with their group assignments
const categoriesQuery = rpc.categories.listCategoriesWithGroups().options();
const categories = $derived(categoriesQuery.data ?? []);
const isCategoriesLoading = $derived(categoriesQuery.isLoading);

// Mutations
const deleteMutation = deleteCategoryGroup.options();
const removeCategoryMutation = removeCategoryFromGroup.options();

// UI State
let activeTab = $state('manage');
let deleteDialogOpen = $state(false);
let selectedGroup = $state<CategoryGroupWithCounts | null>(null);
let isCreatingNew = $state(false);
let isEditingGroup = $state(false);

// Handlers
function handleCreateNew() {
	selectedGroup = null;
	isCreatingNew = true;
	isEditingGroup = false;
	activeTab = 'create';
}

function handleEdit(group: CategoryGroupWithCounts) {
	selectedGroup = group;
	isCreatingNew = false;
	isEditingGroup = true;
	activeTab = 'create';
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

function handleSave() {
	// Reset state and go back to manage tab
	selectedGroup = null;
	isCreatingNew = false;
	isEditingGroup = false;
	activeTab = 'manage';
}

function handleCancelEdit() {
	selectedGroup = null;
	isCreatingNew = false;
	isEditingGroup = false;
	activeTab = 'manage';
}

function handleRemoveCategory(categoryId: number) {
	removeCategoryMutation.mutate({categoryId});
}

// Group categories by their assigned group
const groupedCategories = $derived.by(() => {
	const grouped = new Map<string, typeof categories>();

	for (const category of categories) {
		const groupKey = category.groupId
			? `group-${category.groupId}`
			: 'ungrouped';

		if (!grouped.has(groupKey)) {
			grouped.set(groupKey, []);
		}
		grouped.get(groupKey)!.push(category);
	}

	return grouped;
});
</script>

<ResponsiveSheet bind:open>
	{#snippet header()}
		<Sheet.Title>Category Groups</Sheet.Title>
		<Sheet.Description>
			Create, manage, and get AI-powered suggestions for organizing your categories.
		</Sheet.Description>
	{/snippet}

	{#snippet content()}
		<Tabs.Root bind:value={activeTab} class="w-full">
			<Tabs.List class="grid w-full grid-cols-3">
				<Tabs.Trigger value="manage">
					<List class="mr-2 h-4 w-4" />
					Manage
				</Tabs.Trigger>
				<Tabs.Trigger value="create">
					<Plus class="mr-2 h-4 w-4" />
					{isEditingGroup ? 'Edit' : 'Create'}
				</Tabs.Trigger>
				<Tabs.Trigger value="suggestions">
					<Sparkles class="mr-2 h-4 w-4" />
					Suggestions
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Manage Tab -->
			<Tabs.Content value="manage" class="space-y-4 mt-4">
				<!-- Create Button -->
				<Button onclick={handleCreateNew} class="w-full">
					<Plus class="mr-2 h-4 w-4" />
					Create New Group
				</Button>

				<!-- Loading State -->
				{#if isCategoriesLoading}
					<div class="flex items-center justify-center py-8">
						<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
					</div>

				<!-- Categories Grouped by Group -->
				{:else if categories.length > 0}
					{@const ungroupedCategories = groupedCategories.get('ungrouped') ?? []}
					<div class="space-y-4">
						<!-- Iterate through each group -->
						{#each groups as group (group.id)}
							{@const groupKey = `group-${group.id}`}
							{@const groupCategories = groupedCategories.get(groupKey) ?? []}
							{#if groupCategories.length > 0}
								{@const iconData = group.groupIcon ? getIconByName(group.groupIcon) : null}
								{@const GroupIcon = iconData?.icon ?? FolderOpen}

								<div class="rounded-lg border bg-card">
									<!-- Group Header -->
									<div class="border-b bg-muted/30 px-4 py-3">
										<div class="flex items-center justify-between gap-4">
											<div class="flex items-center gap-3">
												<div
													class="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
													style="background-color: {group.groupColor}20; border: 1px solid {group.groupColor}"
												>
													<GroupIcon class="h-4 w-4" style="color: {group.groupColor}" />
												</div>
												<div>
													<h3 class="font-semibold text-sm">{group.name}</h3>
													<span class="text-xs text-muted-foreground">
														{groupCategories.length} {groupCategories.length === 1 ? 'category' : 'categories'}
													</span>
												</div>
											</div>
											<div class="flex items-center gap-1 shrink-0">
												<Button
													variant="ghost"
													size="icon"
													class="h-7 w-7"
													onclick={() => handleEdit(group)}
												>
													<Pencil class="h-3.5 w-3.5" />
												</Button>
												<Button
													variant="ghost"
													size="icon"
													class="h-7 w-7"
													onclick={() => handleDelete(group)}
												>
													<Trash2 class="h-3.5 w-3.5 text-destructive" />
												</Button>
											</div>
										</div>
									</div>

									<!-- Category List -->
									<div class="divide-y">
										{#each groupCategories as category (category.id)}
											{@const catIconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
											{@const CategoryIcon = catIconData?.icon ?? Tag}
											<div class="p-3 hover:bg-muted/50 transition-colors">
												<div class="flex items-center justify-between gap-3">
													<div class="flex items-center gap-3 flex-1 min-w-0">
														<CategoryIcon class="h-5 w-5 text-muted-foreground shrink-0" />
														<div class="min-w-0 flex-1">
															<p class="font-medium text-sm truncate">{category.name}</p>
															{#if category.notes}
																<p class="text-xs text-muted-foreground line-clamp-1">
																	{category.notes}
																</p>
															{/if}
														</div>
													</div>
													<Button
														size="icon"
														variant="ghost"
														class="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
														title="Remove from group"
														onclick={() => handleRemoveCategory(category.id)}
														disabled={removeCategoryMutation.isPending}
													>
														<X class="h-3.5 w-3.5" />
													</Button>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{/if}
						{/each}

						<!-- Ungrouped Categories -->
						{#if ungroupedCategories.length > 0}
							<div class="rounded-lg border bg-card">
								<!-- Ungrouped Header -->
								<div class="border-b bg-muted/30 px-4 py-3">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-lg bg-muted shrink-0">
											<FolderOpen class="h-4 w-4 text-muted-foreground" />
										</div>
										<div>
											<h3 class="font-semibold text-sm">Ungrouped</h3>
											<span class="text-xs text-muted-foreground">
												{ungroupedCategories.length} {ungroupedCategories.length === 1 ? 'category' : 'categories'}
											</span>
										</div>
									</div>
								</div>

								<!-- Ungrouped Category List -->
								<div class="divide-y">
									{#each ungroupedCategories as category (category.id)}
										{@const catIconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
										{@const CategoryIcon = catIconData?.icon ?? Tag}
										<div class="p-3 hover:bg-muted/50 transition-colors">
											<div class="flex items-center gap-3">
												<CategoryIcon class="h-5 w-5 text-muted-foreground shrink-0" />
												<div class="min-w-0 flex-1">
													<p class="font-medium text-sm truncate">{category.name}</p>
													{#if category.notes}
														<p class="text-xs text-muted-foreground line-clamp-1">
															{category.notes}
														</p>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							</div>
						{/if}
					</div>

				<!-- Empty State -->
				{:else}
					<div class="text-center py-8 text-muted-foreground">
						<FolderOpen class="h-12 w-12 mx-auto mb-2 opacity-50" />
						<p>No categories yet.</p>
					</div>
				{/if}
			</Tabs.Content>

			<!-- Create/Edit Tab -->
			<Tabs.Content value="create" class="space-y-4 mt-4">
				{#if isEditingGroup && selectedGroup}
					<ManageCategoryGroupForm
						id={selectedGroup.id}
						initialData={selectedGroup}
						onSave={handleSave}
					/>
					<Button variant="outline" onclick={handleCancelEdit} class="w-full">
						Cancel
					</Button>
				{:else}
					<ManageCategoryGroupForm onSave={handleSave} />
					<Button variant="outline" onclick={handleCancelEdit} class="w-full">
						Cancel
					</Button>
				{/if}
			</Tabs.Content>

			<!-- Suggestions Tab -->
			<Tabs.Content value="suggestions" class="mt-4">
				<RecommendationsPanel />
			</Tabs.Content>
		</Tabs.Root>
	{/snippet}
</ResponsiveSheet>

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
