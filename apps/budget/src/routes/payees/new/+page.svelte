<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import User from '@lucide/svelte/icons/user';
import {ManagePayeeForm} from '$lib/components/forms';

// Get duplication data from page data
const duplicateFromId = $derived(page.data?.['duplicateFromId']);
const isDuplicating = $derived(page.data?.['isDuplicating'] && duplicateFromId !== null);

const pageTitle = $derived(isDuplicating ? 'Duplicate Payee' : 'New Payee');

const pageDescription = $derived(isDuplicating
  ? 'Create a new payee based on an existing one'
  : 'Create a new payee for your transactions');

const handleSave = (payee: any, isNew: boolean) => {
  if (isNew && payee.slug) {
    // Navigate to the new payee's detail page after a brief delay
    // The timeout ensures form submission completes before redirect
    setTimeout(() => {
      goto(`/payees/${payee.slug}`, { replaceState: true });
    }, 100);
  } else {
    // Navigate back to payees list
    goto('/payees');
  }
};
</script>

<svelte:head>
  <title>{pageTitle} - Budget App</title>
  <meta name="description" content={pageDescription} />
</svelte:head>

<div class="container mx-auto py-6 space-y-6">
  <!-- Page Header -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="sm" href="/payees" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Payees</span>
      </Button>
      <div>
        <h1 class="text-3xl font-bold tracking-tight flex items-center gap-3">
          <User class="h-8 w-8 text-muted-foreground" />
          {pageTitle}
        </h1>
        <p class="text-muted-foreground mt-1">{pageDescription}</p>
      </div>
    </div>
  </div>

  <!-- Form Card -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Payee Information</Card.Title>
      <Card.Description>
        Fill in the details for your new payee. Only the name is required - you can add more details later.
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <ManagePayeeForm
        id={isDuplicating ? duplicateFromId : 0}
        onSave={handleSave}
      />
    </Card.Content>
  </Card.Root>
</div>
