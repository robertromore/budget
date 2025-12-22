<script lang="ts">
  import * as Card from "$lib/components/ui/card";
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import { Checkbox } from "$lib/components/ui/checkbox";
  import { cn } from "$lib/utils";
  import type { DuplicateGroup } from "$lib/query/payees-types";
  import type { Payee } from "$lib/schema/payees";

  import ArrowRight from "@lucide/svelte/icons/arrow-right";
  import GitMerge from "@lucide/svelte/icons/git-merge";
  import AlertTriangle from "@lucide/svelte/icons/alert-triangle";
  import CheckCircle from "@lucide/svelte/icons/check-circle";
  import HelpCircle from "@lucide/svelte/icons/help-circle";
  import User from "@lucide/svelte/icons/user";

  interface Props {
    group: DuplicateGroup;
    payees: Map<number, Payee>;
    isSelected?: boolean;
    onSelect?: (selected: boolean) => void;
    onMerge?: () => void;
  }

  let { group, payees, isSelected = false, onSelect, onMerge }: Props = $props();

  const primaryPayee = $derived(payees.get(group.primaryPayeeId));
  const duplicatePayees = $derived(
    group.duplicatePayeeIds.map((id) => payees.get(id)).filter(Boolean) as Payee[]
  );

  const riskColors = {
    low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    high: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  const actionColors = {
    merge: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    review: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    ignore: "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400",
  };

  const ActionIcons = {
    merge: CheckCircle,
    review: HelpCircle,
    ignore: AlertTriangle,
  } as const;

  const ActionIcon = $derived(ActionIcons[group.recommendedAction]);

  function handleCheckChange(checked: boolean | "indeterminate") {
    onSelect?.(checked === true);
  }
</script>

<Card.Root
  class={cn(
    "transition-all duration-200",
    isSelected && "ring-2 ring-primary ring-offset-2"
  )}
>
  <Card.Header class="pb-3">
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        {#if onSelect}
          <Checkbox checked={isSelected} onCheckedChange={handleCheckChange} />
        {/if}
        <div>
          <Card.Title class="text-base">
            {primaryPayee?.name ?? `Payee #${group.primaryPayeeId}`}
          </Card.Title>
          <Card.Description>
            {duplicatePayees.length} potential duplicate{duplicatePayees.length === 1 ? "" : "s"}
          </Card.Description>
        </div>
      </div>
      <div class="flex items-center gap-2">
        <Badge variant="outline" class={riskColors[group.riskLevel]}>
          {group.riskLevel} risk
        </Badge>
        <Badge variant="outline" class={actionColors[group.recommendedAction]}>
          <ActionIcon class="mr-1 h-3 w-3" />
          {group.recommendedAction}
        </Badge>
      </div>
    </div>
  </Card.Header>

  <Card.Content class="space-y-4">
    <!-- Primary payee -->
    <div class="rounded-lg bg-primary/5 p-3">
      <div class="flex items-center gap-2 text-sm font-medium text-primary">
        <User class="h-4 w-4" />
        Primary (keep)
      </div>
      <div class="mt-1 font-medium">{primaryPayee?.name}</div>
      {#if primaryPayee?.email || primaryPayee?.phone}
        <div class="text-muted-foreground mt-1 text-sm">
          {primaryPayee?.email ?? ""}{primaryPayee?.email && primaryPayee?.phone ? " | " : ""}{primaryPayee?.phone ?? ""}
        </div>
      {/if}
    </div>

    <!-- Duplicates -->
    <div class="space-y-2">
      {#each duplicatePayees as dupe, i (dupe.id)}
        <div class="flex items-center gap-2 rounded-lg border p-3">
          <div class="flex-1">
            <div class="font-medium">{dupe.name}</div>
            {#if dupe.email || dupe.phone}
              <div class="text-muted-foreground mt-0.5 text-sm">
                {dupe.email ?? ""}{dupe.email && dupe.phone ? " | " : ""}{dupe.phone ?? ""}
              </div>
            {/if}
          </div>
          <ArrowRight class="text-muted-foreground h-4 w-4 shrink-0" />
          <div class="text-muted-foreground text-sm">
            merge into primary
          </div>
        </div>
      {/each}
    </div>

    <!-- Similarity breakdown -->
    {#if group.similarities.length > 0}
      <div class="border-t pt-3">
        <div class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">
          Match Details
        </div>
        <div class="flex flex-wrap gap-2">
          {#each group.similarities as sim (sim.field)}
            <div class="rounded bg-muted px-2 py-1 text-xs">
              <span class="font-medium">{sim.field}:</span>
              <span class="text-muted-foreground ml-1">{sim.matchType}</span>
              <span class="ml-1 text-green-600">({Math.round(sim.confidence * 100)}%)</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Overall similarity -->
    <div class="flex items-center justify-between border-t pt-3">
      <div class="text-sm">
        <span class="text-muted-foreground">Overall similarity:</span>
        <span class="ml-1 font-medium">{Math.round(group.similarityScore * 100)}%</span>
      </div>
      {#if onMerge}
        <Button size="sm" onclick={onMerge}>
          <GitMerge class="mr-1.5 h-4 w-4" />
          Merge
        </Button>
      {/if}
    </div>
  </Card.Content>
</Card.Root>
