<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Empty from '$lib/components/ui/empty';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Table from '$lib/components/ui/table';
import * as Tabs from '$lib/components/ui/tabs';
import type { Account } from '$lib/schema/accounts';
import type { TransferMapping, TransferMappingTrigger, TransferMappingWithAccount } from '$lib/schema/transfer-mappings';
import { trpc } from '$lib/trpc/client';
import ArrowDownLeft from '@lucide/svelte/icons/arrow-down-left';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
import Edit from '@lucide/svelte/icons/edit';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import ExternalLink from '@lucide/svelte/icons/external-link';
import Search from '@lucide/svelte/icons/search';
import Trash2 from '@lucide/svelte/icons/trash-2';
import { toast } from '$lib/utils/toast-interceptor';

interface Props {
	account: Account;
}

let { account }: Props = $props();

// Tab state
let activeTab = $state<'incoming' | 'outgoing'>('outgoing');

// Load mappings for this account - both directions
let incomingMappings = $state<TransferMapping[]>([]); // Target = this account (payees transfer TO here)
let outgoingMappings = $state<TransferMappingWithAccount[]>([]); // Source = this account (payees transfer FROM here)
let isLoading = $state(true);

$effect(() => {
	loadMappings();
});

async function loadMappings() {
	isLoading = true;
	try {
		const [incoming, outgoing] = await Promise.all([
			trpc().transferMappingRoutes.forAccount.query({ targetAccountId: account.id }),
			trpc().transferMappingRoutes.fromAccount.query({ sourceAccountId: account.id })
		]);
		incomingMappings = incoming;
		outgoingMappings = outgoing;
	} catch (error) {
		console.error('Failed to load transfer mappings:', error);
		toast.error('Failed to load transfer mappings');
	} finally {
		isLoading = false;
	}
}

// Filter state
let searchQuery = $state('');

// Filtered mappings for each tab
const filteredIncoming = $derived.by(() => {
	if (!searchQuery.trim()) return incomingMappings;
	const query = searchQuery.toLowerCase().trim();
	return incomingMappings.filter((m) => m.rawPayeeString.toLowerCase().includes(query));
});

const filteredOutgoing = $derived.by(() => {
	if (!searchQuery.trim()) return outgoingMappings;
	const query = searchQuery.toLowerCase().trim();
	return outgoingMappings.filter((m) =>
		m.rawPayeeString.toLowerCase().includes(query) ||
		m.targetAccount?.name?.toLowerCase().includes(query)
	);
});

// Edit dialog state
let editDialog = $state({
	open: false,
	mapping: null as TransferMapping | TransferMappingWithAccount | null,
	rawPayeeString: '',
	isSaving: false,
});

// Delete dialog state
let deleteDialog = $state({
	open: false,
	mapping: null as TransferMapping | TransferMappingWithAccount | null,
	isDeleting: false,
});

// Delete all dialog state
let deleteAllDialog = $state({
	open: false,
	isDeleting: false,
	type: 'incoming' as 'incoming' | 'outgoing',
});

function openEditDialog(mapping: TransferMapping | TransferMappingWithAccount) {
	editDialog = {
		open: true,
		mapping,
		rawPayeeString: mapping.rawPayeeString,
		isSaving: false,
	};
}

function closeEditDialog() {
	editDialog.open = false;
}

async function saveMapping() {
	if (!editDialog.mapping || !editDialog.rawPayeeString.trim()) return;

	editDialog.isSaving = true;

	try {
		await trpc().transferMappingRoutes.update.mutate({
			id: editDialog.mapping.id,
			rawPayeeString: editDialog.rawPayeeString.trim(),
		});

		toast.success('Transfer mapping updated');
		editDialog.open = false;
		await loadMappings();
	} catch (err) {
		console.error('Failed to update mapping:', err);
		toast.error('Failed to update mapping');
	} finally {
		editDialog.isSaving = false;
	}
}

function openDeleteDialog(mapping: TransferMapping | TransferMappingWithAccount) {
	deleteDialog = {
		open: true,
		mapping,
		isDeleting: false,
	};
}

function closeDeleteDialog() {
	deleteDialog.open = false;
}

