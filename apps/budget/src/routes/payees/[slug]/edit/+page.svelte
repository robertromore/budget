<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import User from '@lucide/svelte/icons/user';
import {ManagePayeeForm} from '$lib/components/forms';
import {PayeesState} from '$lib/states/entities/payees.svelte';
import type {PageData} from './$types';

let {data}: {data: PageData} = $props();

// Get payee from page data
const payee = $derived(data.payee);

const pageTitle = $derived(payee ? `Edit ${payee?.name}` : 'Edit Payee');

const pageDescription = 'Update payee information and settings';

const handleSave = () => {
  // Navigate back to individual payee page after successful update
  if (payee) {
    goto(`/payees/${payee.slug}`);
  }
};

const handleDelete = async (id: number) => {
  // Delete the payee first, then navigate
  const payeesState = PayeesState.get();
  await payeesState.deletePayee(id);
  goto('/payees');
};

// Redirect to payees list if no payee provided
$effect(() => {
  if (!payee) {
    goto('/payees');
  }
});
</script>

<svelte:head>
  <title>{pageTitle} - Budget App</title>
  <meta name="description" content={pageDescription} />
</svelte:head>

<div class="container mx-auto space-y-6 py-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/payees/{payee?.slug}" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Payee</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <User class="text-muted-foreground h-8 w-8" />
          {pageTitle}
        </h1>
        <p class="text-muted-foreground mt-1">{pageDescription}</p>
      </div>
    </div>
  </div>

  {#if payee}
    <!-- Form Card -->
    <Card.Root class="max-w-4xl">
      <Card.Header>
        <Card.Title>Payee Information</Card.Title>
        <Card.Description>
          Update the details for this payee. Changes will be applied to all future transactions.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <ManagePayeeForm id={payee.id} onSave={handleSave} onDelete={handleDelete} />
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Loading or Error State -->
    <Card.Root class="max-w-4xl">
      <Card.Content class="py-8 text-center">
        <p class="text-muted-foreground">Payee not found</p>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
