<script lang="ts">
	import { browser } from "$app/environment";
	import ResponsiveSheet from "$lib/components/ui/responsive-sheet/responsive-sheet.svelte";
	import * as ToggleGroup from "$lib/components/ui/toggle-group";
	import type { Payee } from "$lib/schema/payees";
	import { PayeesState } from "$lib/states/entities/payees.svelte";
	import { rpc } from "$lib/query";
	import { cn } from "$lib/utils";
	import { MediaQuery } from "svelte/reactivity";
	import { saveToRecentPayees } from "../advanced-payee-selector/utils";
	import PayeeDetailPanel from "./payee-detail-panel.svelte";
	import PayeeEmptyState from "./payee-empty-state.svelte";
	import PayeeListView from "./payee-list-view.svelte";
	import type {
	  DisplayMode,
	  EditMode,
	  LayoutMode,
	  QuickEditPayeeData,
	} from "./types";

	import Columns2 from "@lucide/svelte/icons/columns-2";
	import LayoutList from "@lucide/svelte/icons/layout-list";
	import User from "@lucide/svelte/icons/user";

	interface Props {
		value?: number | null;
		onValueChange: (payeeId: number | null) => void;
		displayMode?: DisplayMode;
		allowCreate?: boolean;
		allowEdit?: boolean;
		buttonClass?: string;
		placeholder?: string;
	}

	let {
		value = $bindable(null),
		onValueChange,
		displayMode = "normal",
		allowCreate = true,
		allowEdit = true,
		buttonClass = "",
		placeholder = "Select payee...",
	}: Props = $props();

	// Layout mode preference storage
	const LAYOUT_MODE_KEY = "payee-selector-layout-mode";

	function getStoredLayoutMode(): LayoutMode {
		if (!browser) return "slide-in";
		return (
			(localStorage.getItem(LAYOUT_MODE_KEY) as LayoutMode) || "slide-in"
		);
	}

	function setStoredLayoutMode(mode: LayoutMode) {
		if (browser) {
			localStorage.setItem(LAYOUT_MODE_KEY, mode);
		}
	}

	// State
	const isDesktop = new MediaQuery("(min-width: 768px)");
	let open = $state(false);
	let layoutMode = $state<LayoutMode>(getStoredLayoutMode());
	let focusedPayeeId = $state<number | null>(null);
	let editMode = $state<EditMode>("view");
	let createInitialName = $state("");

	// Payees from context
	const payeesState = PayeesState.get();
	const allPayees = $derived(
		payeesState ? Array.from(payeesState.payees.values()) : [],
	);

	// Selected payee (the one that will be returned as value)
	const selectedPayee = $derived(allPayees.find((p) => p.id === value));

	// Focused payee (the one shown in detail panel)
	const focusedPayee = $derived(
		focusedPayeeId
			? (allPayees.find((p) => p.id === focusedPayeeId) ?? null)
			: null,
	);

	// Use slide-in on mobile regardless of setting
	const effectiveLayoutMode = $derived(
		isDesktop.current ? layoutMode : "slide-in",
	);

	// Show detail panel in slide-in mode
	const showDetailPanel = $derived(
		focusedPayeeId !== null || editMode === "create",
	);

	// Handle layout mode change
	function handleLayoutModeChange(mode: string) {
		if (mode === "slide-in" || mode === "side-by-side") {
			layoutMode = mode;
			setStoredLayoutMode(mode);
		}
	}

	// Handle payee focus (show in detail panel)
	function handlePayeeFocus(payeeId: number) {
		focusedPayeeId = payeeId;
		editMode = "view";
	}

	// Handle payee select (confirm selection and close)
	function handlePayeeSelect(payeeId: number) {
		value = payeeId;
		onValueChange(payeeId);
		saveToRecentPayees(payeeId);
		open = false;
		resetState();
	}

	// Handle payee edit
	function handlePayeeEdit(payeeId: number) {
		focusedPayeeId = payeeId;
		editMode = "edit";
	}

	// Handle create new payee
	function handleCreateNew(searchValue: string = "") {
		createInitialName = searchValue;
		focusedPayeeId = null;
		editMode = "create";
	}

	// Handle back from detail panel
	function handleBack() {
		focusedPayeeId = null;
		editMode = "view";
		createInitialName = "";
	}

	// Handle save payee (create or update)
	async function handleSavePayee(data: QuickEditPayeeData): Promise<void> {
		if (editMode === "create") {
			// Create new payee
			const result = await rpc.payees.createPayee().execute({
				name: data.name,
				defaultCategoryId: data.defaultCategoryId,
				notes: data.notes,
			});
			if (payeesState) {
				payeesState.addPayee(result as Payee);
			}
			// Auto-select the new payee
			handlePayeeSelect(result.id);
		} else if (focusedPayee) {
			// Update existing payee
			const result = await rpc.payees.updatePayee().execute({
				id: focusedPayee.id,
				name: data.name,
				defaultCategoryId: data.defaultCategoryId,
				notes: data.notes,
			});
			if (payeesState) {
				payeesState.updatePayee(result as Payee);
			}
			editMode = "view";
		}
	}

	// Handle select from detail panel
	function handleSelectFromDetail() {
		if (focusedPayeeId) {
			handlePayeeSelect(focusedPayeeId);
		}
	}

	// Reset state when closing
	function resetState() {
		focusedPayeeId = null;
		editMode = "view";
		createInitialName = "";
	}

	// Handle open change via callback
	function handleOpenChange(newOpen: boolean) {
		if (!newOpen) {
			resetState();
		}
	}
