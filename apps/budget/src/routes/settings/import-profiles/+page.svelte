<script lang="ts">
import { invalidateAll } from '$app/navigation';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Checkbox } from '$lib/components/ui/checkbox';
import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
import * as Empty from '$lib/components/ui/empty';
import { Input } from '$lib/components/ui/input';
import { Label } from '$lib/components/ui/label';
import * as Select from '$lib/components/ui/select';
import * as Table from '$lib/components/ui/table';
import type { Account } from '$lib/schema/accounts';
import type { ColumnMapping, ImportProfile } from '$lib/schema/import-profiles';
import { trpc } from '$lib/trpc/client';
import ArrowRight from '@lucide/svelte/icons/arrow-right';
import Calendar from '@lucide/svelte/icons/calendar';
import Edit from '@lucide/svelte/icons/edit';
import Ellipsis from '@lucide/svelte/icons/ellipsis';
import FileSpreadsheet from '@lucide/svelte/icons/file-spreadsheet';
import Hash from '@lucide/svelte/icons/hash';
import Star from '@lucide/svelte/icons/star';
import Trash2 from '@lucide/svelte/icons/trash-2';
import Upload from '@lucide/svelte/icons/upload';
import { toast } from '$lib/utils/toast-interceptor';

interface PageData {
  importProfiles: ImportProfile[];
  accounts: Account[];
}

let { data }: { data: PageData } = $props();

const profiles = $derived(data.importProfiles);
const accounts = $derived(data.accounts);

// Create account lookup map
const accountMap = $derived(new Map(accounts.map((a) => [a.id, a])));

// Edit dialog state
let editDialog = $state({
  open: false,
  profile: null as ImportProfile | null,
  name: '',
  filenamePattern: '',
  accountId: null as number | null,
  isAccountDefault: false,
  isSaving: false,
});

// Delete dialog state
let deleteDialog = $state({
  open: false,
  profile: null as ImportProfile | null,
  isDeleting: false,
});

function openEditDialog(profile: ImportProfile) {
  editDialog = {
    open: true,
    profile,
    name: profile.name,
    filenamePattern: profile.filenamePattern || '',
    accountId: profile.accountId,
    isAccountDefault: profile.isAccountDefault ?? false,
    isSaving: false,
  };
}

function closeEditDialog() {
  editDialog.open = false;
}

async function saveProfile() {
  if (!editDialog.profile || !editDialog.name.trim()) return;

  editDialog.isSaving = true;

  try {
    await trpc().importProfileRoutes.update.mutate({
      id: editDialog.profile.id,
      name: editDialog.name.trim(),
      filenamePattern: editDialog.filenamePattern.trim() || null,
      accountId: editDialog.accountId,
      isAccountDefault: editDialog.isAccountDefault,
    });

    toast.success('Import profile updated');
    editDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to update import profile:', err);
    toast.error('Failed to update import profile');
  } finally {
    editDialog.isSaving = false;
  }
}

function openDeleteDialog(profile: ImportProfile) {
  deleteDialog = {
    open: true,
    profile,
    isDeleting: false,
  };
}

function closeDeleteDialog() {
  deleteDialog.open = false;
}

