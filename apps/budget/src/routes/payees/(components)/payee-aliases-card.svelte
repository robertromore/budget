<script lang="ts">
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { Input } from '$lib/components/ui/input';
import {
  createPayeeAlias,
  deletePayeeAlias,
  getAliasesForPayee,
} from '$lib/query/payee-aliases';
import type { PayeeAlias } from '$lib/schema/payee-aliases';
import Link from '@lucide/svelte/icons/link';
import Plus from '@lucide/svelte/icons/plus';
import Trash2 from '@lucide/svelte/icons/trash-2';
import { toast } from '$lib/utils/toast-interceptor';

interface Props {
  payeeId: number;
  payeeName: string;
}

let { payeeId, payeeName }: Props = $props();

// Query for aliases
const aliasesQuery = $derived(getAliasesForPayee(payeeId).options());
const aliases = $derived(aliasesQuery.data ?? []);
const isLoading = $derived(aliasesQuery.isLoading);

// Mutations
const createMutation = createPayeeAlias.options();
const deleteMutation = deletePayeeAlias.options();

// State for adding new alias
let showAddForm = $state(false);
let newAliasValue = $state('');
let isAdding = $state(false);

// State for delete confirmation
let deleteDialogOpen = $state(false);
let aliasToDelete = $state<PayeeAlias | null>(null);
let isDeleting = $state(false);

async function handleAddAlias() {
  if (!newAliasValue.trim()) return;

  isAdding = true;
  try {
    await createMutation.mutateAsync({
      rawString: newAliasValue.trim(),
      payeeId,
    });
    newAliasValue = '';
    showAddForm = false;
    toast.success('Alias added');
  } catch (error) {
    console.error('Failed to add alias:', error);
    toast.error('Failed to add alias');
  } finally {
    isAdding = false;
  }
}

function confirmDelete(alias: PayeeAlias) {
  aliasToDelete = alias;
  deleteDialogOpen = true;
}

async function handleDelete() {
  if (!aliasToDelete) return;

  isDeleting = true;
  try {
    await deleteMutation.mutateAsync(aliasToDelete.id);
    toast.success('Alias deleted');
    deleteDialogOpen = false;
    aliasToDelete = null;
  } catch (error) {
    console.error('Failed to delete alias:', error);
    toast.error('Failed to delete alias');
  } finally {
    isDeleting = false;
  }
}

function getTriggerLabel(trigger: string): string {
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
</script>

<Card.Root>
  <Card.Header>
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2">
        <Link class="h-4 w-4" />
        Import Aliases
      </Card.Title>
      <Button variant="outline" size="sm" onclick={() => (showAddForm = !showAddForm)}>
        <Plus class="h-4 w-4" />
      </Button>
    </div>
    <Card.Description>
      Raw import strings that map to this payee. These help automatically match future imports.
    </Card.Description>
  </Card.Header>
  <Card.Content class="space-y-3">
    {#if showAddForm}
      <div class="flex gap-2">
        <Input
          bind:value={newAliasValue}
          placeholder="Enter raw import string..."
          class="flex-1"
          onkeydown={(e) => e.key === 'Enter' && handleAddAlias()}
        />
        <Button size="sm" onclick={handleAddAlias} disabled={isAdding || !newAliasValue.trim()}>
          {isAdding ? 'Adding...' : 'Add'}
        </Button>
        <Button variant="ghost" size="sm" onclick={() => (showAddForm = false)}>
          Cancel
        </Button>
      </div>
    {/if}

    {#if isLoading}
      <div class="text-muted-foreground py-4 text-center text-sm">Loading aliases...</div>
    {:else if aliases.length === 0}
      <div class="text-muted-foreground py-4 text-center text-sm">
        No aliases yet. Aliases are created automatically when you confirm payee mappings during
        import.
      </div>
    {:else}
      <div class="space-y-2">
        {#each aliases as alias (alias.id)}
          <div
            class="bg-muted/50 group flex items-center justify-between rounded-md border px-3 py-2">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm font-medium" title={alias.rawString}>
                {alias.rawString}
              </p>
              <div class="text-muted-foreground mt-0.5 flex items-center gap-2 text-xs">
                <span>{getTriggerLabel(alias.trigger)}</span>
                <span>-</span>
                <span>Used {alias.matchCount} time{alias.matchCount !== 1 ? 's' : ''}</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              class="text-destructive hover:text-destructive h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
              onclick={() => confirmDelete(alias)}
              title="Delete alias">
              <Trash2 class="h-4 w-4" />
            </Button>
          </div>
        {/each}
      </div>
    {/if}
  </Card.Content>
</Card.Root>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Alias</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete the alias "{aliasToDelete?.rawString}"? Future imports with
        this string will no longer automatically map to "{payeeName}".
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel onclick={() => (aliasToDelete = null)}>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action onclick={handleDelete} disabled={isDeleting} class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
