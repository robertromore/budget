<script lang="ts">
	import type { Payee } from "$lib/schema/payees";
	import { cn } from "$lib/utils";
	import Check from "@lucide/svelte/icons/check";
	import Pencil from "@lucide/svelte/icons/pencil";
	import { formatLastUsed } from "../advanced-payee-selector/utils";
	import type { DisplayMode } from "./types";

	interface Props {
		payee: Payee;
		isSelected: boolean;
		isFocused: boolean;
		displayMode?: DisplayMode;
		onFocus: () => void;
		onSelect: () => void;
		onEdit: () => void;
	}

	let {
		payee,
		isSelected,
		isFocused,
		displayMode = "normal",
		onFocus,
		onSelect,
		onEdit,
	}: Props = $props();

	function getTypeLabel(type?: string | null): string {
		if (!type) return "Other";
		return type.charAt(0).toUpperCase() + type.slice(1);
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === "Enter") {
			e.preventDefault();
			onSelect();
		} else if (e.key === "e" || e.key === "E") {
			e.preventDefault();
			onEdit();
		}
	}
</script>

<div
	role="option"
	tabindex="0"
	aria-selected={isSelected}
	data-payee-id={payee.id}
	class={cn(
		"group relative flex w-full cursor-pointer items-center rounded-lg border text-left transition-all",
		displayMode === "compact" ? "gap-2 px-2.5 py-2" : "gap-3 px-3 py-3",
		isSelected && "border-primary bg-primary/5",
		isFocused && !isSelected && "border-primary bg-accent",
		!isFocused && !isSelected && "hover:border-primary/50 hover:bg-accent/50",
	)}
	onclick={onFocus}
	ondblclick={onSelect}
	onkeydown={handleKeyDown}
>
	<!-- Check indicator (compact mode: small dot, normal mode: icon) -->
	{#if displayMode === "compact"}
		<div
			class={cn(
				"h-2 w-2 shrink-0 rounded-full transition-colors",
				isSelected ? "bg-primary" : "bg-transparent",
			)}
		></div>
	{:else}
		<Check
			class={cn(
				"h-4 w-4 shrink-0",
				isSelected ? "text-primary opacity-100" : "opacity-0",
			)}
		/>
	{/if}

	<!-- Payee info -->
	<div class="min-w-0 flex-1">
		<p class="truncate text-sm font-medium">{payee.name}</p>
		{#if displayMode === "normal"}
			<div class="mt-0.5 flex items-center gap-2">
				<p class="text-muted-foreground text-xs">
					{getTypeLabel(payee.payeeType)}
				</p>
				{#if payee.lastTransactionDate}
					<span class="text-muted-foreground text-xs">•</span>
					<p class="text-muted-foreground text-xs">
						{formatLastUsed(payee.lastTransactionDate)}
					</p>
				{/if}
			</div>
		{/if}
	</div>

	<!-- Edit button (visible on hover/focus) -->
	<button
		type="button"
		class={cn(
			"shrink-0 rounded p-1 transition-opacity",
			"hover:bg-background",
			"opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
			isFocused && "opacity-100",
		)}
		onclick={(e) => {
			e.stopPropagation();
			onEdit();
		}}
		title="Edit payee"
	>
		<Pencil class="h-3.5 w-3.5" />
	</button>
</div>