async function confirmDelete() {
	if (!deleteDialog.mapping) return;

	deleteDialog.isDeleting = true;

	try {
		await trpc().transferMappingRoutes.delete.mutate({
			id: deleteDialog.mapping.id,
		});

		toast.success('Transfer mapping deleted');
		deleteDialog.open = false;
		await loadMappings();
	} catch (err) {
		console.error('Failed to delete mapping:', err);
		toast.error('Failed to delete mapping');
	} finally {
		deleteDialog.isDeleting = false;
	}
}

function openDeleteAllDialog(type: 'incoming' | 'outgoing') {
	deleteAllDialog = {
		open: true,
		isDeleting: false,
		type,
	};
}

function closeDeleteAllDialog() {
	deleteAllDialog.open = false;
}

async function confirmDeleteAll() {
	deleteAllDialog.isDeleting = true;

	try {
		if (deleteAllDialog.type === 'incoming') {
			await trpc().transferMappingRoutes.deleteForAccount.mutate({
				targetAccountId: account.id,
			});
		} else {
			// Delete outgoing mappings one by one (no bulk delete for source account)
			for (const mapping of outgoingMappings) {
				await trpc().transferMappingRoutes.delete.mutate({ id: mapping.id });
			}
		}

		toast.success(`All ${deleteAllDialog.type} transfer mappings deleted`);
		deleteAllDialog.open = false;
		await loadMappings();
	} catch (err) {
		console.error('Failed to delete mappings:', err);
		toast.error('Failed to delete mappings');
	} finally {
		deleteAllDialog.isDeleting = false;
	}
}

function getTriggerLabel(trigger: TransferMappingTrigger): string {
	switch (trigger) {
		case 'manual_conversion':
			return 'Manual';
		case 'import_confirmation':
			return 'Import';
		case 'transaction_edit':
			return 'Edit';
		case 'bulk_import':
			return 'Bulk';
		default:
			return trigger;
	}
}

function getTriggerVariant(trigger: TransferMappingTrigger): 'default' | 'secondary' | 'outline' {
	switch (trigger) {
		case 'manual_conversion':
			return 'default';
		case 'import_confirmation':
			return 'secondary';
		default:
			return 'outline';
	}
}

