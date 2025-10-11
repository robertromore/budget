<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import {currencyFormatter} from "$lib/utils/formatters";

  interface Props {
    budget: any;
    envelopes: any[];
    categories: any[];
  }

  let {
    budget,
    envelopes = [],
    categories = [],
  }: Props = $props();

  // Simple calculated values without derived
  let totalAllocated = $state(0);
  let totalSpent = $state(0);
  let totalAvailable = $state(0);

  // Calculate totals manually
  if (Array.isArray(envelopes)) {
    totalAllocated = envelopes.reduce((sum, env) => sum + (env?.allocatedAmount || 0), 0);
    totalSpent = envelopes.reduce((sum, env) => sum + (env?.spentAmount || 0), 0);
    totalAvailable = envelopes.reduce((sum, env) => sum + (env?.availableAmount || 0), 0);
  }

  const spentPercentage = $derived.by(() => {
    return totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0;
  });
</script>

<div class="space-y-6">
  <!-- Simple Budget Summary -->
  <Card.Root>
    <Card.Header>
      <Card.Title>
        {budget?.name || 'Budget'} - Simple Envelope View
      </Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="grid gap-4 md:grid-cols-3">
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Total Allocated</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalAllocated)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Total Spent</p>
          <p class="text-2xl font-bold">{currencyFormatter.format(totalSpent)}</p>
        </div>
        <div class="space-y-1">
          <p class="text-sm text-muted-foreground">Available</p>
          <p class="text-2xl font-bold text-emerald-600">{currencyFormatter.format(totalAvailable)}</p>
        </div>
      </div>

      <div class="mt-4">
        <div class="flex items-center justify-between text-sm mb-2">
          <span>Overall Progress</span>
          <span>{spentPercentage.toFixed(1)}%</span>
        </div>
        <div class="w-full bg-muted rounded-full h-2">
          <div
            class="h-2 rounded-full bg-primary transition-all"
            style={`width: ${Math.min(100, spentPercentage)}%`}
          ></div>
        </div>
      </div>
    </Card.Content>
  </Card.Root>

  <!-- Simple Envelope List -->
  <Card.Root>
    <Card.Header>
      <Card.Title>Envelopes ({envelopes.length})</Card.Title>
    </Card.Header>
    <Card.Content>
      <div class="space-y-3">
        {#each envelopes as envelope (envelope.id)}
          {@const category = categories.find(c => c.id === envelope.categoryId)}
          <div class="flex items-center justify-between rounded-lg border p-3">
            <div>
              <h4 class="font-medium">{category?.name || `Category ${envelope.categoryId}`}</h4>
              <p class="text-sm text-muted-foreground">
                {currencyFormatter.format(envelope.spentAmount)} / {currencyFormatter.format(envelope.allocatedAmount)}
              </p>
            </div>
            <div class="text-right">
              <p class="font-medium">{currencyFormatter.format(envelope.availableAmount)}</p>
              <p class="text-sm text-muted-foreground">{envelope.status}</p>
            </div>
          </div>
        {/each}
      </div>
    </Card.Content>
  </Card.Root>
</div>
