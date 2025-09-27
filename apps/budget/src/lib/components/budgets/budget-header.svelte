<script lang="ts">
  import {SvelteMap} from "svelte/reactivity";
  import {ArrowLeft} from "@lucide/svelte/icons";
  import {Button} from "$lib/components/ui/button";
  import {Badge, type BadgeVariant} from "$lib/components/ui/badge";
  import BudgetSettingsMenu from "./budget-settings-menu.svelte";
  import type {BudgetWithRelations} from "$lib/server/domains/budgets";

  interface Props {
    budget: BudgetWithRelations;
    class?: string;
  }

  let {
    budget,
    class: className,
  }: Props = $props();

  const statusVariantMap = new SvelteMap<string, BadgeVariant>([
    ["active", "default"],
    ["inactive", "secondary"],
    ["archived", "outline"],
  ]);

  const typeColorMap = new SvelteMap([
    ["category-envelope", "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"],
    ["account-monthly", "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"],
    ["goal-based", "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"],
    ["scheduled-expense", "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"],
  ]);

  const getStatusVariant = $derived((status: string): BadgeVariant => statusVariantMap.get(status) ?? "secondary");
  const getTypeColor = $derived((type: string) => typeColorMap.get(type) ?? "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300");
</script>

<section class="flex items-center justify-between gap-4 py-6 {className}">
  <div class="flex items-center gap-4">
    <Button variant="ghost" size="sm" onclick={() => history.back()}>
      <ArrowLeft class="h-4 w-4" />
    </Button>
    <div>
      <h1 class="text-3xl font-semibold text-foreground">{budget.name}</h1>
      <div class="flex items-center gap-2 mt-1">
        <Badge class="{getTypeColor(budget.type)} border-0">{budget.type}</Badge>
        <Badge variant={getStatusVariant(budget.status)}>{budget.status}</Badge>
        {#if budget.enforcementLevel && budget.enforcementLevel !== "none"}
          <Badge variant="outline">{budget.enforcementLevel}</Badge>
        {/if}
        {#if budget.description}
          <span class="text-sm text-muted-foreground">{budget.description}</span>
        {/if}
      </div>
    </div>
  </div>
  <!-- <BudgetSettingsMenu {budget} /> -->
</section>