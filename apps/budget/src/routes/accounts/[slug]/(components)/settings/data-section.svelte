<script lang="ts">
import * as Card from '$lib/components/ui/card';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import { Label } from '$lib/components/ui/label';
import DateInput from '$lib/components/input/date-input.svelte';
import { toast } from 'svelte-sonner';
import { trpc } from '$lib/trpc/client';
import { useQueryClient } from '@tanstack/svelte-query';
import type { Account } from '$lib/schema';
import { type DateValue } from '@internationalized/date';
import { timezone } from '$lib/utils/dates';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Calendar from '@lucide/svelte/icons/calendar';
import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Sparkles from '@lucide/svelte/icons/sparkles';
import AlertTriangle from '@lucide/svelte/icons/alert-triangle';

interface Props {
	account: Account;
}

let { account }: Props = $props();

const queryClient = useQueryClient();

// Data counts query
let dataCounts = $state<{
	transactions: number;
	schedules: number;
	importProfiles: number;
	detectedPatterns: number;
} | null>(null);
let isLoadingCounts = $state(true);

// Load data counts
$effect(() => {
	loadDataCounts();
});

async function loadDataCounts() {
	isLoadingCounts = true;
	try {
		dataCounts = await trpc().accountRoutes.getAccountDataCounts.query({
			accountId: account.id
		});
	} catch (error) {
		console.error('Failed to load data counts:', error);
	} finally {
		isLoadingCounts = false;
	}
}

// Delete dialogs state
let deleteTransactionsDialog = $state({ open: false, isDeleting: false });
let deleteDateRangeDialog = $state({
	open: false,
	isDeleting: false,
	startDate: undefined as DateValue | undefined,
	endDate: undefined as DateValue | undefined
});
let clearSchedulesDialog = $state({ open: false, isDeleting: false });
let clearImportProfilesDialog = $state({ open: false, isDeleting: false });
let clearPatternsDialog = $state({ open: false, isDeleting: false });

// Delete all transactions
async function confirmDeleteAllTransactions() {
	deleteTransactionsDialog.isDeleting = true;
	try {
		const result = await trpc().accountRoutes.deleteAllTransactions.mutate({
			accountId: account.id
		});

		toast.success(`${result.deletedCount} transactions deleted`);
		deleteTransactionsDialog.open = false;

		// Refresh data counts and invalidate queries
		await loadDataCounts();
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
	} catch (error) {
		console.error('Failed to delete transactions:', error);
		toast.error('Failed to delete transactions');
	} finally {
		deleteTransactionsDialog.isDeleting = false;
	}
}

// Delete transactions by date range
async function confirmDeleteByDateRange() {
	if (!deleteDateRangeDialog.startDate || !deleteDateRangeDialog.endDate) {
		toast.error('Please select both start and end dates');
		return;
	}

	deleteDateRangeDialog.isDeleting = true;
	try {
		// Convert DateValue to ISO string format (YYYY-MM-DD)
		const startDateStr = deleteDateRangeDialog.startDate.toDate(timezone).toISOString().split('T')[0];
		const endDateStr = deleteDateRangeDialog.endDate.toDate(timezone).toISOString().split('T')[0];

		const result = await trpc().accountRoutes.deleteTransactionsByDateRange.mutate({
			accountId: account.id,
			startDate: startDateStr,
			endDate: endDateStr
		});

		toast.success(`${result.deletedCount} transactions deleted`);
		deleteDateRangeDialog.open = false;
		deleteDateRangeDialog.startDate = undefined;
		deleteDateRangeDialog.endDate = undefined;

		// Refresh data
		await loadDataCounts();
		await queryClient.invalidateQueries({ queryKey: ['transactions'] });
		await queryClient.invalidateQueries({ queryKey: ['accounts'] });
	} catch (error) {
		console.error('Failed to delete transactions:', error);
		toast.error('Failed to delete transactions');
	} finally {
		deleteDateRangeDialog.isDeleting = false;
	}
}

// Clear schedules
async function confirmClearSchedules() {
	clearSchedulesDialog.isDeleting = true;
	try {
		const result = await trpc().accountRoutes.clearSchedules.mutate({
			accountId: account.id
		});

		toast.success(`${result.deletedCount} schedules removed`);
		clearSchedulesDialog.open = false;

		await loadDataCounts();
		await queryClient.invalidateQueries({ queryKey: ['schedules'] });
	} catch (error) {
		console.error('Failed to clear schedules:', error);
		toast.error('Failed to clear schedules');
	} finally {
		clearSchedulesDialog.isDeleting = false;
	}
}

