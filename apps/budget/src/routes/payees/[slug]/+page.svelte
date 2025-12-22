<script lang="ts">
import { goto } from '$app/navigation';
import { page } from '$app/state';
import * as AlertDialog from '$lib/components/ui/alert-dialog';
import { Button, buttonVariants } from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import { PayeesState } from '$lib/states/entities/payees.svelte';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Brain from '@lucide/svelte/icons/brain';
import Phone from '@lucide/svelte/icons/phone';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Trash2 from '@lucide/svelte/icons/trash-2';
import User from '@lucide/svelte/icons/user';

// Get payee slug from URL parameter
const payeeSlug = $derived(page.params['slug'] || '');

// Get payee data
const payeesState = PayeesState.get();
const payee = $derived(payeeSlug ? payeesState.getBySlug(payeeSlug) : null);

const pageTitle = $derived(payee ? payee.name : 'Payee Not Found');
const pageDescription = $derived(
  payee ? 'View and manage payee information' : 'The requested payee could not be found'
);

// Delete dialog state
let deleteDialogOpen = $state(false);
let isDeleting = $state(false);

const handleDelete = async () => {
  if (isDeleting || !payee) return;

  isDeleting = true;
  try {
    await payeesState.deletePayee(payee.id);
    deleteDialogOpen = false;
    goto('/payees');
  } catch (error) {
    console.error('Failed to delete payee:', error);
    isDeleting = false;
  }
};

// Redirect to payees list if no valid slug provided
$effect(() => {
  if (!payeeSlug) {
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
      <Button variant="ghost" size="sm" href="/payees" class="p-2">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to Payees</span>
      </Button>
      <div>
        <h1 class="flex items-center gap-3 text-3xl font-bold tracking-tight">
          <User class="text-muted-foreground h-8 w-8" />
          {pageTitle}
        </h1>
        <p class="text-muted-foreground mt-1">{pageDescription}</p>
      </div>
    </div>

    {#if payee}
      <div class="flex items-center gap-2">
        <Button variant="outline" href="/payees/{payee.slug}/analytics">
          <BarChart3 class="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <Button variant="outline" href="/payees/{payee.slug}/intelligence">
          <Brain class="mr-2 h-4 w-4" />
          Intelligence
        </Button>
        <Button variant="outline" href="/payees/{payee.slug}/edit">
          <SquarePen class="mr-2 h-4 w-4" />
          Edit
        </Button>
        <Button variant="destructive" onclick={() => (deleteDialogOpen = true)}>
          <Trash2 class="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>
    {/if}
  </div>

  {#if payee}
    <!-- Payee Details -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <!-- Basic Information -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <User class="h-4 w-4" />
            Basic Information
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          <div>
            <span class="text-muted-foreground text-sm font-medium">Name</span>
            <p class="text-sm">{payee.name}</p>
          </div>

          {#if payee.notes}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Notes</span>
              <p class="text-sm">{payee.notes}</p>
            </div>
          {/if}

          {#if payee.payeeType}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Type</span>
              <p class="text-sm capitalize">{payee.payeeType.replace('_', ' ')}</p>
            </div>
          {/if}

          <div>
            <span class="text-muted-foreground text-sm font-medium">Status</span>
            <p class="text-sm">{payee.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Contact Information -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Phone class="h-4 w-4" />
            Contact Information
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          {#if payee.email}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Email</span>
              <p class="text-sm">{payee.email}</p>
            </div>
          {/if}

          {#if payee.phone}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Phone</span>
              <p class="text-sm">{payee.phone}</p>
            </div>
          {/if}

          {#if payee.website}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Website</span>
              <p class="text-sm">
                <a
                  href={payee.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="text-blue-600 hover:underline">
                  {payee.website}
                </a>
              </p>
            </div>
          {/if}

          {#if payee.address}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Address</span>
              <p class="text-sm whitespace-pre-line">{payee.address}</p>
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Transaction Details -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <BarChart3 class="h-4 w-4" />
            Transaction Details
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          {#if payee.avgAmount}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Average Amount</span>
              <p class="text-sm">${payee.avgAmount.toFixed(2)}</p>
            </div>
          {/if}

          {#if payee.paymentFrequency}
            <div>
              <span class="text-muted-foreground text-sm font-medium">Payment Frequency</span>
              <p class="text-sm capitalize">{payee.paymentFrequency.replace('_', ' ')}</p>
            </div>
          {/if}

          <div>
            <span class="text-muted-foreground text-sm font-medium">Tax Relevant</span>
            <p class="text-sm">{payee.taxRelevant ? 'Yes' : 'No'}</p>
          </div>

          <div>
            <span class="text-muted-foreground text-sm font-medium">Seasonal</span>
            <p class="text-sm">{payee.isSeasonal ? 'Yes' : 'No'}</p>
          </div>
        </Card.Content>
      </Card.Root>
    </div>

    <!-- Recent Transactions Section -->
    <Card.Root>
      <Card.Header>
        <Card.Title>Recent Transactions</Card.Title>
        <Card.Description>
          Recent transactions with this payee. View full analytics for detailed insights.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="text-muted-foreground py-8 text-center">
          <p>Transaction history will be displayed here.</p>
          <Button variant="outline" href="/payees/{payee.slug}/analytics" class="mt-4">
            <BarChart3 class="mr-2 h-4 w-4" />
            View Full Analytics
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Error State -->
    <Card.Root class="max-w-4xl">
      <Card.Content class="py-8 text-center">
        <User class="text-muted-foreground mx-auto mb-4 h-12 w-12" />
        <h2 class="mb-2 text-xl font-semibold">Payee Not Found</h2>
        <p class="text-muted-foreground mb-4">
          The payee you're looking for doesn't exist or may have been deleted.
        </p>
        <Button href="/payees">
          <ArrowLeft class="mr-2 h-4 w-4" />
          Back to Payees
        </Button>
      </Card.Content>
    </Card.Root>
  {/if}
</div>

<!-- Delete Confirmation Dialog -->
<AlertDialog.Root bind:open={deleteDialogOpen}>
  <AlertDialog.Content>
    <AlertDialog.Header>
      <AlertDialog.Title>Delete Payee</AlertDialog.Title>
      <AlertDialog.Description>
        Are you sure you want to delete "{payee?.name}"? This action cannot be undone.
      </AlertDialog.Description>
    </AlertDialog.Header>
    <AlertDialog.Footer>
      <AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
      <AlertDialog.Action
        onclick={handleDelete}
        disabled={isDeleting}
        class={buttonVariants({ variant: 'destructive' })}>
        {isDeleting ? 'Deleting...' : 'Delete'}
      </AlertDialog.Action>
    </AlertDialog.Footer>
  </AlertDialog.Content>
</AlertDialog.Root>
