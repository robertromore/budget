<script lang="ts">
import { invalidateAll } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Badge } from '$lib/components/ui/badge';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Empty from '$lib/components/ui/empty';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import * as Table from '$lib/components/ui/table';
import type { Account } from '$lib/schema/accounts';
import type { TransferMappingTrigger, TransferMappingWithAccount, TransferMappingStats } from '$lib/schema/transfer-mappings';
import { trpc } from '$lib/trpc/client';
import ArrowRightLeft from '@lucide/svelte/icons/arrow-right-left';
import Building from '@lucide/svelte/icons/building';
import Edit from '@lucide/svelte/icons/edit';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import Hash from '@lucide/svelte/icons/hash';
import Plus from '@lucide/svelte/icons/plus';
import Search from '@lucide/svelte/icons/search';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Zap from '@lucide/svelte/icons/zap';
import { toast } from '$lib/utils/toast-interceptor';

interface PageData {
  mappings: TransferMappingWithAccount[];
  stats: TransferMappingStats;
  accounts: Account[];
}

let { data }: { data: PageData } = $props();

const mappings = $derived(data.mappings ?? []);
const stats = $derived(data.stats ?? {
  totalMappings: 0,
  uniqueTargetAccounts: 0,
  mappingsPerAccount: 0,
  totalTimesApplied: 0,
  mostUsedMappings: [],
  recentlyCreated: 0,
  byTrigger: {} as Record<TransferMappingTrigger, number>,
});
const accounts = $derived(data.accounts ?? []);

// Create account lookup map
const accountMap = $derived(new Map(accounts.map((a) => [a.id, a])));

// Filter out closed accounts for the selector
const openAccounts = $derived(accounts.filter((a) => !a.closed));

// Filter state
let searchQuery = $state('');
let triggerFilter = $state<TransferMappingTrigger | 'all'>('all');
let accountFilter = $state<number | 'all'>('all');

// Filtered mappings
const filteredMappings = $derived.by(() => {
  let result = mappings;

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(
      (mapping) =>
        mapping.rawPayeeString.toLowerCase().includes(query) ||
        mapping.targetAccount.name?.toLowerCase().includes(query)
    );
  }

  // Filter by trigger
  if (triggerFilter !== 'all') {
    result = result.filter((mapping) => mapping.trigger === triggerFilter);
  }

  // Filter by target account
  if (accountFilter !== 'all') {
    result = result.filter((mapping) => mapping.targetAccountId === accountFilter);
  }

  return result;
});

// Create mapping dialog state
let createDialog = $state({
  open: false,
  rawPayeeString: '',
  targetAccountId: null as number | null,
  isSaving: false,
});

// Edit dialog state
let editDialog = $state({
  open: false,
  mapping: null as TransferMappingWithAccount | null,
  rawPayeeString: '',
  targetAccountId: null as number | null,
  isSaving: false,
});

// Delete dialog state
let deleteDialog = $state({
  open: false,
  mapping: null as TransferMappingWithAccount | null,
  isDeleting: false,
});

function openCreateDialog() {
  createDialog = {
    open: true,
    rawPayeeString: '',
    targetAccountId: null,
    isSaving: false,
  };
}

function closeCreateDialog() {
  createDialog.open = false;
}

async function saveNewMapping() {
  if (!createDialog.rawPayeeString.trim() || !createDialog.targetAccountId) return;

  createDialog.isSaving = true;

  try {
    await trpc().transferMappingRoutes.create.mutate({
      rawPayeeString: createDialog.rawPayeeString.trim(),
      targetAccountId: createDialog.targetAccountId,
    });

    toast.success('Transfer mapping created');
    createDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to create mapping:', err);
    toast.error('Failed to create mapping');
  } finally {
    createDialog.isSaving = false;
  }
}

function openEditDialog(mapping: TransferMappingWithAccount) {
  editDialog = {
    open: true,
    mapping,
    rawPayeeString: mapping.rawPayeeString,
    targetAccountId: mapping.targetAccountId,
    isSaving: false,
  };
}

function closeEditDialog() {
  editDialog.open = false;
}