// Clear import profiles
async function confirmClearImportProfiles() {
	clearImportProfilesDialog.isDeleting = true;
	try {
		const result = await trpc().accountRoutes.clearImportProfiles.mutate({
			accountId: account.id
		});

		toast.success(`${result.deletedCount} import profiles removed`);
		clearImportProfilesDialog.open = false;

		await loadDataCounts();
		await queryClient.invalidateQueries({ queryKey: ['importProfiles'] });
	} catch (error) {
		console.error('Failed to clear import profiles:', error);
		toast.error('Failed to clear import profiles');
	} finally {
		clearImportProfilesDialog.isDeleting = false;
	}
}

// Clear detected patterns
async function confirmClearPatterns() {
	clearPatternsDialog.isDeleting = true;
	try {
		const result = await trpc().accountRoutes.clearDetectedPatterns.mutate({
			accountId: account.id
		});

		toast.success(`${result.deletedCount} patterns cleared`);
		clearPatternsDialog.open = false;

		await loadDataCounts();
		await queryClient.invalidateQueries({ queryKey: ['detectedPatterns'] });
		await queryClient.invalidateQueries({ queryKey: ['recommendations'] });
	} catch (error) {
		console.error('Failed to clear patterns:', error);
		toast.error('Failed to clear patterns');
	} finally {
		clearPatternsDialog.isDeleting = false;
	}
}
</script>

