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
import type { Payee } from '$lib/schema/payees';
import type { AliasTrigger, PayeeAliasStats, PayeeAliasWithPayee } from '$lib/schema/payee-aliases';
import { trpc } from '$lib/trpc/client';
import ArrowUpRight from '@lucide/svelte/icons/arrow-up-right';
import Edit from '@lucide/svelte/icons/edit';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import Hash from '@lucide/svelte/icons/hash';
import Link from '@lucide/svelte/icons/link';
import Plus from '@lucide/svelte/icons/plus';
import Search from '@lucide/svelte/icons/search';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Users from '@lucide/svelte/icons/users';
import Zap from '@lucide/svelte/icons/zap';
import { toast } from 'svelte-sonner';

interface PageData {
  aliases: PayeeAliasWithPayee[];
  stats: PayeeAliasStats;
  payees: Payee[];
}

let { data }: { data: PageData } = $props();

const aliases = $derived(data.aliases ?? []);
const stats = $derived(data.stats ?? {
  totalAliases: 0,
  uniquePayees: 0,
  aliasesPerPayee: 0,
  totalMatches: 0,
  mostUsedAliases: [],
  recentlyCreated: 0,
  byTrigger: {} as Record<AliasTrigger, number>,
});
const payees = $derived(data.payees ?? []);

// Create payee lookup map
const payeeMap = $derived(new Map(payees.map((p) => [p.id, p])));

// Filter state
let searchQuery = $state('');
let triggerFilter = $state<AliasTrigger | 'all'>('all');

// Filtered aliases
const filteredAliases = $derived.by(() => {
  let result = aliases;

  // Filter by search query
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    result = result.filter(
      (alias) =>
        alias.rawString.toLowerCase().includes(query) ||
        alias.payee.name.toLowerCase().includes(query)
    );
  }

  // Filter by trigger
  if (triggerFilter !== 'all') {
    result = result.filter((alias) => alias.trigger === triggerFilter);
  }

  return result;
});

// Create alias dialog state
let createDialog = $state({
  open: false,
  rawString: '',
  payeeId: null as number | null,
  isSaving: false,
});

// Edit dialog state
let editDialog = $state({
  open: false,
  alias: null as PayeeAliasWithPayee | null,
  rawString: '',
  payeeId: null as number | null,
  isSaving: false,
});

// Delete dialog state
let deleteDialog = $state({
  open: false,
  alias: null as PayeeAliasWithPayee | null,
  isDeleting: false,
});

function openCreateDialog() {
  createDialog = {
    open: true,
    rawString: '',
    payeeId: null,
    isSaving: false,
  };
}

function closeCreateDialog() {
  createDialog.open = false;
}

async function saveNewAlias() {
  if (!createDialog.rawString.trim() || !createDialog.payeeId) return;

  createDialog.isSaving = true;

  try {
    await trpc().payeeAliasRoutes.create.mutate({
      rawString: createDialog.rawString.trim(),
      payeeId: createDialog.payeeId,
    });

    toast.success('Alias created');
    createDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to create alias:', err);
    toast.error('Failed to create alias');
  } finally {
    createDialog.isSaving = false;
  }
}

function openEditDialog(alias: PayeeAliasWithPayee) {
  editDialog = {
    open: true,
    alias,
    rawString: alias.rawString,
    payeeId: alias.payeeId,
    isSaving: false,
  };
}

function closeEditDialog() {
  editDialog.open = false;
}

async function saveAlias() {
  if (!editDialog.alias || !editDialog.rawString.trim() || !editDialog.payeeId) return;

  editDialog.isSaving = true;

  try {
    await trpc().payeeAliasRoutes.update.mutate({
      id: editDialog.alias.id,
      rawString: editDialog.rawString.trim(),
      payeeId: editDialog.payeeId,
    });

    toast.success('Alias updated');
    editDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to update alias:', err);
    toast.error('Failed to update alias');
  } finally {
    editDialog.isSaving = false;
  }
}

function openDeleteDialog(alias: PayeeAliasWithPayee) {
  deleteDialog = {
    open: true,
    alias,
    isDeleting: false,
  };
}

function closeDeleteDialog() {
  deleteDialog.open = false;
}

async function confirmDelete() {
  if (!deleteDialog.alias) return;

  deleteDialog.isDeleting = true;

  try {
    await trpc().payeeAliasRoutes.delete.mutate({
      id: deleteDialog.alias.id,
    });

    toast.success('Alias deleted');
    deleteDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to delete alias:', err);
    toast.error('Failed to delete alias');
  } finally {
    deleteDialog.isDeleting = false;
  }
}

