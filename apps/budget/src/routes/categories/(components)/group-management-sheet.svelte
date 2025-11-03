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
	GripVertical,
} from '@lucide/svelte/icons';
import ManageCategoryGroupForm from '$lib/components/forms/manage-category-group-form.svelte';
import {RecommendationsPanel} from '$lib/components/category-groups';
import {deleteCategoryGroup, removeCategoryFromGroup, moveCategoryToGroup} from '$lib/query/category-groups';
import {rpc} from '$lib/query';
import type {CategoryGroupWithCounts} from '$lib/schema/category-groups';
import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';
import type {Category} from '$lib/schema/categories';

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
const moveMutation = moveCategoryToGroup.options();

// UI State
let activeTab = $state('manage');
let deleteDialogOpen = $state(false);
let selectedGroup = $state<CategoryGroupWithCounts | null>(null);
let isCreatingNew = $state(false);
let isEditingGroup = $state(false);

// Drag and Drop State
let draggedCategory = $state<(Category & {groupId: number | null}) | null>(null);
let dragOverGroupId = $state<number | null>(null);
let isDragging = $state(false);

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
	// Refetch to ensure the list is up to date
	groupsQuery.refetch();
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

// Drag and Drop Handlers
function handleDragStart(event: DragEvent, category: Category & {groupId: number | null}) {
	draggedCategory = category;
	isDragging = true;
	if (event.dataTransfer) {
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/plain', category.id.toString());

		// Create a custom drag image from the entire category row
		const target = event.target as HTMLElement;
		const categoryRow = target.closest('.category-row') as HTMLElement;
		if (categoryRow) {
			const clone = categoryRow.cloneNode(true) as HTMLElement;
			clone.style.position = 'absolute';
			clone.style.top = '-9999px';
			clone.style.width = categoryRow.offsetWidth + 'px';
			clone.style.backgroundColor = 'white';
			clone.style.border = '1px solid #e5e7eb';
			clone.style.borderRadius = '0.5rem';
			clone.style.opacity = '0.9';
			document.body.appendChild(clone);

			// Set the drag image
			event.dataTransfer.setDragImage(clone, 0, 0);

			// Remove the clone after a brief delay
			setTimeout(() => document.body.removeChild(clone), 0);
		}
	}
}

function handleDragEnd() {
	draggedCategory = null;
	isDragging = false;
	dragOverGroupId = null;
}

function handleDragOver(event: DragEvent, groupId: number) {
	event.preventDefault();
	if (event.dataTransfer) {
		event.dataTransfer.dropEffect = 'move';
	}
	dragOverGroupId = groupId;
}

function handleDragLeave() {
	dragOverGroupId = null;
}

function handleDrop(event: DragEvent, targetGroupId: number) {
	event.preventDefault();

	if (!draggedCategory) return;

	// Don't do anything if dropping on the same group
	if (draggedCategory.groupId === targetGroupId) {
		handleDragEnd();
		return;
	}

	// Move the category to the new group
	moveMutation.mutate({
		categoryId: draggedCategory.id,
		newGroupId: targetGroupId
	});

	handleDragEnd();
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
				<!-- Loading State -->
				{#if isLoading}
					<div class="flex items-center justify-center py-8">
						<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
					</div>

				<!-- Group List -->
				{:else if groups.length > 0}
					<div class="space-y-3">
						{#each groups as group (group.id)}
							{@const groupKey = `group-${group.id}`}
							{@const groupCategories = groupedCategories.get(groupKey) ?? []}
							{@const iconData = group.groupIcon ? getIconByName(group.groupIcon) : null}
							{@const GroupIcon = iconData?.icon ?? FolderOpen}
							{@const isDropTarget = dragOverGroupId === group.id}

							<div
								class="rounded-lg border bg-card transition-all {isDropTarget ? 'ring-2 ring-primary border-primary' : ''}"
								role="button"
								tabindex="0"
								ondragover={(e) => handleDragOver(e, group.id)}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, group.id)}
							>
								<!-- Group Header -->
								<div class="bg-muted/30 px-4 py-3 {groupCategories.length > 0 ? 'border-b' : ''}">
									<div class="flex items-center justify-between gap-4">
										<div class="flex items-center gap-3 flex-1 min-w-0">
											<div
												class="flex h-10 w-10 items-center justify-center rounded-lg shrink-0"
												style="background-color: {group.groupColor}20; border: 1px solid {group.groupColor}"
											>
												<GroupIcon class="h-5 w-5" style="color: {group.groupColor}" />
											</div>
											<div class="min-w-0 flex-1">
												<h3 class="font-semibold text-sm truncate">{group.name}</h3>
												{#if group.description}
													<p class="text-xs text-muted-foreground line-clamp-1">{group.description}</p>
												{/if}
												<span class="text-xs text-muted-foreground">
													{group.memberCount} {group.memberCount === 1 ? 'category' : 'categories'}
												</span>
											</div>
										</div>
										<div class="flex items-center gap-1 shrink-0">
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => handleEdit(group)}
											>
												<Pencil class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="h-8 w-8"
												onclick={() => handleDelete(group)}
											>
												<Trash2 class="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>
								</div>

								<!-- Category List (if group has categories) -->
								{#if groupCategories.length > 0}
									<div class="divide-y">
										{#each groupCategories as category (category.id)}
											{@const catIconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
											{@const CategoryIcon = catIconData?.icon ?? Tag}
											{@const isDraggedItem = isDragging && draggedCategory?.id === category.id}
											<div
												class="category-row p-3 hover:bg-muted/50 transition-colors {isDraggedItem ? 'opacity-50' : ''}"
											>
												<div class="flex items-center justify-between gap-3">
													<div class="flex items-center gap-3 flex-1 min-w-0">
														<div
															role="button"
															tabindex="0"
															class="shrink-0 cursor-grab active:cursor-grabbing"
															draggable="true"
															ondragstart={(e) => handleDragStart(e, {...category, groupId: group.id})}
															ondragend={handleDragEnd}
														>
															<GripVertical class="h-4 w-4 text-muted-foreground/50" />
														</div>
														<CategoryIcon
															class="h-5 w-5 shrink-0 {category.categoryColor ? '' : 'text-muted-foreground'}"
															style={category.categoryColor ? `color: ${category.categoryColor}` : ''}
														/>
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
								{/if}
							</div>
						{/each}
					</div>

				<!-- Empty State -->
				{:else}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<FolderOpen class="h-12 w-12 text-muted-foreground/50 mb-4" />
						<h3 class="font-semibold mb-1">No groups yet</h3>
						<p class="text-sm text-muted-foreground mb-4">
							Create your first category group to get started
						</p>
						<Button onclick={handleCreateNew} size="sm">
							<Plus class="mr-2 h-4 w-4" />
							Create Group
						</Button>
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
						onCancel={handleCancelEdit}
					/>
				{:else}
					<ManageCategoryGroupForm onSave={handleSave} onCancel={handleCancelEdit} />
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
