<script lang="ts">
  import { Button } from "$ui/lib/components/ui/button";
  import * as Card from "$ui/lib/components/ui/card";
  import { ArrowLeft, Package, MapPin, Calendar, DollarSign, Shield } from "@lucide/svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const item = $derived(data.item);
</script>

<div class="p-6">
  <div class="mb-6">
    <a
      href="/{data.home.slug}/items"
      class="text-muted-foreground mb-2 inline-flex items-center gap-1 text-sm hover:underline"
    >
      <ArrowLeft class="h-4 w-4" />
      Back to Items
    </a>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold">{item.name}</h1>
        {#if item.assetId}
          <p class="text-muted-foreground text-sm">Asset #{String(item.assetId).padStart(4, "0")}</p>
        {/if}
      </div>
    </div>
  </div>

  <div class="grid gap-6 lg:grid-cols-3">
    <div class="lg:col-span-2 space-y-6">
      {#if item.description}
        <Card.Root>
          <Card.Header>
            <Card.Title>Description</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-sm">{item.description}</p>
          </Card.Content>
        </Card.Root>
      {/if}

      <Card.Root>
        <Card.Header>
          <Card.Title>Details</Card.Title>
        </Card.Header>
        <Card.Content>
          <dl class="grid grid-cols-2 gap-4 text-sm">
            {#if item.manufacturer}
              <div>
                <dt class="text-muted-foreground">Manufacturer</dt>
                <dd class="font-medium">{item.manufacturer}</dd>
              </div>
            {/if}
            {#if item.modelNumber}
              <div>
                <dt class="text-muted-foreground">Model Number</dt>
                <dd class="font-medium">{item.modelNumber}</dd>
              </div>
            {/if}
            {#if item.serialNumber}
              <div>
                <dt class="text-muted-foreground">Serial Number</dt>
                <dd class="font-medium">{item.serialNumber}</dd>
              </div>
            {/if}
            <div>
              <dt class="text-muted-foreground">Quantity</dt>
              <dd class="font-medium">{item.quantity}</dd>
            </div>
          </dl>
        </Card.Content>
      </Card.Root>

      {#if item.purchaseDate || item.purchasePrice || item.purchaseVendor}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <DollarSign class="h-4 w-4" />
              Purchase Info
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              {#if item.purchaseDate}
                <div>
                  <dt class="text-muted-foreground">Purchase Date</dt>
                  <dd class="font-medium">{item.purchaseDate}</dd>
                </div>
              {/if}
              {#if item.purchaseVendor}
                <div>
                  <dt class="text-muted-foreground">Vendor</dt>
                  <dd class="font-medium">{item.purchaseVendor}</dd>
                </div>
              {/if}
              {#if item.purchasePrice != null}
                <div>
                  <dt class="text-muted-foreground">Price</dt>
                  <dd class="font-medium">
                    ${item.purchasePrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </dd>
                </div>
              {/if}
            </dl>
          </Card.Content>
        </Card.Root>
      {/if}

      {#if item.warrantyExpires || item.warrantyNotes || item.lifetimeWarranty}
        <Card.Root>
          <Card.Header>
            <Card.Title class="flex items-center gap-2">
              <Shield class="h-4 w-4" />
              Warranty
            </Card.Title>
          </Card.Header>
          <Card.Content>
            <dl class="grid grid-cols-2 gap-4 text-sm">
              {#if item.lifetimeWarranty}
                <div>
                  <dt class="text-muted-foreground">Warranty</dt>
                  <dd class="font-medium text-green-600">Lifetime</dd>
                </div>
              {:else if item.warrantyExpires}
                <div>
                  <dt class="text-muted-foreground">Expires</dt>
                  <dd class="font-medium">{item.warrantyExpires}</dd>
                </div>
              {/if}
              {#if item.warrantyNotes}
                <div class="col-span-2">
                  <dt class="text-muted-foreground">Notes</dt>
                  <dd class="font-medium">{item.warrantyNotes}</dd>
                </div>
              {/if}
            </dl>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>

    <div class="space-y-6">
      <Card.Root>
        <Card.Header>
          <Card.Title>Status</Card.Title>
        </Card.Header>
        <Card.Content>
          <div class="space-y-3 text-sm">
            {#if item.currentValue != null}
              <div class="flex justify-between">
                <span class="text-muted-foreground">Current Value</span>
                <span class="font-medium">
                  ${item.currentValue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            {/if}
            <div class="flex justify-between">
              <span class="text-muted-foreground">Insured</span>
              <span class="font-medium">{item.isInsured ? "Yes" : "No"}</span>
            </div>
            <div class="flex justify-between">
              <span class="text-muted-foreground">Archived</span>
              <span class="font-medium">{item.isArchived ? "Yes" : "No"}</span>
            </div>
          </div>
        </Card.Content>
      </Card.Root>

      {#if data.itemLabels && data.itemLabels.length > 0}
        <Card.Root>
          <Card.Header>
            <Card.Title>Labels</Card.Title>
          </Card.Header>
          <Card.Content>
            <div class="flex flex-wrap gap-2">
              {#each data.itemLabels as label}
                <span
                  class="rounded-full border px-3 py-1 text-xs font-medium"
                  style={label.color ? `border-color: ${label.color}; color: ${label.color}` : ""}
                >
                  {label.name}
                </span>
              {/each}
            </div>
          </Card.Content>
        </Card.Root>
      {/if}

      {#if item.notes}
        <Card.Root>
          <Card.Header>
            <Card.Title>Notes</Card.Title>
          </Card.Header>
          <Card.Content>
            <p class="text-muted-foreground text-sm">{item.notes}</p>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  </div>
</div>
