<script lang="ts">
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import Plus from '@lucide/svelte/icons/plus';
import User from '@lucide/svelte/icons/user';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import {
  newPayeeDialog,
  deletePayeeDialog,
  deletePayeeId,
  managingPayeeId,
} from '$lib/states/ui/payees.svelte';

const payeesState = $derived(PayeesState.get());
const payees = $derived(payeesState.payees.values());
const payeesArray = $derived(Array.from(payees));
const hasNoPayees = $derived(payeesArray.length === 0);

let deleteDialogId = $derived(deletePayeeId);
let deleteDialogOpen = $derived(deletePayeeDialog);

const deletePayee = (id: number) => {
  deleteDialogId.current = id;
  deleteDialogOpen.setTrue();
};

const dialogOpen = $derived(newPayeeDialog);
const managingPayee = $derived(managingPayeeId);

const editPayee = (id: number) => {
  managingPayee.current = id;
  dialogOpen.current = true;
};
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-bold tracking-tight">Payees</h1>
    <Button
      onclick={() => {
        managingPayee.current = 0;
        dialogOpen.current = true;
      }}>
      <Plus class="mr-2 h-4 w-4" />
      Add Payee
    </Button>
  </div>

  <!-- Content -->
  {#if hasNoPayees}
    <!-- Empty State -->
    <div class="rounded-lg border border-blue-200 bg-blue-50 p-8 text-center">
      <div class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
        <User class="h-8 w-8 text-blue-600" />
      </div>
      <h2 class="mb-2 text-xl font-semibold text-blue-900">No Payees Yet</h2>
      <p class="mb-6 text-blue-700 max-w-md mx-auto">
        Get started by creating your first payee. You can add merchants, companies, people, or any other
        entity you pay or receive money from.
      </p>
      <Button
        onclick={() => {
          managingPayee.current = 0;
          dialogOpen.current = true;
        }}
        class="bg-blue-600 hover:bg-blue-700">
        <Plus class="mr-2 h-4 w-4" />
        Create Your First Payee
      </Button>
    </div>
  {:else}
    <!-- Payees Grid -->
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {#each payeesArray as { id, name, notes }}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <User class="h-5 w-5 text-muted-foreground" />
              <span>{name}</span>
            </Card.Title>
            {#if notes && notes.length > 0}
              <Card.Description>
                <span class="text-sm block">
                  {notes.length > 80 ? notes.substring(0, 80) + '...' : notes}
                </span>
              </Card.Description>
            {/if}
          </Card.Header>
          <Card.Footer class="flex gap-2">
            <Button
              onclick={() => editPayee(id)}
              variant="outline"
              size="sm"
              aria-label="Edit payee {name}">
              Edit
            </Button>
            <Button
              onclick={() => deletePayee(id)}
              variant="secondary"
              size="sm"
              aria-label="Delete payee {name}">
              Delete
            </Button>
          </Card.Footer>
        </Card.Root>
      {/each}
    </div>
  {/if}
</div>