<div class="space-y-6">
	<div>
		<h2 class="text-xl font-semibold">Data Management</h2>
		<p class="text-muted-foreground text-sm">
			Manage and clean up data associated with this account.
		</p>
	</div>

	<!-- Data Overview -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Data Overview</Card.Title>
			<Card.Description>Summary of data stored for this account.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if isLoadingCounts}
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					{#each Array(4) as _}
						<div class="bg-muted h-16 animate-pulse rounded-lg"></div>
					{/each}
				</div>
			{:else if dataCounts}
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="rounded-lg border p-4 text-center">
						<div class="text-2xl font-bold">{dataCounts.transactions}</div>
						<div class="text-muted-foreground text-sm">Transactions</div>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<div class="text-2xl font-bold">{dataCounts.schedules}</div>
						<div class="text-muted-foreground text-sm">Schedules</div>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<div class="text-2xl font-bold">{dataCounts.importProfiles}</div>
						<div class="text-muted-foreground text-sm">Import Profiles</div>
					</div>
					<div class="rounded-lg border p-4 text-center">
						<div class="text-2xl font-bold">{dataCounts.detectedPatterns}</div>
						<div class="text-muted-foreground text-sm">Detected Patterns</div>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Transactions -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Trash2 class="h-5 w-5" />
				Delete Transactions
			</Card.Title>
			<Card.Description>Remove transactions from this account.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<p class="font-medium">Delete all transactions</p>
					<p class="text-muted-foreground text-sm">
						Remove all {dataCounts?.transactions || 0} transactions from this account.
					</p>
				</div>
				<Button
					variant="destructive"
					onclick={() => (deleteTransactionsDialog.open = true)}
					disabled={!dataCounts || dataCounts.transactions === 0}>
					Delete All
				</Button>
			</div>

			<div class="border-t pt-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<p class="font-medium">Delete by date range</p>
						<p class="text-muted-foreground text-sm">
							Remove transactions within a specific date range.
						</p>
					</div>
					<Button
						variant="outline"
						onclick={() => (deleteDateRangeDialog.open = true)}
						disabled={!dataCounts || dataCounts.transactions === 0}>
						<Calendar class="mr-2 h-4 w-4" />
						Select Range
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Schedules -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<CalendarClock class="h-5 w-5" />
				Clear Schedules
			</Card.Title>
			<Card.Description>
				Remove all scheduled transactions linked to this account.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-muted-foreground text-sm">
					{dataCounts?.schedules || 0} schedule{(dataCounts?.schedules || 0) !== 1 ? 's' : ''}{' '}
					associated with this account.
				</p>
				<Button
					variant="destructive"
					onclick={() => (clearSchedulesDialog.open = true)}
					disabled={!dataCounts || dataCounts.schedules === 0}>
					Clear Schedules
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Import Profiles -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<FileSpreadsheet class="h-5 w-5" />
				Clear Import Profiles
			</Card.Title>
			<Card.Description>
				Remove import profiles that are linked to this account.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-muted-foreground text-sm">
					{dataCounts?.importProfiles || 0} import
					profile{(dataCounts?.importProfiles || 0) !== 1 ? 's' : ''} linked to this account.
				</p>
				<Button
					variant="destructive"
					onclick={() => (clearImportProfilesDialog.open = true)}
					disabled={!dataCounts || dataCounts.importProfiles === 0}>
					Clear Profiles
				</Button>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Detected Patterns -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Sparkles class="h-5 w-5" />
				Reset Detected Patterns
			</Card.Title>
			<Card.Description>
				Clear detected transaction patterns used for recommendations.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<p class="text-muted-foreground text-sm">
					{dataCounts?.detectedPatterns || 0} detected
					pattern{(dataCounts?.detectedPatterns || 0) !== 1 ? 's' : ''} will be cleared. New
					patterns will be detected automatically.
				</p>
				<Button
					variant="destructive"
					onclick={() => (clearPatternsDialog.open = true)}
					disabled={!dataCounts || dataCounts.detectedPatterns === 0}>
					Reset Patterns
				</Button>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- Delete All Transactions Dialog -->
<AlertDialog.Root bind:open={deleteTransactionsDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive h-5 w-5" />
				Delete All Transactions?
			</AlertDialog.Title>
			<AlertDialog.Description>
				This will permanently delete all <strong>{dataCounts?.transactions || 0}</strong>
				transactions from "{account.name}". This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={deleteTransactionsDialog.isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmDeleteAllTransactions}
				disabled={deleteTransactionsDialog.isDeleting}>
				{deleteTransactionsDialog.isDeleting ? 'Deleting...' : 'Delete All Transactions'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete by Date Range Dialog -->
<AlertDialog.Root bind:open={deleteDateRangeDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Transactions by Date Range</AlertDialog.Title>
			<AlertDialog.Description>
				Select the date range for transactions you want to delete from "{account.name}".
			</AlertDialog.Description>
		</AlertDialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>Start Date</Label>
					<DateInput bind:value={deleteDateRangeDialog.startDate} />
				</div>
				<div class="space-y-2">
					<Label>End Date</Label>
					<DateInput bind:value={deleteDateRangeDialog.endDate} />
				</div>
			</div>
		</div>
		<AlertDialog.Footer>
			<AlertDialog.Cancel
				disabled={deleteDateRangeDialog.isDeleting}
				onclick={() => {
					deleteDateRangeDialog.startDate = undefined;
					deleteDateRangeDialog.endDate = undefined;
				}}>
				Cancel
			</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmDeleteByDateRange}
				disabled={deleteDateRangeDialog.isDeleting ||
					!deleteDateRangeDialog.startDate ||
					!deleteDateRangeDialog.endDate}>
				{deleteDateRangeDialog.isDeleting ? 'Deleting...' : 'Delete Transactions'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Clear Schedules Dialog -->
<AlertDialog.Root bind:open={clearSchedulesDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive h-5 w-5" />
				Clear All Schedules?
			</AlertDialog.Title>
			<AlertDialog.Description>
				This will remove all <strong>{dataCounts?.schedules || 0}</strong> scheduled transactions
				linked to "{account.name}". This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={clearSchedulesDialog.isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmClearSchedules}
				disabled={clearSchedulesDialog.isDeleting}>
				{clearSchedulesDialog.isDeleting ? 'Clearing...' : 'Clear Schedules'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Clear Import Profiles Dialog -->
<AlertDialog.Root bind:open={clearImportProfilesDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<AlertTriangle class="text-destructive h-5 w-5" />
				Clear Import Profiles?
			</AlertDialog.Title>
			<AlertDialog.Description>
				This will remove all <strong>{dataCounts?.importProfiles || 0}</strong> import profiles
				linked to "{account.name}". Future imports will need new column mappings.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={clearImportProfilesDialog.isDeleting}
				>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmClearImportProfiles}
				disabled={clearImportProfilesDialog.isDeleting}>
				{clearImportProfilesDialog.isDeleting ? 'Clearing...' : 'Clear Profiles'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Clear Patterns Dialog -->
<AlertDialog.Root bind:open={clearPatternsDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Reset Detected Patterns?</AlertDialog.Title>
			<AlertDialog.Description>
				This will clear all <strong>{dataCounts?.detectedPatterns || 0}</strong> detected patterns
				for "{account.name}". The system will automatically detect new patterns based on your
				transactions.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={clearPatternsDialog.isDeleting}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class={buttonVariants({ variant: 'destructive' })}
				onclick={confirmClearPatterns}
				disabled={clearPatternsDialog.isDeleting}>
				{clearPatternsDialog.isDeleting ? 'Clearing...' : 'Reset Patterns'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
