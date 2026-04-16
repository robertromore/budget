<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { Home, Plus, MapPin, Package, Tags } from "@lucide/svelte";
  import { createQuery, createMutation } from "@tanstack/svelte-query";
  import { rpc } from "$lib/query";

  let showCreateDialog = $state(false);
  let newHomeName = $state("");
  let newHomeDescription = $state("");
  let newHomeAddress = $state("");

  const homesQuery = createQuery(rpc.homes.listHomes().options());
  const createHomeMutation = createMutation(rpc.homes.createHome.options());

  const homes = $derived($homesQuery.data ?? []);

  async function handleCreateHome() {
    if (!newHomeName.trim()) return;

    await $createHomeMutation.mutateAsync({
      name: newHomeName.trim(),
      description: newHomeDescription.trim() || null,
      address: newHomeAddress.trim() || null,
    });

    newHomeName = "";
    newHomeDescription = "";
    newHomeAddress = "";
    showCreateDialog = false;
  }
</script>

<div class="flex min-h-screen flex-col">
  <header class="border-b px-6 py-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-3">
        <Home class="h-6 w-6" />
        <h1 class="text-2xl font-bold">Home Manager</h1>
      </div>
    </div>
  </header>

  <main class="flex-1 p-6">
    <div class="mx-auto max-w-5xl">
      <div class="mb-6 flex items-center justify-between">
        <h2 class="text-lg font-semibold">Your Homes</h2>
        <Button onclick={() => (showCreateDialog = true)}>
          <Plus class="mr-2 h-4 w-4" />
          Add Home
        </Button>
      </div>

      {#if homes.length === 0}
        <Card.Root class="p-12 text-center">
          <div class="flex flex-col items-center gap-4">
            <Home class="text-muted-foreground h-12 w-12" />
            <div>
              <h3 class="text-lg font-semibold">No homes yet</h3>
              <p class="text-muted-foreground text-sm">
                Create your first home to start managing your inventory.
              </p>
            </div>
            <Button onclick={() => (showCreateDialog = true)}>
              <Plus class="mr-2 h-4 w-4" />
              Create Your First Home
            </Button>
          </div>
        </Card.Root>
      {:else}
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {#each homes as home}
            <a href="/home/{home.slug}" class="group">
              <Card.Root class="transition-shadow group-hover:shadow-md">
                <Card.Header>
                  <Card.Title class="flex items-center gap-2">
                    <Home class="h-5 w-5" />
                    {home.name}
                  </Card.Title>
                  {#if home.description}
                    <Card.Description>{home.description}</Card.Description>
                  {/if}
                </Card.Header>
                {#if home.address}
                  <Card.Content>
                    <div class="text-muted-foreground flex items-center gap-2 text-sm">
                      <MapPin class="h-4 w-4" />
                      {home.address}
                    </div>
                  </Card.Content>
                {/if}
              </Card.Root>
            </a>
          {/each}
        </div>
      {/if}

      {#if showCreateDialog}
        <div
          class="bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
          role="dialog"
        >
          <Card.Root class="w-full max-w-md">
            <Card.Header>
              <Card.Title>Create New Home</Card.Title>
              <Card.Description>Add a new home to manage your inventory.</Card.Description>
            </Card.Header>
            <Card.Content>
              <form onsubmit={handleCreateHome} class="flex flex-col gap-4">
                <div>
                  <label for="name" class="text-sm font-medium">Name</label>
                  <input
                    id="name"
                    type="text"
                    bind:value={newHomeName}
                    placeholder="My Home"
                    class="border-input bg-background ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label for="description" class="text-sm font-medium">Description</label>
                  <input
                    id="description"
                    type="text"
                    bind:value={newHomeDescription}
                    placeholder="Optional description"
                    class="border-input bg-background ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
                <div>
                  <label for="address" class="text-sm font-medium">Address</label>
                  <input
                    id="address"
                    type="text"
                    bind:value={newHomeAddress}
                    placeholder="Optional address"
                    class="border-input bg-background ring-ring mt-1 w-full rounded-md border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
                  />
                </div>
                <div class="flex justify-end gap-2">
                  <Button variant="outline" type="button" onclick={() => (showCreateDialog = false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!newHomeName.trim()}>Create</Button>
                </div>
              </form>
            </Card.Content>
          </Card.Root>
        </div>
      {/if}
    </div>
  </main>
</div>
