<script lang="ts">
  import { Button } from "$ui/lib/components/ui/button";
  import * as Card from "$ui/lib/components/ui/card";
  import {
    ArrowLeft,
    Package,
    MapPin,
    Calendar,
    DollarSign,
    Shield,
    Wrench,
    Paperclip,
    Plus,
    Check,
    FileText,
    Image,
  } from "@lucide/svelte";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const item = $derived(data.item);

  // Maintenance
  const maintenanceQuery = createQuery(
    rpc.maintenance.listMaintenanceByItem(item.id).options()
  );
  const createMaintenanceMut = createMutation(rpc.maintenance.createMaintenance.options());
  const completeMaintenanceMut = createMutation(rpc.maintenance.completeMaintenance.options());
  const deleteMaintenanceMut = createMutation(rpc.maintenance.deleteMaintenance.options());

  const maintenanceRecords = $derived($maintenanceQuery.data ?? data.maintenanceRecords ?? []);

  let showMaintenanceForm = $state(false);
  let maintenanceName = $state("");
  let maintenanceType = $state<"scheduled" | "completed">("completed");
  let maintenanceCost = $state("");
  let maintenanceDate = $state("");
  let maintenanceNotes = $state("");

  async function handleCreateMaintenance() {
    if (!maintenanceName.trim()) return;
    await $createMaintenanceMut.mutateAsync({
      itemId: item.id,
      name: maintenanceName.trim(),
      maintenanceType,
      cost: maintenanceCost ? Number(maintenanceCost) : null,
      completedDate: maintenanceType === "completed" ? (maintenanceDate || new Date().toISOString().split("T")[0]) : null,
      scheduledDate: maintenanceType === "scheduled" ? maintenanceDate || null : null,
      notes: maintenanceNotes.trim() || null,
    });
    maintenanceName = "";
    maintenanceCost = "";
    maintenanceDate = "";
    maintenanceNotes = "";
    showMaintenanceForm = false;
  }

  // Attachments
  const attachmentsQuery = createQuery(
    rpc.attachments.listAttachmentsByItem(item.id).options()
  );
  const deleteAttachmentMut = createMutation(rpc.attachments.deleteAttachment.options());
  const setPrimaryMut = createMutation(rpc.attachments.setPrimaryAttachment.options());

  const itemAttachments = $derived($attachmentsQuery.data ?? data.itemAttachments ?? []);
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

      <!-- Maintenance Log -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between">
          <Card.Title class="flex items-center gap-2">
            <Wrench class="h-4 w-4" />
            Maintenance
          </Card.Title>
          <Button
            variant="outline"
            size="sm"
            onclick={() => (showMaintenanceForm = !showMaintenanceForm)}
          >
            <Plus class="mr-1 h-3 w-3" />
            Add
          </Button>
        </Card.Header>
        <Card.Content>
          {#if showMaintenanceForm}
            <form onsubmit={handleCreateMaintenance} class="mb-4 space-y-3 rounded-md border p-3">
              <div class="grid grid-cols-2 gap-2">
                <div class="col-span-2">
                  <input
                    type="text"
                    bind:value={maintenanceName}
                    placeholder="Maintenance name"
                    class="border-input bg-background w-full rounded border px-2 py-1 text-sm"
                    required
                  />
                </div>
                <select
                  bind:value={maintenanceType}
                  class="border-input bg-background rounded border px-2 py-1 text-sm"
                >
                  <option value="completed">Completed</option>
                  <option value="scheduled">Scheduled</option>
                </select>
                <input
                  type="date"
                  bind:value={maintenanceDate}
                  class="border-input bg-background rounded border px-2 py-1 text-sm"
                />
                <input
                  type="number"
                  bind:value={maintenanceCost}
                  placeholder="Cost"
                  step="0.01"
                  min="0"
                  class="border-input bg-background rounded border px-2 py-1 text-sm"
                />
                <input
                  type="text"
                  bind:value={maintenanceNotes}
                  placeholder="Notes"
                  class="border-input bg-background rounded border px-2 py-1 text-sm"
                />
              </div>
              <div class="flex justify-end gap-2">
                <Button variant="outline" size="sm" type="button" onclick={() => (showMaintenanceForm = false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={!maintenanceName.trim()}>Save</Button>
              </div>
            </form>
          {/if}

          {#if maintenanceRecords.length === 0}
            <p class="text-muted-foreground text-sm">No maintenance records yet.</p>
          {:else}
            <div class="divide-y">
              {#each maintenanceRecords as record}
                <div class="flex items-center justify-between py-2">
                  <div>
                    <div class="flex items-center gap-2">
                      <p class="text-sm font-medium">{record.name}</p>
                      <span
                        class="rounded-full px-2 py-0.5 text-xs {record.maintenanceType === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}"
                      >
                        {record.maintenanceType}
                      </span>
                    </div>
                    <div class="text-muted-foreground flex gap-3 text-xs">
                      {#if record.completedDate}
                        <span>{record.completedDate}</span>
                      {:else if record.scheduledDate}
                        <span>Scheduled: {record.scheduledDate}</span>
                      {/if}
                      {#if record.cost != null}
                        <span>${record.cost.toFixed(2)}</span>
                      {/if}
                    </div>
                  </div>
                  <div class="flex gap-1">
                    {#if record.maintenanceType === "scheduled"}
                      <button
                        class="rounded p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
                        title="Mark Complete"
                        onclick={() => $completeMaintenanceMut.mutateAsync({ id: record.id })}
                      >
                        <Check class="h-3.5 w-3.5" />
                      </button>
                    {/if}
                    <button
                      class="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete"
                      onclick={() => $deleteMaintenanceMut.mutateAsync({ id: record.id })}
                    >
                      <span class="text-xs">x</span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>

      <!-- Attachments -->
      <Card.Root>
        <Card.Header class="flex flex-row items-center justify-between">
          <Card.Title class="flex items-center gap-2">
            <Paperclip class="h-4 w-4" />
            Attachments
          </Card.Title>
        </Card.Header>
        <Card.Content>
          {#if itemAttachments.length === 0}
            <p class="text-muted-foreground text-sm">No attachments yet.</p>
          {:else}
            <div class="divide-y">
              {#each itemAttachments as attachment}
                <div class="flex items-center justify-between py-2">
                  <div class="flex items-center gap-2">
                    {#if attachment.fileType === "photo"}
                      <Image class="text-muted-foreground h-4 w-4" />
                    {:else}
                      <FileText class="text-muted-foreground h-4 w-4" />
                    {/if}
                    <div>
                      <p class="text-sm font-medium">
                        {attachment.fileName}
                        {#if attachment.isPrimary}
                          <span class="ml-1 text-xs text-blue-600">(primary)</span>
                        {/if}
                      </p>
                      <p class="text-muted-foreground text-xs capitalize">{attachment.fileType}</p>
                    </div>
                  </div>
                  <div class="flex gap-1">
                    {#if attachment.fileType === "photo" && !attachment.isPrimary}
                      <button
                        class="rounded p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950"
                        title="Set as Primary"
                        onclick={() => $setPrimaryMut.mutateAsync({ id: attachment.id })}
                      >
                        <Image class="h-3.5 w-3.5" />
                      </button>
                    {/if}
                    <button
                      class="rounded p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                      title="Delete"
                      onclick={() => $deleteAttachmentMut.mutateAsync({ id: attachment.id })}
                    >
                      <span class="text-xs">x</span>
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </Card.Content>
      </Card.Root>
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
