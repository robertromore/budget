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

	import * as Tabs from "$lib/components/ui/tabs";
	import * as Command from "$lib/components/ui/command";
	import Columns2 from "@lucide/svelte/icons/columns-2";
	import LayoutList from "@lucide/svelte/icons/layout-list";
	import User from "@lucide/svelte/icons/user";
	import ArrowRightLeft from "@lucide/svelte/icons/arrow-right-left";
	import Wallet from "@lucide/svelte/icons/wallet";
	import Check from "@lucide/svelte/icons/check";
	import Fuse from "fuse.js";

	interface TransferAccount {
		id: number;
		name: string;
		accountType?: string | null;
	}

	interface Props {
		value?: number | null;
		onValueChange: (payeeId: number | null) => void;
		displayMode?: DisplayMode;
		allowCreate?: boolean;
		allowEdit?: boolean;
		allowClear?: boolean;
		buttonClass?: string;
		placeholder?: string;
		/** Enable transfer tab for converting to transfers */
		showTransferTab?: boolean;
		/** Available accounts for transfer selection */
		accounts?: TransferAccount[];
		/** Current account ID to exclude from transfer targets */
		currentAccountId?: number;
		/** Callback when a transfer account is selected */
		onTransferSelect?: (accountId: number) => void;
	}

	let {
		value = $bindable(null),
		onValueChange,
		displayMode = "normal",
		allowCreate = true,
		allowEdit = true,
		allowClear = true,
		buttonClass = "",
		placeholder = "Select payee...",
		showTransferTab = false,
		accounts = [],
		currentAccountId,
		onTransferSelect,
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

	// Transfer tab state
	let activeTab = $state<"payee" | "transfer">("payee");
	let transferSearchValue = $state("");

	// Payees from context
	const payeesState = PayeesState.get();
	const allPayees = $derived(
		payeesState ? Array.from(payeesState.payees.values()) : [],
	);

	// Refresh payees from server when selector opens (to catch payees created elsewhere)
	$effect(() => {
		if (open && payeesState) {
			rpc.payees.listPayees().execute().then((freshPayees) => {
				if (freshPayees) {
					payeesState.init(freshPayees as Payee[]);
				}
			}).catch((err) => {
				console.error("Failed to refresh payees:", err);
			});
		}
	});

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

	// Transfer accounts (excluding current account)
	const transferAccounts = $derived(
		accounts.filter((a) => a.id !== currentAccountId),
	);

	// Fuse instance for transfer account search
	const transferFuse = $derived(
		new Fuse(transferAccounts, {
			keys: ["name", "accountType"],
			threshold: 0.3,
		}),
	);

	// Filtered transfer accounts based on search
	const filteredTransferAccounts = $derived.by(() => {
		if (!transferSearchValue.trim()) {
			return transferAccounts;
		}
		return transferFuse.search(transferSearchValue).map((r) => r.item);
	});

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

	// Handle clear payee (set to null and close)
	function handleClearPayee() {
		value = null;
		onValueChange(null);
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

	// Handle transfer account selection
	function handleTransferAccountSelect(accountId: number) {
		onTransferSelect?.(accountId);
		open = false;
		resetState();
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
		activeTab = "payee";
		transferSearchValue = "";
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
			<div class="space-y-4">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="text-lg font-semibold">
							{showTransferTab ? "Select Payee or Transfer" : "Select Payee"}
						</h2>
						<p class="text-muted-foreground text-sm">
							{#if activeTab === "transfer"}
								{transferAccounts.length} accounts available
							{:else}
								{allPayees.length} payees available
							{/if}
						</p>
					</div>

					<!-- Layout mode toggle (desktop only, payee tab only) -->
					{#if isDesktop.current && activeTab === "payee"}
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

				<!-- Payee/Transfer tabs -->
				{#if showTransferTab}
					<Tabs.Root bind:value={activeTab} class="w-full">
						<Tabs.List class="grid w-full grid-cols-2">
							<Tabs.Trigger value="payee" class="flex items-center gap-2">
								<User class="h-4 w-4" />
								Payee
							</Tabs.Trigger>
							<Tabs.Trigger value="transfer" class="flex items-center gap-2">
								<ArrowRightLeft class="h-4 w-4" />
								Transfer
							</Tabs.Trigger>
						</Tabs.List>
					</Tabs.Root>
				{/if}
			</div>
		{/snippet}

		{#snippet content()}
			{#if activeTab === "transfer" && showTransferTab}
				<!-- Transfer account list -->
				<div class="flex h-[calc(100vh-14rem)] min-h-[300px] flex-col">
					<!-- Search input -->
					<div class="border-b p-3">
						<Command.Root class="rounded-lg border" shouldFilter={false}>
							<Command.Input
								placeholder="Search accounts..."
								bind:value={transferSearchValue}
							/>
						</Command.Root>
					</div>

					<!-- Account list -->
					<div class="flex-1 overflow-y-auto">
						{#if filteredTransferAccounts.length === 0}
							<div class="flex flex-col items-center justify-center py-12 text-center">
								<Wallet class="text-muted-foreground mb-4 h-12 w-12" />
								<p class="text-muted-foreground text-sm">
									{transferSearchValue ? "No accounts match your search" : "No other accounts available"}
								</p>
							</div>
						{:else}
							<div class="divide-y">
								{#each filteredTransferAccounts as account (account.id)}
									<button
										type="button"
										class="hover:bg-accent flex w-full items-center gap-3 p-3 text-left transition-colors"
										onclick={() => handleTransferAccountSelect(account.id)}
									>
										<div class="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-full">
											<ArrowRightLeft class="text-primary h-5 w-5" />
										</div>
										<div class="min-w-0 flex-1">
											<div class="truncate font-medium">{account.name}</div>
											{#if account.accountType}
												<div class="text-muted-foreground text-xs capitalize">
													{account.accountType.replace(/_/g, " ")}
												</div>
											{/if}
										</div>
										<Check class="text-muted-foreground/30 h-4 w-4" />
									</button>
								{/each}
							</div>
						{/if}
					</div>
				</div>
			{:else if effectiveLayoutMode === "slide-in"}
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
							{allowClear}
							onPayeeFocus={handlePayeeFocus}
							onPayeeSelect={handlePayeeSelect}
							onPayeeEdit={handlePayeeEdit}
							onCreateNew={handleCreateNew}
							onClearPayee={handleClearPayee}
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
							{allowClear}
							onPayeeFocus={handlePayeeFocus}
							onPayeeSelect={handlePayeeSelect}
							onPayeeEdit={handlePayeeEdit}
							onCreateNew={handleCreateNew}
							onClearPayee={handleClearPayee}
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
