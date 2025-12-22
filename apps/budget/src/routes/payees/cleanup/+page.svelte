<script lang="ts">
  import * as Tabs from "$lib/components/ui/tabs";
  import { Button } from "$lib/components/ui/button";

  import DuplicateDetectionPanel from "./(components)/duplicate-detection-panel.svelte";
  import NameNormalizationPanel from "./(components)/name-normalization-panel.svelte";

  import ArrowLeft from "@lucide/svelte/icons/arrow-left";
  import GitMerge from "@lucide/svelte/icons/git-merge";
  import Wand2 from "@lucide/svelte/icons/wand-2";

  let activeTab = $state("duplicates");
</script>

<svelte:head>
  <title>Payee Cleanup - Budget App</title>
  <meta name="description" content="Clean up and organize your payees" />
</svelte:head>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-center gap-4">
      <Button variant="ghost" size="icon" href="/payees">
        <ArrowLeft class="h-4 w-4" />
        <span class="sr-only">Back to payees</span>
      </Button>
      <div>
        <h1 class="text-2xl font-bold tracking-tight">Payee Cleanup</h1>
        <p class="text-muted-foreground">
          Detect duplicates, normalize names, and merge payees
        </p>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <Tabs.Root bind:value={activeTab} class="w-full">
    <Tabs.List class="grid w-full grid-cols-2">
      <Tabs.Trigger value="duplicates" class="flex items-center gap-2">
        <GitMerge class="h-4 w-4" />
        Detect Duplicates
      </Tabs.Trigger>
      <Tabs.Trigger value="normalize" class="flex items-center gap-2">
        <Wand2 class="h-4 w-4" />
        Normalize Names
      </Tabs.Trigger>
    </Tabs.List>

    <div class="mt-6">
      <Tabs.Content value="duplicates">
        <DuplicateDetectionPanel />
      </Tabs.Content>

      <Tabs.Content value="normalize">
        <NameNormalizationPanel />
      </Tabs.Content>
    </div>
  </Tabs.Root>
</div>