function formatDate(dateString: string | null): string {
	if (!dateString) return 'Never';
	return new Date(dateString).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

const totalMappings = $derived(incomingMappings.length + outgoingMappings.length);
</script>

<div class="space-y-6">
	<div>
		<h3 class="text-lg font-medium">Transfer Mappings</h3>
		<p class="text-muted-foreground text-sm">
			Payee strings that automatically convert to transfers during import.
		</p>
	</div>

	{#if isLoading}
		<Card.Root>
			<Card.Content class="flex items-center justify-center py-8">
				<div class="text-muted-foreground">Loading...</div>
			</Card.Content>
		</Card.Root>
	{:else if totalMappings === 0}
		<Empty.Empty>
			<Empty.Icon icon={ArrowRightLeft} />
			<Empty.Title>No transfer mappings</Empty.Title>
			<Empty.Description>
				No payee strings are configured to transfer to or from this account.
				Create mappings by converting transactions to transfers during import.
			</Empty.Description>
			<Empty.Actions>
				<Button variant="outline" href="/settings/transfer-mappings">
					<ExternalLink class="mr-2 h-4 w-4" />
					Manage All Mappings
				</Button>
			</Empty.Actions>
		</Empty.Empty>
	{:else}
		<Tabs.Root bind:value={activeTab}>
			<div class="flex items-center justify-between gap-4 mb-4">
				<Tabs.List>
					<Tabs.Trigger value="outgoing" class="gap-2">
						<ArrowUpRight class="h-4 w-4" />
						Outgoing ({outgoingMappings.length})
					</Tabs.Trigger>
					<Tabs.Trigger value="incoming" class="gap-2">
						<ArrowDownLeft class="h-4 w-4" />
						Incoming ({incomingMappings.length})
					</Tabs.Trigger>
				</Tabs.List>

				<Button variant="outline" size="sm" href="/settings/transfer-mappings">
					<ExternalLink class="mr-2 h-4 w-4" />
					View All
				</Button>
			</div>

			<!-- Search -->
			<div class="relative max-w-sm mb-4">
				<Search class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
				<Input
					type="text"
					placeholder="Search payee strings..."
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<!-- Outgoing Tab (imports FROM this account) -->
			<Tabs.Content value="outgoing">
				{#if outgoingMappings.length === 0}
					<Card.Root>
						<Card.Content class="py-8 text-center">
							<p class="text-muted-foreground text-sm">
								No outgoing transfer mappings. When you import transactions and mark them as transfers,
								those payee mappings will appear here.
							</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<p class="text-muted-foreground text-sm">
								{outgoingMappings.length} payee string{outgoingMappings.length !== 1 ? 's' : ''} from imports into {account.name}
							</p>
							<Button variant="destructive" size="sm" onclick={() => openDeleteAllDialog('outgoing')}>
								<Trash2 class="mr-2 h-4 w-4" />
								Clear All
							</Button>
						</div>

						<Card.Root>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Payee String</Table.Head>
										<Table.Head>Transfers To</Table.Head>
										<Table.Head>Source</Table.Head>
										<Table.Head class="text-right">Matches</Table.Head>
										<Table.Head>Last Applied</Table.Head>
										<Table.Head class="w-[50px]"></Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each filteredOutgoing as mapping}
										<Table.Row>
											<Table.Cell class="font-mono text-sm">
												{mapping.rawPayeeString}
											</Table.Cell>
											<Table.Cell>
												<a
													href="/accounts/{mapping.targetAccount?.slug}"
													class="text-primary hover:underline"
												>
													{mapping.targetAccount?.name || 'Unknown'}
												</a>
											</Table.Cell>
											<Table.Cell>
												<Badge variant={getTriggerVariant(mapping.trigger)}>
													{getTriggerLabel(mapping.trigger)}
												</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">
												{mapping.matchCount}
											</Table.Cell>
											<Table.Cell class="text-muted-foreground text-sm">
												{formatDate(mapping.lastAppliedAt)}
											</Table.Cell>
											<Table.Cell>
												<DropdownMenu.Root>
													<DropdownMenu.Trigger>
														<Button variant="ghost" size="icon" class="h-8 w-8">
															<Ellipsis class="h-4 w-4" />
															<span class="sr-only">Actions</span>
														</Button>
													</DropdownMenu.Trigger>
													<DropdownMenu.Content align="end">
														<DropdownMenu.Item onclick={() => openEditDialog(mapping)}>
															<Edit class="mr-2 h-4 w-4" />
															Edit
														</DropdownMenu.Item>
														<DropdownMenu.Separator />
														<DropdownMenu.Item
															class="text-destructive focus:text-destructive"
															onclick={() => openDeleteDialog(mapping)}
														>
															<Trash2 class="mr-2 h-4 w-4" />
															Delete
														</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Root>
					</div>
				{/if}
			</Tabs.Content>

			<!-- Incoming Tab (transfers TO this account) -->
			<Tabs.Content value="incoming">
				{#if incomingMappings.length === 0}
					<Card.Root>
						<Card.Content class="py-8 text-center">
							<p class="text-muted-foreground text-sm">
								No incoming transfer mappings. When someone imports transactions from another account
								and marks them as transfers to this account, those mappings will appear here.
							</p>
						</Card.Content>
					</Card.Root>
				{:else}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<p class="text-muted-foreground text-sm">
								{incomingMappings.length} payee string{incomingMappings.length !== 1 ? 's' : ''} will transfer to {account.name}
							</p>
							<Button variant="destructive" size="sm" onclick={() => openDeleteAllDialog('incoming')}>
								<Trash2 class="mr-2 h-4 w-4" />
								Clear All
							</Button>
						</div>

						<Card.Root>
							<Table.Root>
								<Table.Header>
									<Table.Row>
										<Table.Head>Payee String</Table.Head>
										<Table.Head>Source</Table.Head>
										<Table.Head class="text-right">Matches</Table.Head>
										<Table.Head>Last Applied</Table.Head>
										<Table.Head class="w-[50px]"></Table.Head>
									</Table.Row>
								</Table.Header>
								<Table.Body>
									{#each filteredIncoming as mapping}
										<Table.Row>
											<Table.Cell class="font-mono text-sm">
												{mapping.rawPayeeString}
											</Table.Cell>
											<Table.Cell>
												<Badge variant={getTriggerVariant(mapping.trigger)}>
													{getTriggerLabel(mapping.trigger)}
												</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">
												{mapping.matchCount}
											</Table.Cell>
											<Table.Cell class="text-muted-foreground text-sm">
												{formatDate(mapping.lastAppliedAt)}
											</Table.Cell>
											<Table.Cell>
												<DropdownMenu.Root>
													<DropdownMenu.Trigger>
														<Button variant="ghost" size="icon" class="h-8 w-8">
															<Ellipsis class="h-4 w-4" />
															<span class="sr-only">Actions</span>
														</Button>
													</DropdownMenu.Trigger>
													<DropdownMenu.Content align="end">
														<DropdownMenu.Item onclick={() => openEditDialog(mapping)}>
															<Edit class="mr-2 h-4 w-4" />
															Edit
														</DropdownMenu.Item>
														<DropdownMenu.Separator />
														<DropdownMenu.Item
															class="text-destructive focus:text-destructive"
															onclick={() => openDeleteDialog(mapping)}
														>
															<Trash2 class="mr-2 h-4 w-4" />
															Delete
														</DropdownMenu.Item>
													</DropdownMenu.Content>
												</DropdownMenu.Root>
											</Table.Cell>
										</Table.Row>
									{/each}
								</Table.Body>
							</Table.Root>
						</Card.Root>
					</div>
				{/if}
			</Tabs.Content>
		</Tabs.Root>
	{/if}
</div>

<!-- Edit Dialog -->
<AlertDialog.Root bind:open={editDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Edit Transfer Mapping</AlertDialog.Title>
			<AlertDialog.Description>
				Update the payee string for this mapping.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<div class="space-y-4 py-4">
			<div class="space-y-2">
				<Label for="edit-payee-string">Payee String</Label>
				<Input
					id="edit-payee-string"
					bind:value={editDialog.rawPayeeString}
				/>
			</div>
		</div>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={closeEditDialog}>Cancel</AlertDialog.Cancel>
			<Button
				onclick={saveMapping}
				disabled={editDialog.isSaving || !editDialog.rawPayeeString.trim()}
			>
				{editDialog.isSaving ? 'Saving...' : 'Save Changes'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete Dialog -->
<AlertDialog.Root bind:open={deleteDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete Transfer Mapping</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete this mapping? This payee string will no longer
				automatically create transfers during import.
			</AlertDialog.Description>
		</AlertDialog.Header>

		{#if deleteDialog.mapping}
			<div class="bg-muted rounded-md p-4">
				<p class="font-mono text-sm">{deleteDialog.mapping.rawPayeeString}</p>
			</div>
		{/if}

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={closeDeleteDialog}>Cancel</AlertDialog.Cancel>
			<Button
				variant="destructive"
				onclick={confirmDelete}
				disabled={deleteDialog.isDeleting}
			>
				{deleteDialog.isDeleting ? 'Deleting...' : 'Delete Mapping'}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete All Dialog -->
<AlertDialog.Root bind:open={deleteAllDialog.open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Delete All {deleteAllDialog.type === 'incoming' ? 'Incoming' : 'Outgoing'} Mappings</AlertDialog.Title>
			<AlertDialog.Description>
				Are you sure you want to delete all {deleteAllDialog.type === 'incoming' ? incomingMappings.length : outgoingMappings.length} {deleteAllDialog.type} transfer mapping{(deleteAllDialog.type === 'incoming' ? incomingMappings.length : outgoingMappings.length) !== 1 ? 's' : ''} for {account.name}?
				This action cannot be undone.
			</AlertDialog.Description>
		</AlertDialog.Header>

		<AlertDialog.Footer>
			<AlertDialog.Cancel onclick={closeDeleteAllDialog}>Cancel</AlertDialog.Cancel>
			<Button
				variant="destructive"
				onclick={confirmDeleteAll}
				disabled={deleteAllDialog.isDeleting}
			>
				{deleteAllDialog.isDeleting ? 'Deleting...' : `Delete All`}
			</Button>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