async function confirmDelete() {
  if (!deleteDialog.profile) return;

  deleteDialog.isDeleting = true;

  try {
    await trpc().importProfileRoutes.delete.mutate({
      id: deleteDialog.profile.id,
    });

    toast.success('Import profile deleted');
    deleteDialog.open = false;
    await invalidateAll();
  } catch (err) {
    console.error('Failed to delete import profile:', err);
    toast.error('Failed to delete import profile');
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

function formatColumnSignature(signature: string | null): string {
  if (!signature) return '-';
  const columns = signature.split('|');
  if (columns.length <= 3) {
    return columns.join(', ');
  }
  return `${columns.slice(0, 3).join(', ')} +${columns.length - 3} more`;
}

// Field label mapping for display
const fieldLabels: Record<keyof ColumnMapping, string> = {
  date: 'Date',
  description: 'Description',
  amount: 'Amount',
  // Schema naming convention
  inflow: 'Inflow (Credit)',
  outflow: 'Outflow (Debit)',
  memo: 'Memo',
  // UI naming convention (aliases)
  credit: 'Credit (Inflow)',
  debit: 'Debit (Outflow)',
  notes: 'Notes/Memo',
  // Common fields
  payee: 'Payee',
  category: 'Category',
  status: 'Status',
};

// Get mapped fields from a profile's mapping
function getMappedFields(mapping: ColumnMapping | null | undefined): Array<{ field: string; csvColumn: string }> {
  if (!mapping) return [];

  const result: Array<{ field: string; csvColumn: string }> = [];
  for (const [key, value] of Object.entries(mapping)) {
    if (value) {
      result.push({
        field: fieldLabels[key as keyof ColumnMapping] || key,
        csvColumn: value,
      });
    }
  }
  return result;
}
</script>

<svelte:head>
  <title>Import Profiles - Settings</title>
</svelte:head>

<div class="space-y-6" data-help-id="settings-import-profiles" data-help-title="Import Profiles">
  <div>
    <h2 class="text-xl font-semibold">Import Profiles</h2>
    <p class="text-muted-foreground text-sm">
      Manage your saved column mappings for CSV imports
    </p>
  </div>

  {#if profiles.length === 0}
    <Empty.Empty>
      <Empty.EmptyMedia variant="icon">
        <FileSpreadsheet class="size-6" />
      </Empty.EmptyMedia>
      <Empty.EmptyHeader>
        <Empty.EmptyTitle>No Import Profiles Yet</Empty.EmptyTitle>
        <Empty.EmptyDescription>
          Import profiles are created automatically when you import CSV files. They remember your
          column mappings for future imports with similar files.
        </Empty.EmptyDescription>
      </Empty.EmptyHeader>
      <Empty.EmptyContent>
        <Button href="/import">
          <Upload class="mr-2 h-4 w-4" />
          Import Transactions
        </Button>
      </Empty.EmptyContent>
    </Empty.Empty>
  {:else}
    <Card.Root>
      <Card.Content class="p-0">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Name</Table.Head>
              <Table.Head>Columns</Table.Head>
              <Table.Head>Filename Pattern</Table.Head>
              <Table.Head>Account</Table.Head>
              <Table.Head class="text-center">Uses</Table.Head>
              <Table.Head>Last Used</Table.Head>
              <Table.Head class="w-[50px]"></Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {#each profiles as profile (profile.id)}
              {@const account = profile.accountId ? accountMap.get(profile.accountId) : null}
              <Table.Row>
                <Table.Cell class="font-medium">
                  <div class="flex items-center gap-2">
                    {profile.name}
                    {#if profile.isAccountDefault}
                      <Star class="text-warning h-3.5 w-3.5 fill-current" />
                    {/if}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <span class="text-muted-foreground text-xs font-mono">
                    {formatColumnSignature(profile.columnSignature)}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  {#if profile.filenamePattern}
                    <code class="bg-muted rounded px-1.5 py-0.5 text-xs">
                      {profile.filenamePattern}
                    </code>
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </Table.Cell>
                <Table.Cell>
                  {#if account}
                    <span class="text-sm">{account.name}</span>
                  {:else}
                    <span class="text-muted-foreground">-</span>
                  {/if}
                </Table.Cell>
                <Table.Cell class="text-center">
                  <div class="flex items-center justify-center gap-1">
                    <Hash class="text-muted-foreground h-3 w-3" />
                    {profile.useCount ?? 0}
                  </div>
                </Table.Cell>
                <Table.Cell>
                  <div class="flex items-center gap-1">
                    <Calendar class="text-muted-foreground h-3 w-3" />
                    <span class="text-muted-foreground text-sm">
                      {formatDate(profile.lastUsedAt)}
                    </span>
                  </div>
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
                      <DropdownMenu.Item onclick={() => openEditDialog(profile)}>
                        <Edit class="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenu.Item>
                      <DropdownMenu.Separator />
                      <DropdownMenu.Item
                        class="text-destructive focus:text-destructive"
                        onclick={() => openDeleteDialog(profile)}>
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
      {profiles.length} import profile{profiles.length !== 1 ? 's' : ''}
    </p>
  {/if}
</div>

<!-- Edit Profile Dialog -->
<AlertDialog.Root bind:open={editDialog.open}>
  <AlertDialog.Content class="max-w-md">
    <AlertDialog.Header>
      <AlertDialog.Title>Edit Import Profile</AlertDialog.Title>
      <AlertDialog.Description>
        Update the settings for this import profile.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <div class="space-y-4 py-4">
      <div class="space-y-2">
        <Label for="edit-profile-name">Profile Name</Label>
        <Input
          id="edit-profile-name"
          bind:value={editDialog.name}
          placeholder="e.g., Chase Credit Card" />
      </div>

      <div class="space-y-2">
        <Label for="edit-filename-pattern">Filename Pattern (optional)</Label>
        <Input
          id="edit-filename-pattern"
          bind:value={editDialog.filenamePattern}
          placeholder="e.g., chase_*.csv" />
        <p class="text-muted-foreground text-xs">
          Use * as a wildcard to match any characters in filenames
        </p>
      </div>

      <div class="space-y-2">
        <Label for="edit-account">Associated Account (optional)</Label>
        <Select.Root
          type="single"
          value={editDialog.accountId?.toString() ?? ''}
          onValueChange={(value) => {
            editDialog.accountId = value ? parseInt(value) : null;
            if (!value) editDialog.isAccountDefault = false;
          }}>
          <Select.Trigger id="edit-account" class="w-full">
            {#if editDialog.accountId}
              {accountMap.get(editDialog.accountId)?.name ?? 'Select account...'}
            {:else}
              <span class="text-muted-foreground">No account</span>
            {/if}
          </Select.Trigger>
          <Select.Content>
            <Select.Item value="">No account</Select.Item>
            {#each accounts as account}
              <Select.Item value={account.id.toString()}>{account.name}</Select.Item>
            {/each}
          </Select.Content>
        </Select.Root>
      </div>

      {#if editDialog.accountId}
        <div class="flex items-start gap-2">
          <Checkbox
            id="edit-account-default"
            checked={editDialog.isAccountDefault}
            onCheckedChange={(checked) => (editDialog.isAccountDefault = !!checked)} />
          <div class="grid gap-1.5 leading-none">
            <Label for="edit-account-default" class="text-sm font-medium">
              Default profile for this account
            </Label>
            <p class="text-muted-foreground text-xs">
              Automatically use this profile when importing to this account
            </p>
          </div>
        </div>
      {/if}

      <!-- Column Mappings Display -->
      {#if editDialog.profile?.mapping}
        {@const mappedFields = getMappedFields(editDialog.profile.mapping)}
        {#if mappedFields.length > 0}
          <div class="space-y-2">
            <Label>Column Mappings</Label>
            <div class="bg-muted/50 rounded-md border p-3">
              <div class="grid gap-2">
                {#each mappedFields as { field, csvColumn }}
                  <div class="flex items-center gap-2 text-sm">
                    <code class="bg-background rounded px-1.5 py-0.5 text-xs">{csvColumn}</code>
                    <ArrowRight class="text-muted-foreground h-3 w-3 shrink-0" />
                    <span class="text-muted-foreground">{field}</span>
                  </div>
                {/each}
              </div>
            </div>
            <p class="text-muted-foreground text-xs">
              These mappings are set during import and cannot be edited here.
            </p>
          </div>
        {/if}
      {/if}
    </div>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={closeEditDialog}>Cancel</AlertDialog.Cancel>
      <Button
        onclick={saveProfile}
        disabled={editDialog.isSaving || !editDialog.name.trim()}>
        {#if editDialog.isSaving}
          Saving...
        {:else}
          Save Changes
        {/if}
      </Button>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>

<!-- Delete Profile Dialog -->
<AlertDialog.Root bind:open={deleteDialog.open}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Import Profile?</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{deleteDialog.profile?.name}"? This action cannot be undone.
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
