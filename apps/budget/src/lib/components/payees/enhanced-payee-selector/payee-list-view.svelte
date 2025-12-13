<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import type { Payee } from "$lib/schema/payees";
	import { cn } from "$lib/utils";
	import Plus from "@lucide/svelte/icons/plus";
	import Search from "@lucide/svelte/icons/search";
	import Fuse from "fuse.js";
	import PayeeListItem from "./payee-list-item.svelte";
	import type { DisplayMode } from "./types";

	interface AlphabetGroup {
		letter: string;
		payees: Payee[];
	}

	interface Props {
		payees: Payee[];
		selectedId?: number | null;
		focusedId?: number | null;
		displayMode?: DisplayMode;
		allowCreate?: boolean;
		onPayeeFocus: (payeeId: number) => void;
		onPayeeSelect: (payeeId: number) => void;
		onPayeeEdit: (payeeId: number) => void;
		onCreateNew: (searchValue: string) => void;
	}

	let {
		payees,
		selectedId = null,
		focusedId = null,
		displayMode = "normal",
		allowCreate = true,
		onPayeeFocus,
		onPayeeSelect,
		onPayeeEdit,
		onCreateNew,
	}: Props = $props();

	let searchQuery = $state("");
	let scrollContainer: HTMLDivElement | null = $state(null);
	let scrubberContainer: HTMLDivElement | null = $state(null);
	let isDragging = $state(false);
	let activeLetter = $state<string | null>(null);

	// Full alphabet for scrubber
	const alphabet = [
		"A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M",
		"N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "#",
	];

	// Fuse.js fuzzy search
	const fuse = $derived(
		new Fuse(payees, {
			keys: ["name", "notes"],
			threshold: 0.3,
			includeScore: true,
		}),
	);

	// Filter payees based on search
	const filteredPayees = $derived.by(() => {
		if (!searchQuery.trim()) return payees;
		return fuse.search(searchQuery).map((result) => result.item);
	});

	// Group payees alphabetically by first letter
	const alphabetGroups = $derived.by((): AlphabetGroup[] => {
		const groups = new Map<string, Payee[]>();

		// Sort payees alphabetically first
		const sorted = [...filteredPayees].sort((a, b) =>
			(a.name || "").localeCompare(b.name || ""),
		);

		for (const payee of sorted) {
			const name = payee.name || "?";
			const firstChar = name.length > 0 ? name[0].toUpperCase() : "?";
			const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";

			if (!groups.has(letter)) {
				groups.set(letter, []);
			}
			groups.get(letter)!.push(payee);
		}

		// Convert to array and sort by letter
		return Array.from(groups.entries())
			.sort(([a], [b]) => {
				// Put # at the end
				if (a === "#") return 1;
				if (b === "#") return -1;
				return a.localeCompare(b);
			})
			.map(([letter, payees]) => ({ letter, payees }));
	});

	// Set of letters that have payees
	const availableLetters = $derived(
		new Set(alphabetGroups.map((g) => g.letter)),
	);

	// Check if search has no results for create button
	const noResults = $derived(
		searchQuery.trim() && filteredPayees.length === 0,
	);

	function handleCreateNew() {
		onCreateNew(searchQuery.trim());
	}

	// Scroll to a specific letter section
	function scrollToLetter(letter: string) {
		if (!scrollContainer) return;
		const element = scrollContainer.querySelector(`[data-letter="${letter}"]`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "start" });
		}
	}

	// Handle scrubber interaction (click or drag)
	function handleScrubberInteraction(e: MouseEvent | TouchEvent) {
		if (!scrubberContainer) return;

		const rect = scrubberContainer.getBoundingClientRect();
		const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
		const relativeY = clientY - rect.top;
		const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
		const index = Math.floor(percentage * alphabet.length);
		const letter = alphabet[Math.min(index, alphabet.length - 1)];

		activeLetter = letter;

		// Only scroll if this letter has payees
		if (availableLetters.has(letter)) {
			scrollToLetter(letter);
		} else {
			// Find nearest available letter
			const nearestLetter = findNearestAvailableLetter(letter);
			if (nearestLetter) {
				scrollToLetter(nearestLetter);
			}
		}
	}

	function findNearestAvailableLetter(letter: string): string | null {
		const index = alphabet.indexOf(letter);
		if (index === -1) return null;

		// Search forward and backward for nearest available letter
		for (let offset = 0; offset < alphabet.length; offset++) {
			const forwardIndex = index + offset;
			const backwardIndex = index - offset;

			if (forwardIndex < alphabet.length && availableLetters.has(alphabet[forwardIndex])) {
				return alphabet[forwardIndex];
			}
			if (backwardIndex >= 0 && availableLetters.has(alphabet[backwardIndex])) {
				return alphabet[backwardIndex];
			}
		}
		return null;
	}

	function handleScrubberMouseDown(e: MouseEvent) {
		isDragging = true;
		handleScrubberInteraction(e);
	}

	function handleScrubberMouseMove(e: MouseEvent) {
		if (isDragging) {
			handleScrubberInteraction(e);
		}
	}

	function handleScrubberMouseUp() {
		isDragging = false;
		activeLetter = null;
	}

	function handleScrubberTouchStart(e: TouchEvent) {
		isDragging = true;
		handleScrubberInteraction(e);
	}

	function handleScrubberTouchMove(e: TouchEvent) {
		if (isDragging) {
			e.preventDefault();
			handleScrubberInteraction(e);
		}
	}

	function handleScrubberTouchEnd() {
		isDragging = false;
		activeLetter = null;
	}

	// Add/remove global mouse listeners for drag
	$effect(() => {
		if (isDragging) {
			const handleMove = (e: MouseEvent) => handleScrubberMouseMove(e);
			const handleUp = () => handleScrubberMouseUp();
			window.addEventListener("mousemove", handleMove);
			window.addEventListener("mouseup", handleUp);
			return () => {
				window.removeEventListener("mousemove", handleMove);
				window.removeEventListener("mouseup", handleUp);
			};
		}
	});
