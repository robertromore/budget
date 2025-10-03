<script lang="ts">
import {goto} from '$app/navigation';
import {page} from '$app/state';
import {Button} from '$lib/components/ui/button';
import * as Card from '$lib/components/ui/card';
import * as Tabs from '$lib/components/ui/tabs';
import ArrowLeft from '@lucide/svelte/icons/arrow-left';
import User from '@lucide/svelte/icons/user';
import Edit from '@lucide/svelte/icons/edit';
import BarChart3 from '@lucide/svelte/icons/bar-chart-3';
import Settings from '@lucide/svelte/icons/settings';
import {PayeesState} from '$lib/states/entities/payees.svelte';

// Get payee ID from URL parameter
const payeeId = $derived(parseInt(page.params.id) || 0);

// Get payee data
const payeesState = PayeesState.get();
const payee = $derived(payeeId > 0 ? payeesState.getById(payeeId) : null);

const pageTitle = $derived(payee ? payee.name : 'Payee Not Found');
const pageDescription = $derived(payee ? 'View and manage payee information' : 'The requested payee could not be found');

// Redirect to payees list if no valid ID provided
$effect(() => {
  if (payeeId === 0) {
    goto('/payees');
  }
});
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

    {#if payee}
      <div class="flex items-center gap-2">
        <Button variant="outline" href="/payees/{payeeId}/analytics">
          <BarChart3 class="mr-2 h-4 w-4" />
          Analytics
        </Button>
        <Button href="/payees/{payeeId}/edit">
          <Edit class="mr-2 h-4 w-4" />
          Edit Payee
        </Button>
      </div>
    {/if}
  </div>

  {#if payee}
    <!-- Payee Details -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
            <span class="text-sm font-medium text-muted-foreground">Name</span>
            <p class="text-sm">{payee.name}</p>
          </div>

          {#if payee.notes}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Notes</span>
              <p class="text-sm">{payee.notes}</p>
            </div>
          {/if}

          {#if payee.payeeType}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Type</span>
              <p class="text-sm capitalize">{payee.payeeType.replace('_', ' ')}</p>
            </div>
          {/if}

          <div>
            <span class="text-sm font-medium text-muted-foreground">Status</span>
            <p class="text-sm">{payee.isActive ? 'Active' : 'Inactive'}</p>
          </div>
        </Card.Content>
      </Card.Root>

      <!-- Contact Information -->
      <Card.Root>
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Settings class="h-4 w-4" />
            Contact Information
          </Card.Title>
        </Card.Header>
        <Card.Content class="space-y-3">
          {#if payee.email}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Email</span>
              <p class="text-sm">{payee.email}</p>
            </div>
          {/if}

          {#if payee.phone}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Phone</span>
              <p class="text-sm">{payee.phone}</p>
            </div>
          {/if}

          {#if payee.website}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Website</span>
              <p class="text-sm">
                <a href={payee.website} target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline">
                  {payee.website}
                </a>
              </p>
            </div>
          {/if}

          {#if payee.address}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Address</span>
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
              <span class="text-sm font-medium text-muted-foreground">Average Amount</span>
              <p class="text-sm">${payee.avgAmount.toFixed(2)}</p>
            </div>
          {/if}

          {#if payee.paymentFrequency}
            <div>
              <span class="text-sm font-medium text-muted-foreground">Payment Frequency</span>
              <p class="text-sm capitalize">{payee.paymentFrequency.replace('_', ' ')}</p>
            </div>
          {/if}

          <div>
            <span class="text-sm font-medium text-muted-foreground">Tax Relevant</span>
            <p class="text-sm">{payee.taxRelevant ? 'Yes' : 'No'}</p>
          </div>

          <div>
            <span class="text-sm font-medium text-muted-foreground">Seasonal</span>
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
        <div class="text-center py-8 text-muted-foreground">
          <p>Transaction history will be displayed here.</p>
          <Button variant="outline" href="/payees/{payeeId}/analytics" class="mt-4">
            <BarChart3 class="mr-2 h-4 w-4" />
            View Full Analytics
          </Button>
        </div>
      </Card.Content>
    </Card.Root>
  {:else}
    <!-- Error State -->
    <Card.Root class="max-w-4xl">
      <Card.Content class="text-center py-8">
        <User class="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 class="text-xl font-semibold mb-2">Payee Not Found</h2>
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