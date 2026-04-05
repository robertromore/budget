<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import Save from '@lucide/svelte/icons/save';
	import type { ImportResult, ColumnMapping } from '$core/types/import';
	import type { ImportProfile } from '$core/schema/import-profiles';

	let {
		importResult,
		onStartNewImport,
		onOpenSaveProfile,
		columnMapping,
		csvHeaders,
		matchedProfile,
		selectedAccountSlug,
	}: {
		importResult: ImportResult;
		onStartNewImport: () => void;
		onOpenSaveProfile: () => void;
		columnMapping: ColumnMapping | null;
		csvHeaders: string[];
		matchedProfile: ImportProfile | null;
		selectedAccountSlug: string | undefined;
	} = $props();
</script>

<div class="space-y-6">
	<div class="text-center">
		<div
			class="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
			<CircleCheck class="h-8 w-8 text-green-600" />
		</div>
		<h2 class="text-2xl font-bold">Import Complete!</h2>
		<p class="text-muted-foreground mt-2">
			Your transactions have been successfully imported
		</p>
	</div>

	<!-- Import Summary -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Import Summary</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid grid-cols-2 gap-4">
				<div>
					<div class="text-2xl font-bold text-green-600">
						{importResult.transactionsCreated}
					</div>
					<div class="text-muted-foreground text-sm">Transactions Created</div>
				</div>
				<div>
					<div class="text-2xl font-bold">
						{importResult.entitiesCreated.payees + importResult.entitiesCreated.categories}
					</div>
					<div class="text-muted-foreground text-sm">Entities Created</div>
				</div>
			</div>

			{#if importResult.errors.length > 0}
				<div class="border-t pt-4">
					<p class="text-destructive mb-2 text-sm font-medium">
						{importResult.errors.length} Error(s)
					</p>
					{#each importResult.errors.slice(0, 5) as error}
						<p class="text-muted-foreground text-xs">
							Row {error.row}: {error.message}
						</p>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Save Import Profile Card - only show for CSV files without matched profile -->
	{#if columnMapping && csvHeaders.length > 0 && !matchedProfile}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2">
					<Save class="h-4 w-4" />
					Save Column Mapping
				</Card.Title>
				<Card.Description>
					Save this column mapping as a profile for future imports with similar files
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<Button variant="outline" onclick={onOpenSaveProfile}>
					Save as Import Profile
				</Button>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Actions -->
	<div class="flex items-center gap-4">
		<Button class="flex-1" onclick={onStartNewImport}>Import Another File</Button>
		<Button class="flex-1" variant="outline" href="/accounts/{selectedAccountSlug}">
			View Account
		</Button>
	</div>
</div>
