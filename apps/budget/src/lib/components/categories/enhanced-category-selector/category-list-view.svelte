<script lang="ts">
	import { Button } from "$lib/components/ui/button";
	import { Input } from "$lib/components/ui/input";
	import type { Category } from "$lib/schema/categories";
	import { cn } from "$lib/utils";
	import Plus from "@lucide/svelte/icons/plus";
	import Search from "@lucide/svelte/icons/search";
	import Fuse from "fuse.js";
	import CategoryListItem from "./category-list-item.svelte";
	import type { DisplayMode } from "./types";

	interface AlphabetGroup {
		letter: string;
		categories: Category[];
	}

	interface Props {
		categories: Category[];
		selectedId?: number | null;
		focusedId?: number | null;
		displayMode?: DisplayMode;
		allowCreate?: boolean;
		onCategoryFocus: (categoryId: number) => void;
		onCategorySelect: (categoryId: number) => void;
		onCategoryEdit: (categoryId: number) => void;
		onCreateNew: (searchValue: string) => void;
	}

	let {
		categories,
		selectedId = null,
		focusedId = null,
		displayMode = "normal",
		allowCreate = true,
		onCategoryFocus,
		onCategorySelect,
		onCategoryEdit,
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
		new Fuse(categories, {
			keys: ["name", "notes"],
			threshold: 0.3,
			includeScore: true,
		}),
	);

	// Filter categories based on search
	const filteredCategories = $derived.by(() => {
		if (!searchQuery.trim()) return categories;
		return fuse.search(searchQuery).map((result) => result.item);
	});

	// Group categories alphabetically by first letter
	const alphabetGroups = $derived.by((): AlphabetGroup[] => {
		const groups = new Map<string, Category[]>();

		// Sort categories alphabetically first
		const sorted = [...filteredCategories].sort((a, b) =>
			(a.name || "").localeCompare(b.name || ""),
		);

		for (const category of sorted) {
			const name = category.name || "?";
			const firstChar = name.length > 0 ? name.charAt(0).toUpperCase() : "?";
			const letter = /[A-Z]/.test(firstChar) ? firstChar : "#";

			if (!groups.has(letter)) {
				groups.set(letter, []);
			}
			groups.get(letter)!.push(category);
		}

		// Convert to array and sort by letter
		return Array.from(groups.entries())
			.sort(([a], [b]) => {
				// Put # at the end
				if (a === "#") return 1;
				if (b === "#") return -1;
				return a.localeCompare(b);
			})
			.map(([letter, categories]) => ({ letter, categories }));
	});

	// Set of letters that have categories
	const availableLetters = $derived(
		new Set(alphabetGroups.map((g) => g.letter)),
	);

	// Check if search has no results for create button
	const noResults = $derived(
		searchQuery.trim() && filteredCategories.length === 0,
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
		const clientY = "touches" in e ? (e.touches[0]?.clientY ?? 0) : e.clientY;
		const relativeY = clientY - rect.top;
		const percentage = Math.max(0, Math.min(1, relativeY / rect.height));
		const index = Math.floor(percentage * alphabet.length);
		const letter = alphabet[Math.min(index, alphabet.length - 1)] ?? "#";

		activeLetter = letter;

		// Only scroll if this letter has categories
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

			const forwardLetter = alphabet[forwardIndex];
			const backwardLetter = alphabet[backwardIndex];

			if (forwardIndex < alphabet.length && forwardLetter && availableLetters.has(forwardLetter)) {
				return forwardLetter;
			}
			if (backwardIndex >= 0 && backwardLetter && availableLetters.has(backwardLetter)) {
				return backwardLetter;
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
		if (!isDragging) return;

		const handleMove = (e: MouseEvent) => handleScrubberMouseMove(e);
		const handleUp = () => handleScrubberMouseUp();
		window.addEventListener("mousemove", handleMove);
		window.addEventListener("mouseup", handleUp);
		return () => {
			window.removeEventListener("mousemove", handleMove);
			window.removeEventListener("mouseup", handleUp);
		};
	});

	// Scroll to selected item when the list opens
	$effect(() => {
		if (scrollContainer && selectedId !== null && alphabetGroups.length > 0) {
			// Use requestAnimationFrame to ensure DOM is ready
			requestAnimationFrame(() => {
				const selectedElement = scrollContainer?.querySelector(
					`[data-category-id="${selectedId}"]`
				);
				if (selectedElement) {
					selectedElement.scrollIntoView({ behavior: "instant", block: "center" });
				}
			});
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
				placeholder="Search categories..."
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
				tabindex="0"
				aria-label="Alphabet navigation"
				aria-valuemin={0}
				aria-valuemax={26}
				aria-valuenow={activeLetter ? alphabet.indexOf(activeLetter) : 0}
			>
				{#each alphabet as letter (letter)}
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
						No categories found for "{searchQuery}"
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
					<p class="text-muted-foreground text-sm">No categories yet</p>
					{#if allowCreate}
						<Button
							variant="outline"
							class="mt-4"
							onclick={handleCreateNew}
						>
							<Plus class="mr-2 h-4 w-4" />
							Create your first category
						</Button>
					{/if}
				</div>
			{:else}
				<!-- Alphabetically grouped category grid -->
				{#each alphabetGroups as group (group.letter)}
					<div data-letter={group.letter}>
						<!-- Letter header -->
						<div
							class="bg-muted/50 mb-3 flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold"
						>
							{group.letter}
						</div>

						<!-- Grid of categories -->
						<div class="grid grid-cols-2 gap-2">
							{#each group.categories as category (category.id)}
								<CategoryListItem
									{category}
									displayMode="compact"
									isSelected={category.id === selectedId}
									isFocused={category.id === focusedId}
									onFocus={() => onCategoryFocus(category.id)}
									onSelect={() => onCategorySelect(category.id)}
									onEdit={() => onCategoryEdit(category.id)}
								/>
							{/each}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>
</div>
