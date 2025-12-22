<script lang="ts">
  import { Badge } from "$lib/components/ui/badge";
  import { Button } from "$lib/components/ui/button";
  import * as Card from "$lib/components/ui/card";
  import { cn } from "$lib/utils";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import GitMerge from "@lucide/svelte/icons/git-merge";
  import Search from "@lucide/svelte/icons/search";
  import Users from "@lucide/svelte/icons/users";

  // Matches the backend response from similarityService.getCanonicalGroups
  interface CanonicalGroup {
    canonicalName: string;
    variants: string[];
    payeeIds: number[];
  }

  interface Props {
    groups?: CanonicalGroup[];
    totalPayees?: number;
    duplicateCount?: number;
    consolidationPotential?: number;
    onViewAll?: () => void;
    onMergeGroup?: (canonicalName: string) => void;
    class?: string;
  }

  let {
    groups = [],
    totalPayees = 0,
    duplicateCount = 0,
    consolidationPotential = 0,
    onViewAll,
    onMergeGroup,
    class: className,
  }: Props = $props();

  // Get groups with multiple variants (actual duplicates)
  const duplicateGroups = $derived(
    groups.filter((g) => g.variants.length > 1).slice(0, 3)
  );

  const hasDuplicates = $derived(duplicateGroups.length > 0);
</script>

<Card.Root class={cn("", className)}>
  <Card.Header class="pb-2">
    <div class="flex items-center justify-between">
      <Card.Title class="flex items-center gap-2 text-sm font-medium">
        <Users class="h-4 w-4" />
        Payee Matching
      </Card.Title>
      {#if hasDuplicates}
        <Badge variant="outline" class="text-blue-500">
          {duplicateCount} duplicates
        </Badge>
      {/if}
    </div>
    <Card.Description>
      Similar payees that could be consolidated
    </Card.Description>
  </Card.Header>

  <Card.Content class="space-y-4">
    {#if hasDuplicates}
      <!-- Consolidation Summary -->
      <div class="space-y-1 rounded-lg border p-3">
        <div class="flex items-center justify-between">
          <p class="text-muted-foreground text-xs">Consolidation Potential</p>
          <Badge variant="secondary" class="text-xs">
            {(consolidationPotential * 100).toFixed(0)}%
          </Badge>
        </div>
        <p class="text-lg font-semibold">
          {totalPayees} payees → {totalPayees - duplicateCount} unique
        </p>
        <p class="text-muted-foreground text-xs">
          {duplicateCount} potential duplicates detected
        </p>
      </div>

      <!-- Duplicate Groups -->
      <div class="space-y-2">
        <p class="text-muted-foreground text-xs">Top Similar Groups</p>
        {#each duplicateGroups as group}
          <div class="rounded-lg border p-3">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <GitMerge class="h-4 w-4 text-blue-500" />
                <span class="text-sm font-medium">{group.canonicalName}</span>
              </div>
              <Badge variant="outline" class="text-xs">
                {group.variants.length} variants
              </Badge>
            </div>
            <div class="mt-2 space-y-1">
              {#each group.variants.slice(0, 3) as variant}
                <div class="flex items-center text-xs">
                  <span class="text-muted-foreground truncate">
                    {variant}
                  </span>
                </div>
              {/each}
              {#if group.variants.length > 3}
                <p class="text-muted-foreground text-xs">
                  +{group.variants.length - 3} more
                </p>
              {/if}
            </div>
            {#if onMergeGroup}
              <Button
                variant="ghost"
                size="sm"
                class="mt-2 h-7 w-full text-xs"
                onclick={() => onMergeGroup(group.canonicalName)}
              >
                <GitMerge class="mr-1 h-3 w-3" />
                Merge All
              </Button>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <!-- No Duplicates -->
      <div class="py-4 text-center">
        <Search class="text-muted-foreground mx-auto h-8 w-8" />
        <p class="mt-2 text-sm font-medium">No duplicates detected</p>
        <p class="text-muted-foreground text-xs">
          Your payees are well organized
        </p>
      </div>
    {/if}

    {#if onViewAll && hasDuplicates}
      <Button variant="ghost" size="sm" class="w-full" onclick={onViewAll}>
        View All Groups
        <ChevronRight class="ml-1 h-4 w-4" />
      </Button>
    {/if}
  </Card.Content>
</Card.Root>
