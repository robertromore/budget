<script lang="ts">
	import {goto} from '$app/navigation';
	import {page} from '$app/state';
	import {Button} from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import ResponsiveSheet from '$lib/components/ui/responsive-sheet/responsive-sheet.svelte';
	import * as Sheet from '$lib/components/ui/sheet';
	import {Badge} from '$lib/components/ui/badge';
	import {Separator} from '$lib/components/ui/separator';
	import {
		ArrowLeft,
		SquarePen,
		Trash2,
		FolderOpen,
		Users,
		Tag,
		Plus,
		X,
		LoaderCircle,
	} from '@lucide/svelte/icons';
	import ManageCategoryGroupForm from '$lib/components/forms/manage-category-group-form.svelte';
	import {deleteCategoryGroup, removeCategoryFromGroup, addCategoriesToGroup} from '$lib/query/category-groups';
	import {rpc} from '$lib/query';
	import {getIconByName} from '$lib/components/ui/icon-picker/icon-categories';

	const slug = $derived(page.params['slug'] ?? '');

	// Query for group details
	const groupQuery = $derived.by(() => rpc.categoryGroups.getCategoryGroupBySlug(slug).options());
	const group = $derived(groupQuery.data);
	const isLoadingGroup = $derived(groupQuery.isLoading);

	// Query for categories in this group
	const categoriesQuery = $derived.by(() => {
		if (!group) return null;
		return rpc.categoryGroups.getGroupCategories(group.id).options();
	});
	const categories = $derived(categoriesQuery?.data ?? []);
	const isLoadingCategories = $derived(categoriesQuery?.isLoading ?? false);

	// Query all categories for adding new ones
	const allCategoriesQuery = rpc.categories.listCategories().options();
	const allCategories = $derived(allCategoriesQuery.data ?? []);

	// Mutations
	const deleteMutation = deleteCategoryGroup.options();
	const removeCategoryMutation = removeCategoryFromGroup.options();
	const addCategoriesMutation = addCategoriesToGroup.options();

	// UI State
	let editSheetOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let addCategoriesSheetOpen = $state(false);
	let categoryToRemove = $state<number | null>(null);
	let removeCategoryDialogOpen = $state(false);

	// Computed - available categories to add (not already in this group)
	const availableCategories = $derived.by(() => {
		const categoryIds = new Set(categories.map((c) => c.id));
		return allCategories.filter((c) => !categoryIds.has(c.id));
	});

	function handleDelete() {
		if (group) {
			deleteMutation.mutate(group.id, {
				onSuccess: () => {
					goto('/category-groups');
				},
			});
		}
	}

	function handleRemoveCategory(categoryId: number) {
		categoryToRemove = categoryId;
		removeCategoryDialogOpen = true;
	}

	function confirmRemoveCategory() {
		if (categoryToRemove) {
			removeCategoryMutation.mutate(
				{categoryId: categoryToRemove},
				{
					onSuccess: () => {
						removeCategoryDialogOpen = false;
						categoryToRemove = null;
					},
				}
			);
		}
	}

	function handleSaveEdit() {
		editSheetOpen = false;
	}

	function handleAddCategory(categoryId: number) {
		if (!group) return;
		addCategoriesMutation.mutate(
			{groupId: group.id, categoryIds: [categoryId]},
			{
				onSuccess: () => {
					// Categories query will automatically refetch due to cache invalidation
				},
			}
		);
	}

	function handleAddAllCategories(categoryIds: number[]) {
		if (!group) return;
		addCategoriesMutation.mutate(
			{groupId: group.id, categoryIds},
			{
				onSuccess: () => {
					// Categories query will automatically refetch due to cache invalidation
				},
			}
		);
	}
</script>

<svelte:head>
	<title>{group?.name || 'Category Group'} - Budget App</title>
	<meta name="description" content="View category group details" />
</svelte:head>