function formatDate(dateString: string | null): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getTriggerLabel(trigger: AliasTrigger): string {
  switch (trigger) {
    case 'import_confirmation':
      return 'Import';
    case 'transaction_edit':
      return 'Edit';
    case 'manual_creation':
      return 'Manual';
    case 'bulk_import':
      return 'Bulk';
    default:
      return trigger;
  }
}

function getTriggerVariant(trigger: AliasTrigger): 'default' | 'secondary' | 'outline' {
  switch (trigger) {
    case 'import_confirmation':
      return 'default';
    case 'bulk_import':
      return 'default';
    case 'manual_creation':
      return 'secondary';
    case 'transaction_edit':
      return 'outline';
    default:
      return 'outline';
  }
}
</script>

<svelte:head>
  <title>Payee Aliases - Settings</title>
</svelte:head>

<div class="space-y-6" data-help-id="settings-payee-aliases" data-help-title="Payee Aliases">
  <div class="flex items-center justify-between">
    <div>
      <h2 class="text-xl font-semibold">Payee Aliases</h2>
      <p class="text-muted-foreground text-sm">
        Manage mappings from imported strings to payees
      </p>
    </div>
    {#if aliases.length > 0}
      <Button onclick={openCreateDialog}>
        <Plus class="mr-2 h-4 w-4" />
        Add Alias
      </Button>
    {/if}
  </div>

  <!-- Stats Cards -->
  {#if stats.totalAliases > 0}
    <div class="grid gap-4 md:grid-cols-4">
      <Card.Root>
        <Card.Content class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-primary/10 rounded-md p-2">
              <Link class="text-primary h-4 w-4" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs font-medium uppercase">Total Aliases</p>
              <p class="text-2xl font-bold">{stats.totalAliases}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-blue-500/10 rounded-md p-2">
              <Users class="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs font-medium uppercase">Unique Payees</p>
              <p class="text-2xl font-bold">{stats.uniquePayees}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-green-500/10 rounded-md p-2">
              <Zap class="h-4 w-4 text-green-500" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs font-medium uppercase">Total Matches</p>
              <p class="text-2xl font-bold">{stats.totalMatches}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      <Card.Root>
        <Card.Content class="p-4">
          <div class="flex items-center gap-3">
            <div class="bg-orange-500/10 rounded-md p-2">
              <Hash class="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <p class="text-muted-foreground text-xs font-medium uppercase">Avg Per Payee</p>
              <p class="text-2xl font-bold">{stats.aliasesPerPayee.toFixed(1)}</p>
            </div>
          </div>
        </Card.Content>
      </Card.Root>
    </div>
  {/if}

  {#if aliases.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <Link class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Payee Aliases Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Aliases are created automatically when you confirm payee mappings during import, or when
          you change a payee on a transaction. They help the system remember your preferences.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button onclick={openCreateDialog}>
          <Plus class="mr-2 h-4 w-4" />
          Create First Alias
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <!-- Filters -->
    <div class="flex items-center gap-4">
      <div class="relative flex-1 max-w-sm">
        <Search class="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
        <Input
          bind:value={searchQuery}
          placeholder="Search aliases or payees..."
          class="pl-9"
        />
      </div>

      <Select.Root
        type="single"
        value={triggerFilter}
        onValueChange={(value) => (triggerFilter = (value as AliasTrigger | 'all') || 'all')}>
        <Select.Trigger class="w-40">
          {triggerFilter === 'all' ? 'All Sources' : getTriggerLabel(triggerFilter as AliasTrigger)}
        </Select.Trigger>
        <Select.Content>
          <Select.Item value="all">All Sources</Select.Item>
          <Select.Item value="import_confirmation">Import</Select.Item>
          <Select.Item value="transaction_edit">Edit</Select.Item>
          <Select.Item value="manual_creation">Manual</Select.Item>
          <Select.Item value="bulk_import">Bulk</Select.Item>
        </Select.Content>
      </Select.Root>
    </div>

    <!-- Aliases Table -->
    <Card.Root>
      <Card.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Raw String</Table.Head>
              <Table.Head>Payee</Table.Head>
              <Table.Head>Source</Table.Head>
              <Table.Head class="text-center">Matches</Table.Head>
              <Table.Head>Created</Table.Head>
              <Table.Head class="w-[50px]"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each filteredAliases as alias (alias.id)}
              <Table.Row>
                <Table.Cell>
                  <code class="bg-muted rounded px-1.5 py-0.5 text-xs">
                    {alias.rawString.length > 50
                      ? alias.rawString.slice(0, 50) + '...'
                      : alias.rawString}
                  </code>
                </Table.Cell>
                <Table.Cell>
                  <a
                    href="/payees/{alias.payee.slug}"
                    class="hover:text-primary flex items-center gap-1 font-medium hover:underline">
                    {alias.payee.name}
                    <ArrowUpRight class="h-3 w-3" />
                  </a>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={getTriggerVariant(alias.trigger)}>
                    {getTriggerLabel(alias.trigger)}
                  </Badge>
                </Table.Cell>
                <Table.Cell class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <Hash class="text-muted-foreground h-3 w-3" />
                    {alias.matchCount}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span class="text-muted-foreground text-sm">
                    {formatDate(alias.createdAt)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                      {#snippet child({ props })}
                        <Button variant="ghost" size="icon" {...props}>
                          <Ellipsis class="h-4 w-4" />
                        </Button>
                      {/snippet}
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content align="end">
                      <DropdownMenu.Item onclick={() => openEditDialog(alias)}>
                        <Edit class="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        class="text-destructive focus:text-destructive"
                        onclick={() => openDeleteDialog(alias)}>
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
      </Card.Content>
    </Card.Root>

    <p class="text-muted-foreground mt-4 text-center text-sm">
      {filteredAliases.length} of {aliases.length} alias{aliases.length !== 1 ? 'es' : ''}
    </p>
  {/if}
</div>

<!-- Create Alias Dialog -->
<AlertDialog.Root bind:open={createDialog.open}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Create Payee Alias</AlertDialog.Title>
      <AlertDialog.Description>
        Map a raw import string to a payee. Future imports with this string will automatically match.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="create-raw-string">Raw String</Label>
        <Input
          id="create-raw-string"
          bind:value={createDialog.rawString}
          placeholder="e.g., WALMART #1234 DALLAS TX" />
        <p class="text-muted-foreground text-xs">
          The exact string as it appears in your bank exports
        </p>
      </div>

      <div class="space-y-2">
        <Label for="create-payee">Payee</Label>
        <Select.Root
          type="single"
          value={createDialog.payeeId?.toString() ?? ''}
          onValueChange={(value) => {
            createDialog.payeeId = value ? parseInt(value) : null;
          }}>
          <Select.Trigger id="create-payee" class="w-full">
            {#if createDialog.payeeId}
              {payeeMap.get(createDialog.payeeId)?.name ?? 'Select payee...'}
            {:else}
              <span class="text-muted-foreground">Select payee...</span>
            {/if}
          </Select.Trigger>
          <Select.Content>
            {#each payees as payee (payee.id)}
              <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeCreateDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveNewAlias}
        disabled={createDialog.isSaving || !createDialog.rawString.trim() || !createDialog.payeeId}>
        {#if createDialog.isSaving}
          Creating...
        {:else}
          Create Alias
        {/if}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Edit Alias Dialog -->
<AlertDialog.Root bind:open={editDialog.open}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Edit Alias</AlertDialog.Title>
      <AlertDialog.Description>
        Update the raw string or change which payee it maps to.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="edit-raw-string">Raw String</Label>
        <Input
          id="edit-raw-string"
          bind:value={editDialog.rawString}
          placeholder="e.g., WALMART #1234 DALLAS TX" />
      </div>

      <div class="space-y-2">
        <Label for="edit-payee">Payee</Label>
        <Select.Root
          type="single"
          value={editDialog.payeeId?.toString() ?? ''}
          onValueChange={(value) => {
            editDialog.payeeId = value ? parseInt(value) : null;
          }}>
          <Select.Trigger id="edit-payee" class="w-full">
            {#if editDialog.payeeId}
              {payeeMap.get(editDialog.payeeId)?.name ?? 'Select payee...'}
            {:else}
              <span class="text-muted-foreground">Select payee...</span>
            {/if}
          </Select.Trigger>
          <Select.Content>
            {#each payees as payee (payee.id)}
              <Select.Item value={payee.id.toString()}>{payee.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeEditDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveAlias}
        disabled={editDialog.isSaving || !editDialog.rawString.trim() || !editDialog.payeeId}>
        {#if editDialog.isSaving}
          Saving...
        {:else}
          Save Changes
        {/if}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete Alias Dialog -->
<AlertDialog.Root bind:open={deleteDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Alias?</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete this alias? Future imports with "{deleteDialog.alias
          ?.rawString}" will no longer automatically map to "{deleteDialog.alias?.payee.name}".
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeDeleteDialog}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
        onclick={confirmDelete}
        disabled={deleteDialog.isDeleting}>
        {#if deleteDialog.isDeleting}
          Deleting...
        {:else}
          Delete
        {/if}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
