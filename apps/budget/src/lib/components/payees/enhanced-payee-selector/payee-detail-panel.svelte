<script lang="ts">
	import { Badge } from "$lib/components/ui/badge";
	import { Button } from "$lib/components/ui/button";
	import type { Payee } from "$lib/schema/payees";
	import { CategoriesState } from "$lib/states/entities/categories.svelte";
	import ArrowLeft from "@lucide/svelte/icons/arrow-left";
	import Check from "@lucide/svelte/icons/check";
	import Clock from "@lucide/svelte/icons/clock";
	import FileText from "@lucide/svelte/icons/file-text";
	import Pencil from "@lucide/svelte/icons/pencil";
	import Tag from "@lucide/svelte/icons/tag";
	import { formatLastUsed } from "../advanced-payee-selector/utils";
	import PayeeQuickEditForm from "./payee-quick-edit-form.svelte";
	import type { EditMode, QuickEditPayeeData } from "./types";

	interface Props {
		payee?: Payee | null;
		mode: EditMode;
		initialName?: string;
		showBackButton?: boolean;
		onModeChange: (mode: EditMode) => void;
		onSave: (data: QuickEditPayeeData) => Promise<void>;
		onSelect: () => void;
		onBack: () => void;
	}

	let {
		payee = null,
		mode,
		initialName = "",
		showBackButton = true,
		onModeChange,
		onSave,
		onSelect,
		onBack,
	}: Props = $props();

	const categoriesState = CategoriesState.get();

	// Get category name for display
	const categoryName = $derived.by(() => {
		if (!payee?.defaultCategoryId || !categoriesState) return null;
		const category = categoriesState.getById(payee.defaultCategoryId);
		return category?.name ?? null;
	});

	function getTypeLabel(type?: string | null): string {
		if (!type) return "Other";
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	async function handleSave(data: QuickEditPayeeData) {
		await onSave(data);
		onModeChange("view");
	}

	function handleCancel() {
		// Always go back to the list when canceling from edit/create
		onBack();
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	{#if mode === "view"}
		<div class="flex items-center justify-between border-b px-4 py-4">
			<div class="flex items-center gap-3">
				{#if showBackButton}
					<button
						type="button"
						onclick={onBack}
						class="hover:bg-accent rounded p-1"
					>
						<ArrowLeft class="h-5 w-5" />
					</button>
				{/if}
				<h3 class="text-lg font-semibold">
					{payee?.name ?? "Payee Details"}
				</h3>
			</div>
			<Button size="sm" onclick={onSelect}>
				<Check class="mr-1 h-4 w-4" />
				Select
			</Button>
		</div>
	{:else}
		<div class="flex items-center gap-3 border-b px-4 py-4">
			<button
				type="button"
				onclick={handleCancel}
				class="hover:bg-accent rounded p-1"
			>
				<ArrowLeft class="h-5 w-5" />
			</button>
			<h3 class="text-lg font-semibold">
				{mode === "create" ? "Create Payee" : "Edit Payee"}
			</h3>
		</div>
	{/if}

	<!-- Content -->
	{#if mode === "view" && payee}
		<!-- View mode content -->
		<div class="flex-1 space-y-6 overflow-auto p-4">
			<!-- Payee name and type -->
			<div>
				<h2 class="text-2xl font-bold">{payee.name}</h2>
				<Badge variant="secondary" class="mt-2">
					{getTypeLabel(payee.payeeType)}
				</Badge>
			</div>

			<!-- Default Category -->
			{#if categoryName}
				<div class="space-y-1">
					<div
						class="text-muted-foreground flex items-center gap-2 text-sm"
					>
						<Tag class="h-4 w-4" />
						<span>Default Category</span>
					</div>
					<p class="font-medium">{categoryName}</p>
				</div>
			{/if}

			<!-- Notes -->
			{#if payee.notes}
				<div class="space-y-1">
					<div
						class="text-muted-foreground flex items-center gap-2 text-sm"
					>
						<FileText class="h-4 w-4" />
						<span>Notes</span>
					</div>
					<p class="text-sm">{payee.notes}</p>
				</div>
			{/if}

			<!-- Last used -->
			{#if payee.lastTransactionDate}
				<div class="space-y-1">
					<div
						class="text-muted-foreground flex items-center gap-2 text-sm"
					>
						<Clock class="h-4 w-4" />
						<span>Last Used</span>
					</div>
					<p class="font-medium">
						{formatLastUsed(payee.lastTransactionDate)}
					</p>
				</div>
			{/if}
		</div>

		<!-- View mode footer -->
		<div class="border-t p-4">
			<Button
				variant="outline"
				class="w-full"
				onclick={() => onModeChange("edit")}
			>
				<Pencil class="mr-2 h-4 w-4" />
				Edit Payee
			</Button>
		</div>
	{:else}
		<!-- Edit/Create mode -->
		<PayeeQuickEditForm
			payee={mode === "edit" ? payee : null}
			{initialName}
			onSave={handleSave}
			onCancel={handleCancel}
		/>
	{/if}
</div>
