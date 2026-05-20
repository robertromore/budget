<script lang="ts">
import { Button } from "$lib/components/ui/button";
import * as Card from "$lib/components/ui/card";
import { Home, Plus, MapPin } from "@lucide/svelte";
import { rpc } from "$lib/query";
import { homeDialogState } from "$lib/states/ui/home-dialog.svelte";

const homesQuery = rpc.homes.listHomes().options();
const homes = $derived(homesQuery.data ?? []);
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
        <Button onclick={() => homeDialogState.openAddHome()}>
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
            <Button onclick={() => homeDialogState.openAddHome()}>
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
    </div>
  </main>
</div>