async function saveMapping() {
  if (!editDialog.mapping || !editDialog.rawPayeeString.trim() || !editDialog.targetAccountId) return;

  editDialog.isSaving = true;

  try {
    await trpc().transferMappingRoutes.update.mutate({
      id: editDialog.mapping.id,
      rawPayeeString: editDialog.rawPayeeString.trim(),
      targetAccountId: editDialog.targetAccountId,
    });

    toast.success('Transfer mapping updated');
    editDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to update mapping:', err);
    toast.error('Failed to update mapping');
  } finally {
    editDialog.isSaving = false;
  }
}

function openDeleteDialog(mapping: TransferMappingWithAccount) {
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
    await invalidateAll();
  } catch (err) {
    console.error('Failed to delete mapping:', err);
    toast.error('Failed to delete mapping');
  } finally {
    deleteDialog.isDeleting = false;
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
</script>

<svelte:head>
  <title>Transfer Mappings | Settings</title>
</svelte:head>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">Transfer Mappings</h2>
      <p class="text-muted-foreground">
        Manage payee-to-account mappings for automatic transfer detection during import.
      </p>
    </div>
    <Button onclick={openCreateDialog}>
      <Plus class="mr-2 h-4 w-4" />
      Add Mapping
    </Button>
  </div>

  <!-- Stats Cards -->
  <div class="grid gap-4 md:grid-cols-4">
    <Card.Root>
      <Card.Content class="p-4">
        <div class="flex items-center gap-3">
          <div class="bg-primary/10 rounded-md p-2">
            <ArrowRightLeft class="text-primary h-4 w-4" />
          </div>
          <div>
            <p class="text-muted-foreground text-xs font-medium uppercase">Total Mappings</p>
            <p class="text-2xl font-bold">{stats.totalMappings}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4">
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-blue-500/10 p-2">
            <Building class="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p class="text-muted-foreground text-xs font-medium uppercase">Target Accounts</p>
            <p class="text-2xl font-bold">{stats.uniqueTargetAccounts}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4">
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-green-500/10 p-2">
            <Hash class="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p class="text-muted-foreground text-xs font-medium uppercase">Times Applied</p>
            <p class="text-2xl font-bold">{stats.totalTimesApplied}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Content class="p-4">
        <div class="flex items-center gap-3">
          <div class="rounded-md bg-orange-500/10 p-2">
            <Zap class="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p class="text-muted-foreground text-xs font-medium uppercase">Recent (30d)</p>
            <p class="text-2xl font-bold">{stats.recentlyCreated}</p>
          </div>
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  <!-- Filters -->
  <div class="flex flex-wrap items-center gap-4">
    <div class="relative max-w-sm flex-1">
      <Search class="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
      <Input
        type="text"
        placeholder="Search payee strings or accounts..."
        bind:value={searchQuery}
        class="pl-9"
      />
    </div>

    <Select.Root type="single" bind:value={triggerFilter}>
      <Select.Trigger class="w-[180px]">
        {#if triggerFilter === 'all'}
          All Sources
        {:else}
          {getTriggerLabel(triggerFilter)}
        {/if}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all">All Sources</Select.Item>
        <Select.Item value="manual_conversion">Manual</Select.Item>
        <Select.Item value="import_confirmation">Import</Select.Item>
        <Select.Item value="transaction_edit">Edit</Select.Item>
        <Select.Item value="bulk_import">Bulk</Select.Item>
      </Select.Content>
    </Select.Root>

    <Select.Root type="single" bind:value={accountFilter}>
      <Select.Trigger class="w-[200px]">
        {#if accountFilter === 'all'}
          All Accounts
        {:else}
          {accountMap.get(accountFilter)?.name ?? 'Unknown'}
        {/if}
      </Select.Trigger>
      <Select.Content>
        <Select.Item value="all">All Accounts</Select.Item>
        {#each openAccounts as account}
          <Select.Item value={account.id}>{account.name}</Select.Item>
        {/each}
      </Select.Content>
    </Select.Root>
  </div>

  <!-- Data Table -->
  {#if filteredMappings.length === 0}
    {#if mappings.length === 0}
      <Empty.Empty>
        <Empty.Icon icon={ArrowRightLeft} />
        <Empty.Title>No transfer mappings yet</Empty.Title>
        <Empty.Description>
          Transfer mappings are created when you convert transactions to transfers during import.
          You can also create them manually.
        </Empty.Description>
        <Empty.Actions>
          <Button onclick={openCreateDialog}>
            <Plus class="mr-2 h-4 w-4" />
            Add Mapping
          </Button>
        </Empty.Actions>
      </Empty.Empty>
    {:else}
      <Empty.Empty>
        <Empty.Icon icon={Search} />
        <Empty.Title>No matching mappings</Empty.Title>
        <Empty.Description>
          Try adjusting your search or filters.
        </Empty.Description>
      </Empty.Empty>
    {/if}
  {:else}
    <Card.Root>
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Payee String</Table.Head>
            <Table.Head>Target Account</Table.Head>
            <Table.Head>Source</Table.Head>
            <Table.Head class="text-right">Matches</Table.Head>
            <Table.Head>Last Applied</Table.Head>
            <Table.Head class="w-[50px]"></Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {#each filteredMappings as mapping}
            <Table.Row>
              <Table.Cell class="font-mono text-sm">
                {mapping.rawPayeeString}
              </Table.Cell>
              <Table.Cell>
                <div class="flex items-center gap-2">
                  {#if mapping.targetAccount.accountIcon}
                    <span>{mapping.targetAccount.accountIcon}</span>
                  {/if}
                  <span>{mapping.targetAccount.name}</span>
                </div>
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
  {/if}
</div>

<!-- Create Dialog -->
<AlertDialog.Root bind:open={createDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Create Transfer Mapping</AlertDialog.Title>
      <AlertDialog.Description>
        Create a mapping from a payee string to a target account. During import, transactions
        matching this payee will be suggested as transfers to the target account.
      </AlertDialog.Description>
    </AlertDialog.Header>

    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="create-payee-string">Payee String</Label>
        <Input
          id="create-payee-string"
          placeholder="e.g., VENMO PAYMENT"
          bind:value={createDialog.rawPayeeString}
        />
        <p class="text-muted-foreground text-xs">
          The exact or partial payee string to match during import.
        </p>
      </div>

      <div class="space-y-2">
        <Label for="create-target-account">Target Account</Label>
        <Select.Root type="single" bind:value={createDialog.targetAccountId}>
          <Select.Trigger id="create-target-account">
            {#if createDialog.targetAccountId}
              {accountMap.get(createDialog.targetAccountId)?.name ?? 'Select account'}
            {:else}
              Select account
            {/if}
          </Select.Trigger>
          <Select.Content>
            {#each openAccounts as account}
              <Select.Item value={account.id}>{account.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeCreateDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveNewMapping}
        disabled={createDialog.isSaving || !createDialog.rawPayeeString.trim() || !createDialog.targetAccountId}
      >
        {createDialog.isSaving ? 'Creating...' : 'Create Mapping'}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Edit Dialog -->
<AlertDialog.Root bind:open={editDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Edit Transfer Mapping</AlertDialog.Title>
      <AlertDialog.Description>
        Update the payee string or target account for this mapping.
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

      <div class="space-y-2">
        <Label for="edit-target-account">Target Account</Label>
        <Select.Root type="single" bind:value={editDialog.targetAccountId}>
          <Select.Trigger id="edit-target-account">
            {#if editDialog.targetAccountId}
              {accountMap.get(editDialog.targetAccountId)?.name ?? 'Select account'}
            {:else}
              Select account
            {/if}
          </Select.Trigger>
          <Select.Content>
            {#each openAccounts as account}
              <Select.Item value={account.id}>{account.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>

    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeEditDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveMapping}
        disabled={editDialog.isSaving || !editDialog.rawPayeeString.trim() || !editDialog.targetAccountId}
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
        Are you sure you want to delete this mapping? This payee string will no longer be
        automatically suggested as a transfer during import.
      </AlertDialog.Description>
    </AlertDialog.Header>

    {#if deleteDialog.mapping}
      <div class="bg-muted rounded-md p-4">
        <p class="font-mono text-sm">{deleteDialog.mapping.rawPayeeString}</p>
        <p class="text-muted-foreground mt-1 text-sm">
          → {deleteDialog.mapping.targetAccount.name}
        </p>
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