</script>

<div class="flex h-full flex-col">
	<!-- Sticky search bar -->
	<div class="bg-background sticky top-0 z-10 border-b p-4">
		<div class="relative">
			<Search
				class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
			/>
			<Input
				type="text"
				placeholder="Search payees..."
				bind:value={searchQuery}
				class={cn("h-11 pl-10 text-base", allowCreate && "pr-20")}
			/>
			{#if allowCreate}
				<Button
					variant={searchQuery.trim() ? "default" : "ghost"}
					size="sm"
					class="absolute right-1 top-1/2 -translate-y-1/2"
					onclick={handleCreateNew}
				>
					<Plus class="mr-1 h-4 w-4" />
					New
				</Button>
			{/if}
		</div>
	</div>

	<!-- Main content area with scrubber -->
	<div class="relative flex flex-1 overflow-hidden">
		<!-- Alphabet scrubber -->
		{#if alphabetGroups.length > 0 && !searchQuery.trim()}
			<div
				bind:this={scrubberContainer}
				class="flex w-6 shrink-0 touch-none select-none flex-col items-center justify-center py-2"
				onmousedown={handleScrubberMouseDown}
				ontouchstart={handleScrubberTouchStart}
				ontouchmove={handleScrubberTouchMove}
				ontouchend={handleScrubberTouchEnd}
				role="slider"
				tabindex={0}
				aria-label="Alphabet navigation"
				aria-valuemin={0}
				aria-valuemax={26}
				aria-valuenow={activeLetter ? alphabet.indexOf(activeLetter) : 0}
			>
				{#each alphabet as letter}
					<button
						type="button"
						class={cn(
							"flex h-[calc(100%/27)] w-full items-center justify-center text-[10px] font-medium transition-colors",
							availableLetters.has(letter)
								? "text-foreground hover:text-primary"
								: "text-muted-foreground/40",
							activeLetter === letter && "text-primary scale-125 font-bold",
						)}
						onclick={() => availableLetters.has(letter) && scrollToLetter(letter)}
					>
						{letter}
					</button>
				{/each}
			</div>

			<!-- Active letter indicator -->
			{#if activeLetter}
				<div
					class="bg-primary text-primary-foreground pointer-events-none absolute left-10 top-1/2 z-20 flex h-14 w-14 -translate-y-1/2 items-center justify-center rounded-lg text-2xl font-bold shadow-lg"
				>
					{activeLetter}
				</div>
			{/if}
		{/if}

		<!-- Scrollable list -->
		<div
			bind:this={scrollContainer}
			class="flex-1 space-y-6 overflow-auto p-4"
		>
			{#if noResults}
				<!-- No results state -->
				<div class="py-8 text-center">
					<p class="text-muted-foreground text-sm">
						No payees found for "{searchQuery}"
					</p>
					{#if allowCreate}
						<Button
							variant="outline"
							class="mt-4"
							onclick={handleCreateNew}
						>
							<Plus class="mr-2 h-4 w-4" />
							Create "{searchQuery}"
						</Button>
					{/if}
				</div>
			{:else if alphabetGroups.length === 0}
				<!-- Empty state -->
				<div class="py-8 text-center">
					<p class="text-muted-foreground text-sm">No payees yet</p>
					{#if allowCreate}
						<Button
							variant="outline"
							class="mt-4"
							onclick={handleCreateNew}
						>
							<Plus class="mr-2 h-4 w-4" />
							Create your first payee
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Alphabetically grouped payee grid -->
				{#each alphabetGroups as group (group.letter)}
					<div data-letter={group.letter}>
						<!-- Letter header -->
						<div
							class="bg-muted/50 mb-3 flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold"
						>
							{group.letter}
						</div>

						<!-- Grid of payees -->
						<div class="grid grid-cols-2 gap-2">
							{#each group.payees as payee (payee.id)}
								<PayeeListItem
									{payee}
									displayMode="compact"
									isSelected={payee.id === selectedId}
									isFocused={payee.id === focusedId}
									onFocus={() => onPayeeFocus(payee.id)}
									onSelect={() => onPayeeSelect(payee.id)}
									onEdit={() => onPayeeEdit(payee.id)}
								/>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