{#if isLoadingGroup}
	<div class="flex items-center justify-center py-16">
		<LoaderCircle class="h-8 w-8 animate-spin text-muted-foreground" />
	</div>
{:else if !group}
	<div class="container mx-auto py-6">
		<Card.Root>
			<Card.Header>
				<Card.Title>Group Not Found</Card.Title>
				<Card.Description>The category group you're looking for doesn't exist.</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button href="/category-groups">
					<ArrowLeft class="mr-2 h-4 w-4" />
					Back to Groups
				</Button>
			</Card.Content>
		</Card.Root>
	</div>
{:else}
	<div class="container mx-auto py-6 space-y-6">
		<!-- Page Header -->
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-4">
				<Button variant="ghost" size="sm" href="/category-groups" class="p-2">
					<ArrowLeft class="h-4 w-4" />
					<span class="sr-only">Back to Category Groups</span>
				</Button>
				<div>
					<h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
						{@const iconData = group.groupIcon ? getIconByName(group.groupIcon) : null}
						{@const GroupIcon = iconData?.icon ?? FolderOpen}
						<div
							class="flex h-10 w-10 items-center justify-center rounded-lg"
							style:background-color={group.groupColor || '#6b7280'}
						>
							<GroupIcon class="h-6 w-6 text-white" />
						</div>
						{group.name}
					</h1>
					{#if group.description}
						<p class="text-muted-foreground mt-1">{group.description}</p>
					{/if}
				</div>
			</div>
			<div class="flex items-center gap-2">
				<Button variant="outline" onclick={() => (editSheetOpen = true)}>
					<SquarePen class="mr-2 h-4 w-4" />
					Edit
				</Button>
				<Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete
				</Button>
			</div>
		</div>

		<Separator />

		<!-- Categories Section -->
		<Card.Root>
			<Card.Header>
				<div class="flex items-center justify-between">
					<div>
						<Card.Title class="flex items-center gap-2">
							<Users class="h-5 w-5" />
							Categories in this Group
						</Card.Title>
						<Card.Description>
							{categories.length} {categories.length === 1 ? 'category' : 'categories'}
						</Card.Description>
					</div>
					<Button size="sm" onclick={() => (addCategoriesSheetOpen = true)}>
						<Plus class="mr-2 h-4 w-4" />
						Add Categories
					</Button>
				</div>
			</Card.Header>
			<Card.Content>
				{#if isLoadingCategories}
					<div class="flex items-center justify-center py-8">
						<LoaderCircle class="h-6 w-6 animate-spin text-muted-foreground" />
					</div>
				{:else if categories.length === 0}
					<div class="flex flex-col items-center justify-center py-12 text-center">
						<Tag class="h-12 w-12 text-muted-foreground/50 mb-4" />
						<p class="text-sm text-muted-foreground">No categories in this group yet</p>
						<p class="text-xs text-muted-foreground mt-1">
							Click "Add Categories" to assign categories to this group
						</p>
					</div>
				{:else}
					{@const groupedByType = categories.reduce((acc, cat) => {
						const type = cat.categoryType || 'other';
						if (!acc[type]) acc[type] = [];
						acc[type].push(cat);
						return acc;
					}, {} as Record<string, typeof categories>)}

					<div class="space-y-4">
						{#each Object.entries(groupedByType).sort(([a], [b]) => a.localeCompare(b)) as [type, cats] (type)}
							<div class="rounded-lg border bg-card">
								<!-- Type Header -->
								<div class="border-b bg-muted/30 px-4 py-3">
									<div class="flex items-center justify-between gap-4">
										<div class="flex items-center gap-3">
											<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
												<Tag class="h-4 w-4 text-primary" />
											</div>
											<div>
												<h3 class="font-semibold text-sm capitalize">{type}</h3>
												<span class="text-xs text-muted-foreground">
													{cats.length} {cats.length === 1 ? 'category' : 'categories'}
												</span>
											</div>
										</div>
									</div>
								</div>

								<!-- Category List -->
								<div class="divide-y">
									{#each cats as category (category.id)}
										{@const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
										{@const CategoryIcon = iconData?.icon ?? Tag}
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
						{/each}
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Edit Group Sheet -->
	<ResponsiveSheet bind:open={editSheetOpen}>
		{#snippet header()}
			<Sheet.Title>Edit Category Group</Sheet.Title>
			<Sheet.Description>
				Update the details for this category group.
			</Sheet.Description>
		{/snippet}

		{#snippet content()}
			<ManageCategoryGroupForm
				id={group.id}
				initialData={group}
				onSave={handleSaveEdit}
			/>
		{/snippet}
	</ResponsiveSheet>

	<!-- Add Categories Sheet -->
	<ResponsiveSheet bind:open={addCategoriesSheetOpen}>
		{#snippet header()}
			<Sheet.Title>Add Categories to {group.name}</Sheet.Title>
			<Sheet.Description>
				Select categories to add to this group. Categories are organized by type.
			</Sheet.Description>
		{/snippet}

		{#snippet content()}
			{#if availableCategories.length === 0}
				<div class="flex flex-col items-center justify-center py-12 text-center">
					<Tag class="h-12 w-12 text-muted-foreground/50 mb-4" />
					<p class="text-sm text-muted-foreground">All categories are already in groups</p>
				</div>
			{:else}
				{@const groupedByType = availableCategories.reduce((acc, cat) => {
					const type = cat.categoryType || 'other';
					if (!acc[type]) acc[type] = [];
					acc[type].push(cat);
					return acc;
				}, {} as Record<string, typeof availableCategories>)}

				<div class="space-y-4 max-h-[600px] overflow-y-auto">
					{#each Object.entries(groupedByType).sort(([a], [b]) => a.localeCompare(b)) as [type, cats] (type)}
						<div class="rounded-lg border bg-card">
							<!-- Type Header -->
							<div class="border-b bg-muted/30 px-4 py-3">
								<div class="flex items-center justify-between gap-4">
									<div class="flex items-center gap-3">
										<div class="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
											<Tag class="h-4 w-4 text-primary" />
										</div>
										<div>
											<h3 class="font-semibold text-sm capitalize">{type}</h3>
											<span class="text-xs text-muted-foreground">
												{cats.length} {cats.length === 1 ? 'category' : 'categories'}
											</span>
										</div>
									</div>
									<Button
										size="sm"
										variant="default"
										class="h-7 text-xs"
										onclick={() => handleAddAllCategories(cats.map(c => c.id))}
										disabled={addCategoriesMutation.isPending}
									>
										<Plus class="mr-1.5 h-3.5 w-3.5" />
										Add All
									</Button>
								</div>
							</div>

							<!-- Category List -->
							<div class="divide-y">
								{#each cats as category (category.id)}
									{@const iconData = category.categoryIcon ? getIconByName(category.categoryIcon) : null}
									{@const CategoryIcon = iconData?.icon ?? Tag}
									<div class="p-3 hover:bg-muted/50 transition-colors">
										<div class="flex items-center justify-between gap-4">
											<div class="flex items-center gap-3 flex-1 min-w-0">
												<CategoryIcon class="h-4 w-4 text-muted-foreground flex-shrink-0" />
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
												class="h-7 w-7 text-primary hover:text-primary hover:bg-primary/10 shrink-0"
												title="Add to group"
												onclick={() => handleAddCategory(category.id)}
												disabled={addCategoriesMutation.isPending}
											>
												<Plus class="h-3.5 w-3.5" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		{/snippet}
	</ResponsiveSheet>

	<!-- Delete Confirmation Dialog -->
	<AlertDialog.Root bind:open={deleteDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Delete Category Group?</AlertDialog.Title>
				<AlertDialog.Description>
					Are you sure you want to delete "{group.name}"? This will unassign all categories
					from this group, but the categories themselves will not be deleted.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class="bg-destructive hover:bg-destructive/90"
					onclick={handleDelete}
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

	<!-- Remove Category Confirmation Dialog -->
	<AlertDialog.Root bind:open={removeCategoryDialogOpen}>
		<AlertDialog.Content>
			<AlertDialog.Header>
				<AlertDialog.Title>Remove Category from Group?</AlertDialog.Title>
				<AlertDialog.Description>
					This will remove the category from this group. The category itself will not be
					deleted.
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action
					class="bg-destructive hover:bg-destructive/90"
					onclick={confirmRemoveCategory}
					disabled={removeCategoryMutation.isPending}
				>
					{#if removeCategoryMutation.isPending}
						Removing...
					{:else}
						Remove
					{/if}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		</AlertDialog.Content>
	</AlertDialog.Root>
{/if}
