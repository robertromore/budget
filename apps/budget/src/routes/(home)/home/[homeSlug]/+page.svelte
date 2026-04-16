<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { MapPin, Package, Tags } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const itemCount = $derived(data.items?.length ?? 0);
  const locationCount = $derived(data.locations?.length ?? 0);
  const labelCount = $derived(data.labels?.length ?? 0);
  const totalValue = $derived(
    (data.items ?? []).reduce((sum, item) => sum + (item.currentValue ?? 0), 0)
  );
</script>

<div class="p-6">
  <h1 class="mb-6 text-2xl font-bold">Dashboard</h1>

  <div class="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium">Items</Card.Title>
        <Package class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{itemCount}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium">Locations</Card.Title>
        <MapPin class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{locationCount}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium">Labels</Card.Title>
        <Tags class="text-muted-foreground h-4 w-4" />
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">{labelCount}</div>
      </Card.Content>
    </Card.Root>

    <Card.Root>
      <Card.Header class="flex flex-row items-center justify-between pb-2">
        <Card.Title class="text-sm font-medium">Total Value</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="text-2xl font-bold">
          ${totalValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </div>
      </Card.Content>
    </Card.Root>
  </div>

  {#if data.home.description}
    <Card.Root class="mb-6">
      <Card.Header>
        <Card.Title>About</Card.Title>
      </Card.Header>
      <Card.Content>
        <p class="text-muted-foreground text-sm">{data.home.description}</p>
      </Card.Content>
    </Card.Root>
  {/if}

  {#if data.items && data.items.length > 0}
    <Card.Root>
      <Card.Header>
        <Card.Title>Recent Items</Card.Title>
      </Card.Header>
      <Card.Content>
        <div class="divide-y">
          {#each data.items.slice(0, 5) as item}
            <a
              href="/home/{data.home.slug}/items/{item.cuid}"
              class="flex items-center justify-between py-3 hover:underline"
            >
              <div>
                <p class="text-sm font-medium">{item.name}</p>
                {#if item.manufacturer}
                  <p class="text-muted-foreground text-xs">{item.manufacturer}</p>
                {/if}
              </div>
              {#if item.currentValue}
                <span class="text-sm">
                  ${item.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              {/if}
            </a>
          {/each}
        </div>
      </Card.Content>
    </Card.Root>
  {/if}
</div>