</script>

<div class="w-full">
	<ResponsiveSheet
		bind:open
		onOpenChange={handleOpenChange}
		defaultWidth={effectiveLayoutMode === "side-by-side" ? 800 : 480}
		minWidth={effectiveLayoutMode === "side-by-side" ? 600 : 400}
		maxWidth={effectiveLayoutMode === "side-by-side" ? 1200 : 600}
		triggerClass={cn(
			"flex items-center w-full h-9 px-3 py-2 text-sm rounded-md border border-input bg-background ring-offset-background",
			"hover:bg-accent hover:text-accent-foreground",
			"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
			"justify-start text-left font-normal",
			!selectedPayee && "text-muted-foreground",
			buttonClass,
		)}
	>
		{#snippet trigger()}
			<User class="mr-2 h-4 w-4 shrink-0" />
			<span class="truncate">{selectedPayee?.name || placeholder}</span>
		{/snippet}

		{#snippet header()}
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-semibold">Select Payee</h2>
					<p class="text-muted-foreground text-sm">
						{allPayees.length} payees available
					</p>
				</div>

				<!-- Layout mode toggle (desktop only) -->
				{#if isDesktop.current}
					<ToggleGroup.Root
						type="single"
						value={layoutMode}
						onValueChange={handleLayoutModeChange}
						class="border"
					>
						<ToggleGroup.Item
							value="slide-in"
							aria-label="Slide-in layout"
							class="px-2"
						>
							<LayoutList class="h-4 w-4" />
						</ToggleGroup.Item>
						<ToggleGroup.Item
							value="side-by-side"
							aria-label="Side-by-side layout"
							class="px-2"
						>
							<Columns2 class="h-4 w-4" />
						</ToggleGroup.Item>
					</ToggleGroup.Root>
				{/if}
			</div>
		{/snippet}

		{#snippet content()}
			{#if effectiveLayoutMode === "slide-in"}
				<!-- Slide-in layout -->
				<div class="relative h-[calc(100vh-12rem)] min-h-[400px] overflow-hidden">
					<!-- List panel -->
					<div
						class={cn(
							"absolute inset-0 transition-transform duration-200 ease-out",
							showDetailPanel && "-translate-x-full",
						)}
					>
						<PayeeListView
							payees={allPayees}
							selectedId={value}
							focusedId={focusedPayeeId}
							{displayMode}
							{allowCreate}
							onPayeeFocus={handlePayeeFocus}
							onPayeeSelect={handlePayeeSelect}
							onPayeeEdit={handlePayeeEdit}
							onCreateNew={handleCreateNew}
						/>
					</div>

					<!-- Detail panel (slides from right) -->
					<div
						class={cn(
							"absolute inset-0 transition-transform duration-200 ease-out",
							!showDetailPanel && "translate-x-full",
						)}
					>
						<PayeeDetailPanel
							payee={focusedPayee}
							mode={editMode}
							initialName={createInitialName}
							showBackButton={true}
							onModeChange={(mode) => (editMode = mode)}
							onSave={handleSavePayee}
							onSelect={handleSelectFromDetail}
							onBack={handleBack}
						/>
					</div>
				</div>
			{:else}
				<!-- Side-by-side layout -->
				<div class="grid h-[calc(100vh-12rem)] min-h-[400px] grid-cols-[40%_60%]">
					<!-- List panel -->
					<div class="overflow-hidden border-r">
						<PayeeListView
							payees={allPayees}
							selectedId={value}
							focusedId={focusedPayeeId}
							{displayMode}
							{allowCreate}
							onPayeeFocus={handlePayeeFocus}
							onPayeeSelect={handlePayeeSelect}
							onPayeeEdit={handlePayeeEdit}
							onCreateNew={handleCreateNew}
						/>
					</div>

					<!-- Detail panel -->
					<div class="overflow-hidden">
						{#if showDetailPanel}
							<PayeeDetailPanel
								payee={focusedPayee}
								mode={editMode}
								initialName={createInitialName}
								showBackButton={false}
								onModeChange={(mode) => (editMode = mode)}
								onSave={handleSavePayee}
								onSelect={handleSelectFromDetail}
								onBack={handleBack}
							/>
						{:else}
							<PayeeEmptyState
								payees={allPayees}
								onCreateNew={() => handleCreateNew("")}
								onPayeeFocus={handlePayeeFocus}
							/>
						{/if}
					</div>
				</div>
			{/if}
		{/snippet}
	</ResponsiveSheet>
</div>
